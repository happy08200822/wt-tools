import dbConnect from '@/lib/dbConnect';
import LineTarget from '@/models/LineTarget';
import PushSetting from '@/models/PushSetting';
import User from '@/models/User';
import { pushLineMessage } from '@/app/lib/linePush';

export type LineTargetType = 'user' | 'group' | 'room';

// 合約簽署相關通知（客戶簽完、客戶選付款方式）目前用的 key，
// 之後如果有別的通知也想套用「可切換推播對象」，可以再開新的 key
export const PUSH_KEY_CONTRACT = 'contract-notify';

async function fetchGroupName(groupId: string): Promise<string> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return '';
  try {
    const res = await fetch(`https://api.line.me/v2/bot/group/${groupId}/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return '';
    const data = await res.json();
    return typeof data?.groupName === 'string' ? data.groupName : '';
  } catch {
    return '';
  }
}

async function fetchUserName(userId: string): Promise<string> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return '';
  try {
    const res = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return '';
    const data = await res.json();
    return typeof data?.displayName === 'string' ? data.displayName : '';
  } catch {
    return '';
  }
}

// webhook 收到事件時呼叫：把來源 ID 記錄下來（順便查名稱），回傳名稱給 webhook 拿去回覆訊息用
export async function recordLineTarget(targetId: string, type: LineTargetType): Promise<string> {
  await dbConnect();
  const displayName = type === 'room' ? '' : type === 'group' ? await fetchGroupName(targetId) : await fetchUserName(targetId);

  await LineTarget.findOneAndUpdate(
    { targetId },
    { $set: { type, displayName, lastEventAt: new Date() } },
    { upsert: true }
  );

  return displayName;
}

export type LineTargetSummary = {
  targetId: string;
  type: LineTargetType;
  displayName: string;
  lastEventAt: string;
};

export async function listLineTargets(): Promise<LineTargetSummary[]> {
  await dbConnect();
  const targets = await LineTarget.find().sort({ lastEventAt: -1 }).limit(50);
  return targets.map((t) => ({
    targetId: t.targetId,
    type: t.type as LineTargetType,
    displayName: t.displayName ?? '',
    lastEventAt: t.lastEventAt.toISOString(),
  }));
}

export type ActivePushTarget = {
  targetId: string;
  type: LineTargetType;
  displayName: string;
};

export async function getActiveTarget(key: string): Promise<ActivePushTarget | null> {
  await dbConnect();
  const setting = await PushSetting.findOne({ key });
  if (!setting) return null;
  return { targetId: setting.targetId, type: setting.type as LineTargetType, displayName: setting.displayName ?? '' };
}

export async function setActiveTarget(
  key: string,
  targetId: string,
  type: LineTargetType,
  displayName: string
): Promise<void> {
  await dbConnect();
  await PushSetting.findOneAndUpdate(
    { key },
    { $set: { targetId, type, displayName } },
    { upsert: true }
  );
}

// 合約簽署相關通知的統一入口：有設定推播對象（個人或群組）就推給它；
// 還沒設定的話，維持舊行為——推給建立這筆合約請求的老闆帳號（如果有綁 LINE 的話）
export async function notifyContract(text: string, fallbackOwnerId?: string): Promise<void> {
  const target = await getActiveTarget(PUSH_KEY_CONTRACT);
  if (target?.targetId) {
    await pushLineMessage(target.targetId, text);
    return;
  }

  if (!fallbackOwnerId) return;
  await dbConnect();
  const owner = await User.findById(fallbackOwnerId).select('lineUserId');
  if (owner?.lineUserId) {
    await pushLineMessage(owner.lineUserId, text);
  }
}
