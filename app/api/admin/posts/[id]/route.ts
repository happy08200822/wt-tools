import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Post from '@/models/Post';
import { requireAdmin } from '@/lib/session';

type Params = { params: Promise<{ id: string }> };

// DELETE /api/admin/posts/:id - 刪除任何一篇文章（含匿名），僅管理者
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
  const post = await Post.findByIdAndDelete(id);
  if (!post) {
    return NextResponse.json({ error: '找不到這篇文章' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
