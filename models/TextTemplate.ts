import { Schema, model, models, type InferSchemaType } from 'mongoose';

const TextTemplateSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    // 純文字內容，用 {變數} 標記發送前需要填的地方，例如「哈囉老闆，我們約{時間}見面！」
    body: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

TextTemplateSchema.index({ user: 1, name: 1 }, { unique: true });

export type TextTemplateDoc = InferSchemaType<typeof TextTemplateSchema>;

export default models.TextTemplate || model('TextTemplate', TextTemplateSchema);
