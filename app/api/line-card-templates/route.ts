import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import LineCardTemplate from '@/models/LineCardTemplate';
import { getCurrentUser } from '@/lib/session';

// GET /api/line-card-templates - 列出目前登入者儲存的卡片模板
export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: '尚未登入' }, { status: 401 });
  }

  await dbConnect();
  const templates = await LineCardTemplate.find({ user: currentUser._id }).sort({ updatedAt: -1 });

  return NextResponse.json(templates);
}

// POST /api/line-card-templates - 儲存目前卡片為模板（同名會覆蓋）
export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: '尚未登入' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const accentColor = typeof body?.accentColor === 'string' ? body.accentColor : '';
  const blocks = Array.isArray(body?.blocks) ? body.blocks : null;

  if (!name) {
    return NextResponse.json({ error: '請輸入模板名稱' }, { status: 400 });
  }
  if (!accentColor || !blocks) {
    return NextResponse.json({ error: '卡片內容不完整' }, { status: 400 });
  }

  await dbConnect();
  const template = await LineCardTemplate.findOneAndUpdate(
    { user: currentUser._id, name },
    { accentColor, blocks },
    { new: true, upsert: true }
  );

  return NextResponse.json(template, { status: 201 });
}
