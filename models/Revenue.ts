import { Schema, model, models, type InferSchemaType } from 'mongoose';

// 每日營業額紀錄，一天一筆，對應使用者 Excel 的「營業額」分頁
const RevenueSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true }, // 'YYYY-MM-DD'
    amount: { type: Number, required: true },
  },
  { timestamps: true }
);

RevenueSchema.index({ user: 1, date: 1 }, { unique: true }); // 一天只能有一筆，重複輸入同一天會覆蓋

export type RevenueDoc = InferSchemaType<typeof RevenueSchema>;

export default models.Revenue || model('Revenue', RevenueSchema);
