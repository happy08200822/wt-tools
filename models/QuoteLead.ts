import { Schema, model, models, type InferSchemaType } from 'mongoose';

const VisitSchema = new Schema(
  {
    visitedAt: { type: Date, default: Date.now },
    durationSec: { type: Number, default: 0 },
  },
  { timestamps: false }
);

const PlanSchema = new Schema(
  {
    title: { type: String, required: true },
    badge: { type: String, default: '' },
    price: { type: String, required: true },
    details: [String],
    highlight: { type: Boolean, default: false },
  },
  { _id: false }
);

// 每次在卡片編輯器發送「報價追蹤連結」按鈕時建立一筆，記錄這個客戶看到的報價內容
// 跟客戶點開追蹤頁的每一次瀏覽紀錄，用來推播通知業務、統計客戶興趣程度
const QuoteLeadSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    customerName: { type: String, required: true, trim: true },
    accentColor: { type: String, required: true },
    plans: [PlanSchema],
    visits: [VisitSchema],
    // 客戶在追蹤頁按下「我要簽約」並填寫簽約資料表單的紀錄，代表比單純瀏覽更強的購買意願
    interestClicks: [
      {
        clickedAt: { type: Date, default: Date.now },
        selectedPlan: { type: String, default: '' },
        companyName: { type: String, default: '' },
        contactPerson: { type: String, default: '' },
        taxId: { type: String, default: '' },
        phone: { type: String, default: '' },
        address: { type: String, default: '' },
      },
    ],
  },
  { timestamps: true }
);

QuoteLeadSchema.index({ user: 1, createdAt: -1 });

export type QuoteLeadDoc = InferSchemaType<typeof QuoteLeadSchema>;

export default models.QuoteLead || model('QuoteLead', QuoteLeadSchema);
