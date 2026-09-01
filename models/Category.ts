import { Schema, model, models, type InferSchemaType } from 'mongoose';

const CategorySchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

CategorySchema.index({ user: 1, name: 1 }, { unique: true });

export type CategoryDoc = InferSchemaType<typeof CategorySchema>;

export default models.Category || model('Category', CategorySchema);
