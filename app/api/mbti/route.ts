import { NextResponse } from 'next/server';

const GEMINI_MODEL = 'gemini-3.6-flash';
const MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
];

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    mbti: { type: 'STRING', enum: MBTI_TYPES },
    summary: { type: 'STRING' },
    traits: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['mbti', 'summary', 'traits'],
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
  const description = typeof body?.description === 'string' ? body.description.trim() : '';

  if (!description) {
    return NextResponse.json({ error: '請輸入個性描述' }, { status: 400 });
  }

  const prompt =
    `你是一位 MBTI 性格分析專家。請根據以下使用者對自己個性的描述，判斷最符合的 MBTI 類型。\n\n` +
    `使用者描述：\n${description}\n\n` +
    `請用繁體中文回答，summary 用 2-3 句話說明為什麼判斷為這個類型，traits 列出 3-5 個對應的性格特質關鍵字。`;

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
      { error: err instanceof Error ? err.message : '分析失敗，請稍後再試' },
      { status: 500 }
    );
  }
}
