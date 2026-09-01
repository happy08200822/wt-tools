import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { calcCost, logAiUsage } from '@/app/lib/aiUsage';

const GEMINI_MODEL = 'gemini-3.6-flash';
const MAX_BYTES = 4 * 1024 * 1024; // 4MB，跟 /api/receipts 一致（Vercel 平台請求大小上限約 4.5MB）
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    entries: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          date: { type: 'STRING' },
          amount: { type: 'NUMBER' },
        },
        required: ['date', 'amount'],
      },
    },
  },
  required: ['entries'],
};

const PROMPT = `請仔細分析這張餐飲系統的營業額報表截圖，逐列拆解出每一天的日期跟營業額，嚴格輸出以下 JSON 格式：
{
  "entries": [
    { "date": "YYYY-MM-DD", "amount": 該天的營業額數字 }
  ]
}

規則：
1. 金額請使用「營業額」欄位的數值（通常是銷售總額扣除折扣金額後的結果，在表格最右邊），不要用「銷售總額」欄位
2. 如果日期欄位只顯示日、沒有年月，請參考報表標題或其他地方顯示的年月自動組合成完整的 YYYY-MM-DD
3. 忽略「總計」「全月日均」這類彙總列，只保留每一天各自的資料列
4. 營業額是 0 的天數（公休日）也要照實列出來，不要跳過`;

// POST /api/revenue/scan - 上傳營業額報表截圖，用 Gemini 一次辨識出整段期間每天的營業額
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
    return NextResponse.json({ error: '請選擇截圖' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: '只支援 JPEG / PNG / WebP 截圖' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: '截圖太大，請上傳 4MB 以下的檔案' }, { status: 400 });
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
      feature: 'revenue',
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
