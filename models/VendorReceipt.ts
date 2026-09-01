import { Schema, model, models, type InferSchemaType } from 'mongoose';

const ItemSchema = new Schema(
  {
    name: { type: String, required: true },
    unitPrice: { type: Number, default: 0 },
    unit: { type: String, default: '' },
    quantity: { type: Number, default: 0 },
    itemTotal: { type: Number, default: 0 },
  },
  { _id: false }
);

// AI 辨識收據存檔後的正式紀錄，掛在某個廠商底下，對應使用者 Excel 裡每個廠商分頁的一列列進貨明細
const VendorReceiptSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
    date: { type: String, required: true },
    receiptTotal: { type: Number, default: 0 },
    imageUrl: { type: String, default: '' }, // 手動新增（沒有收據照片）的紀錄可以留空
    items: [ItemSchema],
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    costUsd: { type: Number, default: 0 },
  },
  { timestamps: true }
);

VendorReceiptSchema.index({ vendor: 1, date: -1 });

export type VendorReceiptDoc = InferSchemaType<typeof VendorReceiptSchema>;

export default models.VendorReceipt || model('VendorReceipt', VendorReceiptSchema);
