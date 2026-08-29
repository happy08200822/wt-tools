import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Transaction from '@/models/Transaction';
import { requireAdmin } from '@/lib/session';

// GET /api/admin/transactions - 列出全部使用者的記帳紀錄，僅管理者
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: '沒有權限' }, { status: 403 });
  }

  await dbConnect();
  const transactions = await Transaction.find()
    .sort({ createdAt: -1 })
    .limit(200)
    .populate('user', 'name email');
  return NextResponse.json(transactions);
}
