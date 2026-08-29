import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import LineCardTemplate from '@/models/LineCardTemplate';
import { getCurrentUser } from '@/lib/session';

type Params = { params: Promise<{ id: string }> };

// DELETE /api/line-card-templates/:id - 刪除自己儲存的卡片模板
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
  const template = await LineCardTemplate.findOneAndDelete({ _id: id, user: currentUser._id });

  if (!template) {
    return NextResponse.json({ error: '找不到這個模板' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
