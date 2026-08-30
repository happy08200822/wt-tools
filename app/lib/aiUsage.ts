import dbConnect from '@/lib/dbConnect';
import AiUsageLog from '@/models/AiUsageLog';

// 官方報價（USD / 1M tokens），2026-08 查詢，2027 年起會調漲
export const GEMINI_FLASH_PRICE = {
  inputPerM: 0.75,
  outputPerM: 3.75,
};

export function calcCost(inputTokens: number, outputTokens: number, price = GEMINI_FLASH_PRICE): number {
  return (inputTokens / 1_000_000) * price.inputPerM + (outputTokens / 1_000_000) * price.outputPerM;
}

// 給沒有自己專屬資料表的 AI 功能記錄用量，失敗不影響主流程（吞掉錯誤）
export async function logAiUsage(params: {
  userId: string;
  feature: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}): Promise<void> {
  try {
    await dbConnect();
    await AiUsageLog.create({
      user: params.userId,
      feature: params.feature,
      model: params.model,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      costUsd: params.costUsd,
    });
  } catch {
    // 記錄用量失敗不應該讓主要功能跟著失敗
  }
}
