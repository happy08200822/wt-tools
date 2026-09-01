import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Category from '@/models/Category';
import { getCurrentUser } from '@/lib/session';

// GET /api/categories - 列出目前登入者的分類清單
export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: '尚未登入' }, { status: 401 });
  }

  await dbConnect();
  const categories = await Category.find({ user: currentUser._id }).sort({ name: 1 });

  return NextResponse.json(categories);
}

// POST /api/categories - 新增分類
export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: '尚未登入' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return NextResponse.json({ error: '請輸入分類名稱' }, { status: 400 });
  }

  await dbConnect();
  try {
    const category = await Category.create({ user: currentUser._id, name });
    return NextResponse.json(category, { status: 201 });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 11000) {
      return NextResponse.json({ error: '這個分類名稱已經新增過了' }, { status: 409 });
    }
    return NextResponse.json({ error: '新增失敗' }, { status: 500 });
  }
}
