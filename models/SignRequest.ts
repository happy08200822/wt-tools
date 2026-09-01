import { Schema, model, models, type InferSchemaType } from 'mongoose';

// 老闆按「作廢重簽」時，把當下已簽署的版本存一份到這裡再清空，
// 這樣舊版簽名檔不會憑空消失，之後還能回頭查
const SignHistoryEntrySchema = new Schema(
  {
    signedAt: { type: Date, required: true },
    signatureImageUrl: { type: String, required: true },
    signedFileUrl: { type: String, required: true },
    signedFileSize: { type: Number, required: true },
    voidedAt: { type: Date, required: true },
  },
  { _id: false }
);

// 記錄一筆「簽約連結」：老闆上傳合約 PDF 後建立，客戶透過公開連結（/sign/:id）
// 閱讀合約並手指簽名，簽完會產生疊上簽名與時間戳記的最終 PDF
const SignRequestSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    customerName: { type: String, default: '', trim: true },
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'signed'], default: 'pending', index: true },
    // 老闆在建立請求時於合約最後一頁預覽圖拖曳畫出的簽名框（PDF point，左下角原點，X/Y 是框的左下角），
    // 沒有值代表老闆略過選位置，簽署時走「新增一頁」的保底邏輯
    signatureX: { type: Number },
    signatureY: { type: Number },
    signatureWidth: { type: Number },
    signatureHeight: { type: Number },
    signatureImageUrl: { type: String, default: '' },
    signedAt: { type: Date },
    signedFileUrl: { type: String, default: '' },
    signedFileSize: { type: Number, default: 0 },
    signHistory: { type: [SignHistoryEntrySchema], default: [] },
    // 老闆建立請求時填的收款金額（選填）。有填才會在簽署完成頁讓客戶選付款方式；
    // 客戶選了之後才知道要匯款還是刷卡，這個選擇本身也是老闆判斷客戶付款意願的參考
    paymentAmount: { type: Number },
    paymentChoice: { type: String, enum: ['transfer', 'card'] },
    paymentChosenAt: { type: Date },
  },
  { timestamps: true }
);

SignRequestSchema.index({ user: 1, createdAt: -1 });

export type SignRequestDoc = InferSchemaType<typeof SignRequestSchema>;

export default models.SignRequest || model('SignRequest', SignRequestSchema);
