import sharp from 'sharp';

export const GEMINI_IMAGE_MODEL = 'gemini-3.1-flash-image';

// 官方報價（USD / 1M tokens），2026-08 查詢，之後如果 Google 調價要記得更新
const PRICE_PER_M_INPUT_TOKENS = 0.5;
const PRICE_PER_M_OUTPUT_TOKENS = 60.0;

const ASPECT_PRESETS: [string, number][] = [
  ['21:9', 21 / 9],
  ['16:9', 16 / 9],
  ['3:2', 3 / 2],
  ['4:3', 4 / 3],
  ['1:1', 1],
  ['3:4', 3 / 4],
  ['2:3', 2 / 3],
  ['9:16', 9 / 16],
];

// 挑出最接近目標比例的 Gemini 預設值，把裁切幅度降到最低
export function nearestAspectRatio(ratio: number) {
  let best = ASPECT_PRESETS[0];
  let bestDiff = Infinity;
  for (const preset of ASPECT_PRESETS) {
    const diff = Math.abs(Math.log(ratio) - Math.log(preset[1]));
    if (diff < bestDiff) {
      bestDiff = diff;
      best = preset;
    }
  }
  return best[0];
}

export type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

export class GeminiImageError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export type Usage = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
};

export async function generateImage(
  contents: { role?: string; parts: GeminiPart[] }[],
  targetSize: { width: number; height: number },
  apiKey: string
): Promise<{ imageBase64Png: string; usage: Usage }> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: {
            aspectRatio: nearestAspectRatio(targetSize.width / targetSize.height),
          },
        },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    if (res.status === 429) {
      throw new GeminiImageError(
        '圖片生成額度不足（免費方案通常沒有圖片生成額度），請到 Google AI Studio 開通付費方案後再試一次。',
        429
      );
    }
    throw new GeminiImageError(`Gemini API 錯誤：${res.status} ${errText}`, 502);
  }

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p: { inlineData?: { data?: string } }) => p.inlineData?.data);

  if (!imagePart) {
    throw new GeminiImageError('Gemini API 沒有回傳圖片內容', 502);
  }

  const rawBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
  const resizedBuffer = await sharp(rawBuffer)
    .resize(targetSize.width, targetSize.height, { fit: 'cover', position: 'attention' })
    .png()
    .toBuffer();

  const usageMeta = data?.usageMetadata ?? {};
  const inputTokens = usageMeta.promptTokenCount ?? 0;
  const outputTokens = usageMeta.candidatesTokenCount ?? 0;
  const totalTokens = usageMeta.totalTokenCount ?? inputTokens + outputTokens;
  const costUsd =
    (inputTokens / 1_000_000) * PRICE_PER_M_INPUT_TOKENS +
    (outputTokens / 1_000_000) * PRICE_PER_M_OUTPUT_TOKENS;

  return {
    imageBase64Png: resizedBuffer.toString('base64'),
    usage: {
      model: GEMINI_IMAGE_MODEL,
      inputTokens,
      outputTokens,
      totalTokens,
      costUsd,
    },
  };
}
