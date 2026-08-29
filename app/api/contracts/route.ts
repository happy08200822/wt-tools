import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import dbConnect from '@/lib/dbConnect';
import ContractReview from '@/models/ContractReview';
import { getCurrentUser } from '@/lib/session';

const GEMINI_MODEL = 'gemini-3.6-flash';
const MAX_BYTES = 4 * 1024 * 1024; // 4MB，Vercel Serverless Function 的 request body 上限
const ALLOWED_TYPES = ['application/pdf', 'text/plain'];

// 官方報價（USD / 1M tokens），2026-08 查詢，2027 年起會調漲
const PRICE_PER_M_INPUT_TOKENS = 0.75;
const PRICE_PER_M_OUTPUT_TOKENS = 3.75;

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    summary: { type: 'STRING' },
    riskLevel: { type: 'STRING', enum: ['low', 'medium', 'high'] },
    findings: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          clause: { type: 'STRING' },
          issue: { type: 'STRING' },
          severity: { type: 'STRING', enum: ['low', 'medium', 'high'] },
          suggestion: { type: 'STRING' },
        },
        required: ['clause', 'issue', 'severity', 'suggestion'],
      },
    },
  },
  required: ['summary', 'riskLevel', 'findings'],
};

const PROMPT = `你是一位專業的合約審查律師。請仔細審查附上的這份合約文件，用繁體中文回答：

1. summary：用 2-4 句話總結這份合約的整體性質與風險概況
2. riskLevel：整體風險等級（low / medium / high）
3. findings：逐項列出你發現的問題，每一項包含：
   - clause：對應的條款名稱或內容摘要（找不到明確條款名稱就描述問題所在的段落）
   - issue：這裡有什麼問題（不利條款、模糊用詞、缺漏的重要條款、對簽署方不公平等）
   - severity：這個問題的嚴重程度（low / medium / high）
   - suggestion：具體的修改建議

請至少找出 3 個值得注意的地方，如果合約內容過於單薄或不像正式合約，也請如實在 summary 中說明。`;

// GET /api/contracts - 列出目前登入者的審查紀錄（列表用，不含逐項 findings）
export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: '尚未登入' }, { status: 401 });
  }

  await dbConnect();
  const reviews = await ContractReview.find({ user: currentUser._id })
    .select('fileName fileUrl fileSize riskLevel summary createdAt inputTokens outputTokens costUsd')
    .sort({ createdAt: -1 });

  return NextResponse.json(reviews);
}

// POST /api/contracts - 上傳合約檔案，存 Blob + 送 Gemini 審查 + 存進 MongoDB
export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: '尚未登入' }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: '伺服器未設定 GEMINI_API_KEY' }, { status: 500 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: '請選擇檔案' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: '目前只支援 PDF 或純文字（.txt）檔案' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: '檔案太大，請上傳 4MB 以下的檔案' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  await dbConnect();

  let blob;
  try {
    blob = await put(file.name, buffer, {
      access: 'public',
      addRandomSuffix: true,
      contentType: file.type,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? `檔案上傳失敗：${err.message}` : '檔案上傳失敗' },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: PROMPT },
                { inlineData: { mimeType: file.type, data: buffer.toString('base64') } },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Gemini API 錯誤：${res.status} ${errText}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return NextResponse.json({ error: 'Gemini API 沒有回傳有效內容' }, { status: 502 });
    }

    const aiResult = JSON.parse(text);

    const usage = data?.usageMetadata ?? {};
    const inputTokens = usage.promptTokenCount ?? 0;
    const outputTokens = usage.candidatesTokenCount ?? 0;
    const costUsd =
      (inputTokens / 1_000_000) * PRICE_PER_M_INPUT_TOKENS +
      (outputTokens / 1_000_000) * PRICE_PER_M_OUTPUT_TOKENS;

    const review = await ContractReview.create({
      user: currentUser._id,
      fileName: file.name,
      fileUrl: blob.url,
      fileType: file.type,
      fileSize: file.size,
      summary: aiResult.summary,
      riskLevel: aiResult.riskLevel,
      findings: aiResult.findings,
      model: GEMINI_MODEL,
      inputTokens,
      outputTokens,
      costUsd,
    });

    return NextResponse.json(review, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '審查失敗，請稍後再試' },
      { status: 500 }
    );
  }
}
