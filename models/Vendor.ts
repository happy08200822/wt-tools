import { Schema, model, models, type InferSchemaType } from 'mongoose';

const VendorSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: false, index: true },
  },
  { timestamps: true }
);

VendorSchema.index({ user: 1, name: 1 }, { unique: true });

export type VendorDoc = InferSchemaType<typeof VendorSchema>;

export default models.Vendor || model('Vendor', VendorSchema);
