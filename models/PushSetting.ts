import { Schema, model, models, type InferSchemaType } from 'mongoose';

// 單一設定文件，記錄某類通知（例如 key: 'contract-notify'）目前要推播到哪個 LINE 對象。
// 之後要換成別的群組或改回推播給個人，後台選一下就會改寫這裡，不用動程式碼
const PushSettingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    targetId: { type: String, required: true },
    type: { type: String, enum: ['user', 'group', 'room'], required: true },
    displayName: { type: String, default: '' },
  },
  { timestamps: true }
);

export type PushSettingDoc = InferSchemaType<typeof PushSettingSchema>;

export default models.PushSetting || model('PushSetting', PushSettingSchema);
