import { getRedis } from './redis';

const USERS_KEY = 'richmenu:users';
const USAGE_PREFIX = 'richmenu:usage:';
const LOG_KEY = 'richmenu:log';
const LOG_MAX = 500;

export async function resolveUser(code: string): Promise<string | null> {
  if (!code) return null;
  const redis = await getRedis();
  const name = await redis.hGet(USERS_KEY, code);
  return name ?? null;
}

export async function addUser(code: string, name: string): Promise<void> {
  const redis = await getRedis();
  await redis.hSet(USERS_KEY, code, name);
}

export async function removeUser(code: string): Promise<void> {
  const redis = await getRedis();
  await redis.hDel(USERS_KEY, code);
}

export async function recordUsage(
  code: string,
  name: string,
  usage: { inputTokens: number; outputTokens: number; costUsd: number }
) {
  const redis = await getRedis();
  const key = `${USAGE_PREFIX}${code}`;
  await redis.hIncrBy(key, 'count', 1);
  await redis.hIncrBy(key, 'inputTokens', usage.inputTokens);
  await redis.hIncrBy(key, 'outputTokens', usage.outputTokens);
  await redis.hIncrByFloat(key, 'costUsd', usage.costUsd);

  const entry = JSON.stringify({
    code,
    name,
    time: new Date().toISOString(),
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    costUsd: usage.costUsd,
  });
  await redis.lPush(LOG_KEY, entry);
  await redis.lTrim(LOG_KEY, 0, LOG_MAX - 1);
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
  const redis = await getRedis();
  const users = await redis.hGetAll(USERS_KEY);
  const results = await Promise.all(
    Object.entries(users).map(async ([code, name]) => {
      const usage = await redis.hGetAll(`${USAGE_PREFIX}${code}`);
      return {
        code,
        name,
        count: Number(usage.count || 0),
        inputTokens: Number(usage.inputTokens || 0),
        outputTokens: Number(usage.outputTokens || 0),
        costUsd: Number(usage.costUsd || 0),
      };
    })
  );
  return results.sort((a, b) => b.costUsd - a.costUsd);
}

export async function getRecentLog(limit = 50) {
  const redis = await getRedis();
  const raw = await redis.lRange(LOG_KEY, 0, limit - 1);
  return raw.map((r) => JSON.parse(r));
}

export function checkAdminPassword(provided: unknown): boolean {
  const expected = process.env.RICHMENU_ADMIN_PASSWORD;
  if (!expected) return false; // 沒設定管理密碼就一律拒絕，避免資料裸奔
  return typeof provided === 'string' && provided === expected;
}
