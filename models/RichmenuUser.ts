import { Schema, model, models, type InferSchemaType } from 'mongoose';

const RichmenuUserSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    count: { type: Number, default: 0 },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    costUsd: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export type RichmenuUserDoc = InferSchemaType<typeof RichmenuUserSchema>;

export default models.RichmenuUser || model('RichmenuUser', RichmenuUserSchema);
