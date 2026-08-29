import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Post from '@/models/Post';

type Params = { params: Promise<{ id: string }> };

// DELETE /api/posts/:id?userId=xxx - 只能刪除自己的文章
export async function DELETE(request: Request, { params }: Params) {
  await dbConnect();
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'id 格式不正確' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ error: '缺少有效的 userId' }, { status: 400 });
  }

  const post = await Post.findById(id);
  if (!post) {
    return NextResponse.json({ error: '找不到這篇文章' }, { status: 404 });
  }

  if (!post.user) {
    return NextResponse.json({ error: '匿名文章無法刪除' }, { status: 403 });
  }

  if (post.user.toString() !== userId) {
    return NextResponse.json({ error: '只能刪除自己發表的文章' }, { status: 403 });
  }

  await post.deleteOne();
  return NextResponse.json({ success: true });
}
