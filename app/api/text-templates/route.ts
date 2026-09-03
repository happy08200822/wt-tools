import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import TextTemplate from '@/models/TextTemplate';
import { getCurrentUser } from '@/lib/session';

// GET /api/text-templates - 列出目前登入者儲存的常用文字
export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: '尚未登入' }, { status: 401 });
  }

  await dbConnect();
  const templates = await TextTemplate.find({ user: currentUser._id }).sort({ updatedAt: -1 });

  return NextResponse.json(templates);
}

// POST /api/text-templates - 儲存一則常用文字（同名會覆蓋）
export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: '尚未登入' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const text = typeof body?.body === 'string' ? body.body.trim() : '';

  if (!name) {
    return NextResponse.json({ error: '請輸入文案名稱' }, { status: 400 });
  }
  if (!text) {
    return NextResponse.json({ error: '請輸入文案內容' }, { status: 400 });
  }

  await dbConnect();
  const template = await TextTemplate.findOneAndUpdate(
    { user: currentUser._id, name },
    { body: text },
    { new: true, upsert: true }
  );

  return NextResponse.json(template, { status: 201 });
}
