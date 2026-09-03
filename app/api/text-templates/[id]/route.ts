import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import TextTemplate from '@/models/TextTemplate';
import { getCurrentUser } from '@/lib/session';

type Params = { params: Promise<{ id: string }> };

// DELETE /api/text-templates/:id - 刪除自己儲存的常用文字
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
  const template = await TextTemplate.findOneAndDelete({ _id: id, user: currentUser._id });

  if (!template) {
    return NextResponse.json({ error: '找不到這則文案' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
