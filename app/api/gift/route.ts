import { NextResponse } from 'next/server';

const GEMINI_MODEL = 'gemini-3.6-flash';

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    summary: { type: 'STRING' },
    gifts: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          reason: { type: 'STRING' },
        },
        required: ['name', 'reason'],
      },
    },
  },
  required: ['summary', 'gifts'],
};

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: '伺服器未設定 GEMINI_API_KEY' },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => null);
  const ageRange = typeof body?.ageRange === 'string' ? body.ageRange.trim() : '';
  const region = typeof body?.region === 'string' ? body.region.trim() : '';
  const interest = typeof body?.interest === 'string' ? body.interest.trim() : '';
  const budget = typeof body?.budget === 'string' ? body.budget.trim() : '';
  const occasion = typeof body?.occasion === 'string' ? body.occasion.trim() : '';

  if (!ageRange || !region || !interest || !budget || !occasion) {
    return NextResponse.json({ error: '請完整選擇所有條件' }, { status: 400 });
  }

  const prompt =
    `你是一位專業送禮顧問。請根據以下條件，推薦 4-6 種適合的禮物類型。\n\n` +
    `對象年齡層：${ageRange}\n` +
    `對象所在地區：${region}\n` +
    `對象興趣：${interest}\n` +
    `預算：${budget}\n` +
    `送禮場合：${occasion}\n\n` +
    `請用繁體中文回答，summary 用 1-2 句話總結挑選方向，每個禮物的 reason 用 1-2 句話說明為什麼適合這個對象與場合。`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
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
      return NextResponse.json(
        { error: 'Gemini API 沒有回傳有效內容' },
        { status: 502 }
      );
    }

    const result = JSON.parse(text);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '推薦失敗，請稍後再試' },
      { status: 500 }
    );
  }
}
