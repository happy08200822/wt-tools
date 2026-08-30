import { Schema, model, models, type InferSchemaType } from 'mongoose';

// 給沒有自己專屬資料表的 AI 功能用（例如收據辨識，故意不存內容），
// 純粹記錄「這次呼叫花了多少 token、多少錢」，讓後台 AI 用量報表能統一彙總所有功能的花費
const AiUsageLogSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    feature: { type: String, required: true, index: true }, // 例如 'receipts'
    model: { type: String, required: true },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    costUsd: { type: Number, default: 0 },
  },
  { timestamps: true }
);

AiUsageLogSchema.index({ feature: 1, createdAt: -1 });

export type AiUsageLogDoc = InferSchemaType<typeof AiUsageLogSchema>;

export default models.AiUsageLog || model('AiUsageLog', AiUsageLogSchema);
