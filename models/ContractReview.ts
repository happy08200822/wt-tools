import { Schema, model, models, type InferSchemaType } from 'mongoose';

const FindingSchema = new Schema(
  {
    clause: { type: String, required: true },
    issue: { type: String, required: true },
    severity: { type: String, enum: ['low', 'medium', 'high'], required: true },
    suggestion: { type: String, required: true },
  },
  { _id: false }
);

const ContractReviewSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    summary: { type: String, required: true },
    riskLevel: { type: String, enum: ['low', 'medium', 'high'], required: true },
    findings: [FindingSchema],
    model: { type: String, required: true },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    costUsd: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ContractReviewSchema.index({ user: 1, createdAt: -1 });

export type ContractReviewDoc = InferSchemaType<typeof ContractReviewSchema>;

export default models.ContractReview || model('ContractReview', ContractReviewSchema);
