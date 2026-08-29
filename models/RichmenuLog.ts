import { Schema, model, models, type InferSchemaType } from 'mongoose';

const RichmenuLogSchema = new Schema(
  {
    code: { type: String, required: true, index: true },
    name: { type: String, required: true },
    inputTokens: { type: Number, required: true },
    outputTokens: { type: Number, required: true },
    costUsd: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export type RichmenuLogDoc = InferSchemaType<typeof RichmenuLogSchema>;

export default models.RichmenuLog || model('RichmenuLog', RichmenuLogSchema);
