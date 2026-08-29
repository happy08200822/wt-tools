import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Post from '@/models/Post';
import { requireAdmin } from '@/lib/session';

// GET /api/admin/posts - 列出全部文章（含匿名），僅管理者
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: '沒有權限' }, { status: 403 });
  }

  await dbConnect();
  const posts = await Post.find().sort({ createdAt: -1 }).limit(200).populate('user', 'name email');
  return NextResponse.json(posts);
}
