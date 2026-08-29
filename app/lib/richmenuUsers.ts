import dbConnect from '@/lib/dbConnect';
import RichmenuUser from '@/models/RichmenuUser';
import RichmenuLog from '@/models/RichmenuLog';

export async function resolveUser(code: string): Promise<string | null> {
  if (!code) return null;
  await dbConnect();
  const user = await RichmenuUser.findOne({ code }).select('name');
  return user?.name ?? null;
}

export async function addUser(code: string, name: string): Promise<void> {
  await dbConnect();
  await RichmenuUser.findOneAndUpdate(
    { code },
    { $set: { name }, $setOnInsert: { count: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 } },
    { upsert: true }
  );
}

export async function removeUser(code: string): Promise<void> {
  await dbConnect();
  await RichmenuUser.deleteOne({ code });
}

export async function recordUsage(
  code: string,
  name: string,
  usage: { inputTokens: number; outputTokens: number; costUsd: number }
) {
  await dbConnect();
  await RichmenuUser.findOneAndUpdate(
    { code },
    {
      $inc: {
        count: 1,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        costUsd: usage.costUsd,
      },
    }
  );

  await RichmenuLog.create({
    code,
    name,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    costUsd: usage.costUsd,
  });
}

export type UserUsage = {
  code: string;
  name: string;
  count: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

export async function getAllUsage(): Promise<UserUsage[]> {
  await dbConnect();
  const users = await RichmenuUser.find().sort({ costUsd: -1 });
  return users.map((u) => ({
    code: u.code,
    name: u.name,
    count: u.count ?? 0,
    inputTokens: u.inputTokens ?? 0,
    outputTokens: u.outputTokens ?? 0,
    costUsd: u.costUsd ?? 0,
  }));
}

export async function getRecentLog(limit = 50) {
  await dbConnect();
  const logs = await RichmenuLog.find().sort({ createdAt: -1 }).limit(limit);
  return logs.map((l) => ({
    code: l.code,
    name: l.name,
    time: l.createdAt?.toISOString(),
    inputTokens: l.inputTokens,
    outputTokens: l.outputTokens,
    costUsd: l.costUsd,
  }));
}

export function checkAdminPassword(provided: unknown): boolean {
  const expected = process.env.RICHMENU_ADMIN_PASSWORD;
  if (!expected) return false; // 沒設定管理密碼就一律拒絕，避免資料裸奔
  return typeof provided === 'string' && provided === expected;
}
