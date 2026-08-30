import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { calcCost, logAiUsage } from '@/app/lib/aiUsage';

const GEMINI_MODEL = 'gemini-3.6-flash';
const MAX_BYTES = 4 * 1024 * 1024; // 4MB，Vercel Serverless Function 的 request body 上限約 4.5MB（前端已先壓縮，這裡是防線）
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    date: { type: 'STRING' },
    vendor: { type: 'STRING' },
    receiptTotal: { type: 'NUMBER' },
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          unitPrice: { type: 'NUMBER' },
          unit: { type: 'STRING' },
          quantity: { type: 'NUMBER' },
          itemTotal: { type: 'NUMBER' },
        },
        required: ['name', 'unitPrice', 'unit', 'quantity', 'itemTotal'],
      },
    },
  },
  required: ['date', 'vendor', 'receiptTotal', 'items'],
};

const PROMPT = `請仔細分析這張收據或進貨單照片，將每一個購買品項拆解出來，嚴格輸出以下 JSON 格式：
{
  "date": "YYYY-MM-DD（若找不到則帶今天日期。若圖片顯示為民國年，請自動 +1911 轉換為西元年，例如 115年 轉為 2026 年）",
  "vendor": "廠商名稱",
  "receiptTotal": 整張單據的總金額數字,
  "items": [
    { "name": "購買品項名稱", "unitPrice": 單價數字, "unit": "單位（例如 kg、把、包、盒、罐）", "quantity": 數量數字, "itemTotal": 該品項的總額數字 }
  ]
}`;

// POST /api/receipts - 上傳收據照片，用 Gemini 辨識出廠商/日期/品項明細
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
    return NextResponse.json({ error: '請選擇照片' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: '只支援 JPEG / PNG / WebP / HEIC 照片' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: '照片太大，請上傳 4MB 以下的檔案' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

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
      return NextResponse.json({ error: `Gemini API 錯誤：${res.status} ${errText}` }, { status: 502 });
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return NextResponse.json({ error: 'Gemini API 沒有回傳有效內容' }, { status: 502 });
    }

    const usage = data?.usageMetadata ?? {};
    const inputTokens = usage.promptTokenCount ?? 0;
    const outputTokens = usage.candidatesTokenCount ?? 0;
    const costUsd = calcCost(inputTokens, outputTokens);

    await logAiUsage({
      userId: currentUser._id,
      feature: 'receipts',
      model: GEMINI_MODEL,
      inputTokens,
      outputTokens,
      costUsd,
    });

    return NextResponse.json({ ...JSON.parse(text), usage: { inputTokens, outputTokens, costUsd } });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '辨識失敗，請稍後再試' },
      { status: 500 }
    );
  }
}
