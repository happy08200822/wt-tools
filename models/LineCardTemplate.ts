import { Schema, model, models, type InferSchemaType } from 'mongoose';

const LineCardTemplateSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    accentColor: { type: String, required: true },
    blocks: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

LineCardTemplateSchema.index({ user: 1, name: 1 }, { unique: true });

export type LineCardTemplateDoc = InferSchemaType<typeof LineCardTemplateSchema>;

export default models.LineCardTemplate || model('LineCardTemplate', LineCardTemplateSchema);
