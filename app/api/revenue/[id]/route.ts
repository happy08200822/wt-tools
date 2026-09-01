import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Revenue from '@/models/Revenue';
import { getCurrentUser } from '@/lib/session';

type Params = { params: Promise<{ id: string }> };

// DELETE /api/revenue/:id - 刪除某一天的營業額紀錄
export async function DELETE(_request: Request, { params }: Params) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: '尚未登入' }, { status: 401 });
  }

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'id 格式不正確' }, { status: 400 });
  }

  await dbConnect();
  const entry = await Revenue.findOneAndDelete({ _id: id, user: currentUser._id });
  if (!entry) {
    return NextResponse.json({ error: '找不到這筆紀錄' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
