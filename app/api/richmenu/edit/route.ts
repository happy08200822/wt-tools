import { NextResponse } from 'next/server';
import { generateImage, GeminiImageError } from '@/app/lib/geminiImage';
import { resolveUser, recordUsage } from '@/app/lib/richmenuUsers';

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: '伺服器未設定 GEMINI_API_KEY' }, { status: 500 });
  }

  const body = await request.json().catch(() => null);

  const accessCode = typeof body?.accessCode === 'string' ? body.accessCode.trim() : '';
  const userName = await resolveUser(accessCode);
  if (!userName) {
    return NextResponse.json(
      { error: '密碼錯誤，請跟暐庭索取正確的密碼' },
      { status: 401 }
    );
  }

  const imageBase64 = typeof body?.imageBase64 === 'string' ? body.imageBase64 : '';
  const mimeType = typeof body?.mimeType === 'string' ? body.mimeType : 'image/png';
  const instruction = typeof body?.instruction === 'string' ? body.instruction.trim() : '';
  const width = Number(body?.width);
  const height = Number(body?.height);

  if (!imageBase64 || !instruction) {
    return NextResponse.json({ error: '缺少目前的圖片或修改指示' }, { status: 400 });
  }
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return NextResponse.json({ error: '缺少有效的圖片尺寸' }, { status: 400 });
  }

  const prompt = `這是目前的 LINE 圖文選單設計圖。請依照以下修改指示調整圖片，其餘沒提到的部分請盡量保持原樣、風格一致：

【修改指示】
${instruction}

【重要限制】
- 只調整指示提到的部分，其他區塊維持不變
- 不要超出邊界、不要貼邊
- 整體風格與配色請與原圖保持一致`;

  try {
    const { imageBase64Png, usage } = await generateImage(
      [
        {
          role: 'user',
          parts: [{ text: prompt }, { inlineData: { mimeType, data: imageBase64 } }],
        },
      ],
      { width, height },
      apiKey
    );

    await recordUsage(accessCode, userName, {
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      costUsd: usage.costUsd,
    });

    return NextResponse.json({
      imageDataUrl: `data:image/png;base64,${imageBase64Png}`,
      width,
      height,
      usage,
    });
  } catch (err) {
    if (err instanceof GeminiImageError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '修改失敗，請稍後再試' },
      { status: 500 }
    );
  }
}
