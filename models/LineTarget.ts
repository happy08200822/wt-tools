import { Schema, model, models, type InferSchemaType } from 'mongoose';

// 記錄曾經跟官方帳號互動過的 LINE 對象（個人／群組／多人聊天室），
// 來源是 /api/line/webhook 收到的事件。用途是讓後台可以列出「這些 ID 是誰」，
// 方便選一個當作推播通知的對象（例如把官方帳號拉進同事群組後，選那個群組）
const LineTargetSchema = new Schema(
  {
    targetId: { type: String, required: true, unique: true, trim: true },
    type: { type: String, enum: ['user', 'group', 'room'], required: true },
    displayName: { type: String, default: '' },
    lastEventAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export type LineTargetDoc = InferSchemaType<typeof LineTargetSchema>;

export default models.LineTarget || model('LineTarget', LineTargetSchema);
