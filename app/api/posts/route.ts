import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Post from '@/models/Post';
import User from '@/models/User';

// GET /api/posts?userId=xxx - 列出文章（可選依使用者篩選），只讀
export async function GET(request: Request) {
  await dbConnect();

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const filter: Record<string, unknown> = {};

  if (userId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: 'userId 格式不正確' }, { status: 400 });
    }
    filter.user = userId;
  }

  const posts = await Post.find(filter).sort({ createdAt: -1 }).populate('user', 'name email');
  return NextResponse.json(posts);
}

// POST /api/posts - 新增文章
export async function POST(request: Request) {
  await dbConnect();

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: '請提供有效的 JSON 內容' }, { status: 400 });
  }

  const { user, content } = body;

  // user 選填：留空代表匿名發表
  if (user !== undefined && user !== null && user !== '') {
    if (!mongoose.Types.ObjectId.isValid(user)) {
      return NextResponse.json({ error: 'user 格式不正確' }, { status: 400 });
    }
    const userExists = await User.exists({ _id: user });
    if (!userExists) {
      return NextResponse.json({ error: '找不到對應的使用者' }, { status: 404 });
    }
  }
  if (typeof content !== 'string' || !content.trim()) {
    return NextResponse.json({ error: '缺少 content' }, { status: 400 });
  }

  const post = await Post.create({
    user: user || undefined,
    content: content.trim(),
  });
  const populated = await post.populate('user', 'name email');
  return NextResponse.json(populated, { status: 201 });
}
