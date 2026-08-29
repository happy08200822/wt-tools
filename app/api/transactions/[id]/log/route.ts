import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import TransactionLog from '@/models/TransactionLog';

type Params = { params: Promise<{ id: string }> };

// GET /api/transactions/:id/log - 查這筆記帳紀錄的修改歷史
export async function GET(_request: Request, { params }: Params) {
  await dbConnect();
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'id 格式不正確' }, { status: 400 });
  }

  const log = await TransactionLog.find({ transaction: id }).sort({ createdAt: -1 });
  return NextResponse.json(log);
}
