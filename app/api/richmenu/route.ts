import { NextResponse } from 'next/server';
import { getTemplate, getSize } from '@/app/lib/richmenuTemplates';
import { generateImage, GeminiImageError } from '@/app/lib/geminiImage';
import { resolveUser, recordUsage } from '@/app/lib/richmenuUsers';

function buildPrompt(
  labels: string[],
  layoutDesc: string,
  templateLabel: string,
  storeType: string,
  style: string,
  colorPreference: string,
  extraNotes: string,
  hasLogo: boolean
) {
  const items = labels.map((label, i) => `${i + 1}. ${label}`).join('\n');

  const styleLines = [
    storeType ? `- 店家類型：${storeType}` : null,
    `- 風格：${style || '日系手繪 / 扁平插畫 / 溫暖療癒'}`,
    `- 配色：${colorPreference || '奶油色、淺綠、米色、低飽和'}`,
    '- 氛圍：乾淨、可愛、有品牌感',
    '- 線條：柔和、圓潤',
    '- 陰影：淡淡立體感',
    extraNotes ? `- 補充需求：${extraNotes}` : null,
    hasLogo
      ? '- 已附上店家 Logo 圖片作為風格參考，請讓配色、線條粗細、質感盡量貼近這個 Logo 的視覺風格（不需要把 Logo 本身畫進圖片裡）'
      : null,
  ].filter(Boolean);

  return `請生成一張「LINE Rich Menu 官方圖文選單」底圖

【版型】
${templateLabel}
- ${layoutDesc}

【尺寸與構圖要求】
- 圖片比例：橫向（符合 LINE 官方帳號圖文選單規格）
- 請依照上述版型描述分區配置內容，不要畫死分隔線
- 所有重要內容請集中在各區塊「中間70%範圍」（四周保留安全邊界，避免被裁切）
- 每一區塊的主圖與文字請置中

【風格設定】
${styleLines.join('\n')}

【${labels.length}個區塊內容（圖像加文字）】
請依照版型描述的區塊順序（從左到右、由上到下），生成以下 ${labels.length} 種情境的「圖示感插畫」：

${items}

【重要限制】
- 不要超出邊界（避免貼邊）
- 每個區塊保留留白（方便後製加字）
- 整體風格一致

【輸出目標】
- 適合用於 LINE 官方帳號圖文選單
- 可後製依版型切成對應的點擊區
- 不會因為比例被裁切掉內容`;
}

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

  const template = getTemplate(typeof body?.templateId === 'string' ? body.templateId : '');
  const targetSize = getSize(template.category, typeof body?.size === 'string' ? body.size : '');
  const cellCount = template.regions.length;

  const rawLabels = Array.isArray(body?.labels) ? body.labels : [];
  const labels = Array.from({ length: cellCount }, (_, i) => {
    const v = typeof rawLabels[i] === 'string' ? rawLabels[i].trim() : '';
    return v || `選單 ${i + 1}`;
  });

  const storeType = typeof body?.storeType === 'string' ? body.storeType.trim() : '';
  const style = typeof body?.style === 'string' ? body.style.trim() : '';
  const colorPreference = typeof body?.colorPreference === 'string' ? body.colorPreference.trim() : '';
  const extraNotes = typeof body?.extraNotes === 'string' ? body.extraNotes.trim() : '';

  const logo = body?.logo;
  const hasLogo =
    logo &&
    typeof logo.base64 === 'string' &&
    typeof logo.mimeType === 'string' &&
    logo.base64.length < 6_000_000; // 粗略擋掉過大的上傳（base64 後約 4~5MB 原始檔）

  const prompt = buildPrompt(
    labels,
    template.layoutDesc,
    template.label,
    storeType,
    style,
    colorPreference,
    extraNotes,
    Boolean(hasLogo)
  );

  const requestParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: prompt },
  ];
  if (hasLogo) {
    requestParts.push({ inlineData: { mimeType: logo.mimeType, data: logo.base64 } });
  }

  try {
    const { imageBase64Png, usage } = await generateImage(
      [{ parts: requestParts }],
      targetSize,
      apiKey
    );

    await recordUsage(accessCode, userName, {
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      costUsd: usage.costUsd,
    });

    return NextResponse.json({
      imageDataUrl: `data:image/png;base64,${imageBase64Png}`,
      width: targetSize.width,
      height: targetSize.height,
      usage,
    });
  } catch (err) {
    if (err instanceof GeminiImageError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '生成失敗，請稍後再試' },
      { status: 500 }
    );
  }
}
