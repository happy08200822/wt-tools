import { Schema, model, models, type InferSchemaType } from 'mongoose';
import TransactionLog from './TransactionLog';

const TransactionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    category: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true, default: Date.now },
    note: { type: String, trim: true },
  },
  { timestamps: true }
);

// 常見查詢是「列出某使用者的紀錄，依日期排序」，複合索引對應這個查詢模式
TransactionSchema.index({ user: 1, date: -1 });

const TRACKED_FIELDS = ['type', 'category', 'amount', 'date', 'note'] as const;

// --- 建立：新建立的紀錄寫一筆 create log（存整份快照）---
TransactionSchema.pre('save', function (this: any) {
  this.$wasNew = this.isNew;
});

TransactionSchema.post('save', async function (this: any, doc: any) {
  if (this.$wasNew) {
    await TransactionLog.create({
      transaction: doc._id,
      user: doc.user,
      action: 'create',
      snapshot: doc.toObject(),
    });
  }
});

// --- 更新：findByIdAndUpdate / findOneAndUpdate 時，比對修改前後的差異 ---
TransactionSchema.pre('findOneAndUpdate', async function (this: any) {
  const original = await this.model.findOne(this.getQuery());
  this._original = original ? original.toObject() : null;
});

TransactionSchema.post('findOneAndUpdate', async function (this: any, result: any) {
  const original = this._original as Record<string, unknown> | null;
  if (!original || !result) return;

  const updated = result as Record<string, unknown>;
  const changes: { field: string; from: unknown; to: unknown }[] = [];

  for (const field of TRACKED_FIELDS) {
    const from = original[field];
    const to = updated[field];
    const fromKey = from instanceof Date ? from.toISOString() : from;
    const toKey = to instanceof Date ? to.toISOString() : to;
    if (JSON.stringify(fromKey) !== JSON.stringify(toKey)) {
      changes.push({ field, from, to });
    }
  }

  if (changes.length > 0) {
    await TransactionLog.create({
      transaction: original._id,
      user: original.user,
      action: 'update',
      changes,
    });
  }
});

// --- 刪除：findByIdAndDelete / findOneAndDelete 時，存刪除當下的完整快照 ---
TransactionSchema.pre('findOneAndDelete', async function (this: any) {
  const doc = await this.model.findOne(this.getQuery());
  this._deleted = doc ? doc.toObject() : null;
});

TransactionSchema.post('findOneAndDelete', async function (this: any) {
  const deleted = this._deleted as Record<string, unknown> | null;
  if (!deleted) return;

  await TransactionLog.create({
    transaction: deleted._id,
    user: deleted.user,
    action: 'delete',
    snapshot: deleted,
  });
});

export type TransactionDoc = InferSchemaType<typeof TransactionSchema>;

export default models.Transaction || model('Transaction', TransactionSchema);
