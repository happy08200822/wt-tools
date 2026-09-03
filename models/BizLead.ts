import { Schema, model, models, type InferSchemaType } from 'mongoose';

// 'messaged' 保留字面值但語意改成「聯絡中」，避免舊資料的 status 值失效
export const BIZ_LEAD_STATUSES = [
  'new',
  'friended',
  'messaged',
  'replied',
  'demo_scheduled',
  'demoed',
  'won',
  'rejected',
  'no_reply',
  'unreachable',
] as const;

export const BIZ_LEAD_INTENT_LEVELS = ['', 'high', 'medium', 'low'] as const;

const BizLeadSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    ownerName: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '', index: true },
    email: { type: String, trim: true, default: '' },
    lineId: { type: String, trim: true, default: '' },
    lineUrl: { type: String, trim: true, default: '' },
    igUrl: { type: String, trim: true, default: '' },
    fbUrl: { type: String, trim: true, default: '' },
    status: { type: String, enum: BIZ_LEAD_STATUSES, default: 'new' },
    intentLevel: { type: String, enum: BIZ_LEAD_INTENT_LEVELS, default: '' },
    // 公司表 AA欄「業務進度」的最新已知值，透過匯入更新，用來跟自己的 status 比對提醒
    companyStatus: { type: String, trim: true, default: '' },
    note: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

export type BizLeadDoc = InferSchemaType<typeof BizLeadSchema>;

export default models.BizLead || model('BizLead', BizLeadSchema);
