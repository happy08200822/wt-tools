import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Transaction from '@/models/Transaction';
import { requireAdmin } from '@/lib/session';

type Params = { params: Promise<{ id: string }> };

// DELETE /api/admin/transactions/:id - 刪除任何一筆記帳紀錄，僅管理者
export async function DELETE(_request: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: '沒有權限' }, { status: 403 });
  }

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'id 格式不正確' }, { status: 400 });
  }

  await dbConnect();
  const transaction = await Transaction.findByIdAndDelete(id);
  if (!transaction) {
    return NextResponse.json({ error: '找不到這筆記帳紀錄' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
