import { Schema, model, models, type InferSchemaType } from 'mongoose';

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // 選填：用 Google / LINE 登入的帳號不會有密碼
    passwordHash: { type: String, required: false },
    role: { type: String, enum: ['admin', 'user'], default: 'user', required: true },
    image: { type: String, required: false },
    // LINE 登入/綁定時記錄的 LINE 使用者 ID，之後可用 Messaging API 推播（前提：對方要先加官方帳號好友）
    lineUserId: { type: String, required: false },
  },
  { timestamps: true, strict: false }
);

export type UserDoc = InferSchemaType<typeof UserSchema>;

export default models.User || model('User', UserSchema);
