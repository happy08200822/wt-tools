import { Schema, model, models, type InferSchemaType } from 'mongoose';

const TransactionLogSchema = new Schema(
  {
    transaction: { type: Schema.Types.ObjectId, ref: 'Transaction', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, enum: ['create', 'update', 'delete'], required: true },
    changes: [
      {
        field: String,
        from: Schema.Types.Mixed,
        to: Schema.Types.Mixed,
      },
    ],
    snapshot: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export type TransactionLogDoc = InferSchemaType<typeof TransactionLogSchema>;

export default models.TransactionLog || model('TransactionLog', TransactionLogSchema);
