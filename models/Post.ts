import { Schema, model, models, type InferSchemaType } from 'mongoose';

const PostSchema = new Schema(
  {
    // 選填：留空代表匿名發表
    user: { type: Schema.Types.ObjectId, ref: 'User', required: false, index: true },
    content: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

PostSchema.index({ createdAt: -1 });

export type PostDoc = InferSchemaType<typeof PostSchema>;

export default models.Post || model('Post', PostSchema);
