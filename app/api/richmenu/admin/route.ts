import { NextResponse } from 'next/server';
import {
  getAllUsage,
  getRecentLog,
  checkAdminPassword,
  addUser,
  removeUser,
} from '@/app/lib/richmenuUsers';
import dbConnect from '@/lib/dbConnect';
import ContractReview from '@/models/ContractReview';
import AiUsageLog from '@/models/AiUsageLog';

async function getContractStats() {
  await dbConnect();

  const byUser = await ContractReview.aggregate([
    {
      $group: {
        _id: '$user',
        count: { $sum: 1 },
        inputTokens: { $sum: '$inputTokens' },
        outputTokens: { $sum: '$outputTokens' },
        costUsd: { $sum: '$costUsd' },
      },
    },
    {
      $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' },
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        userId: '$_id',
        name: { $ifNull: ['$user.name', '（已刪除的使用者）'] },
        email: '$user.email',
        count: 1,
        inputTokens: 1,
        outputTokens: 1,
        costUsd: 1,
      },
    },
    { $sort: { costUsd: -1 } },
  ]);

  const recent = await ContractReview.find()
    .select('fileName riskLevel inputTokens outputTokens costUsd createdAt user')
    .populate('user', 'name email')
    .sort({ createdAt: -1 })
    .limit(50);

  return { byUser, recent };
}

// 給沒有自己專屬資料表的 AI 功能（例如收據辨識）彙總用量，依 feature 分組
async function getAiUsageLogStats() {
  await dbConnect();

  const byFeature = await AiUsageLog.aggregate([
    {
      $group: {
        _id: { feature: '$feature', user: '$user' },
        count: { $sum: 1 },
        inputTokens: { $sum: '$inputTokens' },
        outputTokens: { $sum: '$outputTokens' },
        costUsd: { $sum: '$costUsd' },
      },
    },
    {
      $lookup: { from: 'users', localField: '_id.user', foreignField: '_id', as: 'user' },
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        feature: '$_id.feature',
        userId: '$_id.user',
        name: { $ifNull: ['$user.name', '（已刪除的使用者）'] },
        email: '$user.email',
        count: 1,
        inputTokens: 1,
        outputTokens: 1,
        costUsd: 1,
      },
    },
    { $sort: { costUsd: -1 } },
  ]);

  const recent = await AiUsageLog.find()
    .select('feature model inputTokens outputTokens costUsd createdAt user')
    .populate('user', 'name email')
    .sort({ createdAt: -1 })
    .limit(50);

  return { byFeature, recent };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!checkAdminPassword(body?.password)) {
    return NextResponse.json({ error: '管理密碼錯誤' }, { status: 401 });
  }

  const action = typeof body?.action === 'string' ? body.action : null;

  if (action === 'addUser') {
    const code = typeof body?.code === 'string' ? body.code.trim() : '';
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!code || !name) {
      return NextResponse.json({ error: '密碼與姓名都要填' }, { status: 400 });
    }
    await addUser(code, name);
  } else if (action === 'removeUser') {
    const code = typeof body?.code === 'string' ? body.code.trim() : '';
    if (!code) {
      return NextResponse.json({ error: '缺少要移除的密碼' }, { status: 400 });
    }
    await removeUser(code);
  }

  const [users, log, contracts, aiUsage] = await Promise.all([
    getAllUsage(),
    getRecentLog(50),
    getContractStats(),
    getAiUsageLogStats(),
  ]);

  return NextResponse.json({ users, log, contracts, aiUsage });
}
