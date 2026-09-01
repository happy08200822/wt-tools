import { Schema, model, models, type InferSchemaType } from 'mongoose';

export const BIZ_LEAD_STATUSES = [
  'new',
  'friended',
  'messaged',
  'replied',
  'won',
  'rejected',
] as const;

const BizLeadSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    lineUrl: { type: String, trim: true, default: '' },
    igUrl: { type: String, trim: true, default: '' },
    fbUrl: { type: String, trim: true, default: '' },
    status: { type: String, enum: BIZ_LEAD_STATUSES, default: 'new' },
    note: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

export type BizLeadDoc = InferSchemaType<typeof BizLeadSchema>;

export default models.BizLead || model('BizLead', BizLeadSchema);
