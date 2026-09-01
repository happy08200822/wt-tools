import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Revenue from '@/models/Revenue';
import { getCurrentUser } from '@/lib/session';

// GET /api/revenue?month=YYYY-MM - 列出這個月每天的營業額紀錄
export async function GET(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: '尚未登入' }, { status: 401 });
  }

  const url = new URL(request.url);
  const month = url.searchParams.get('month');
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: '請提供正確的 month 參數（YYYY-MM）' }, { status: 400 });
  }

  await dbConnect();
  const entries = await Revenue.find({ user: currentUser._id, date: { $regex: `^${month}` } }).sort({ date: -1 });
  const total = entries.reduce((sum, e) => sum + e.amount, 0);

  return NextResponse.json({ entries, total });
}

// POST /api/revenue - 新增/更新某一天的營業額（同一天重複輸入會覆蓋，不會重複累加）
export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: '尚未登入' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const date = typeof body?.date === 'string' ? body.date : '';
  const amount = Number(body?.amount);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: '日期格式不正確（需要 YYYY-MM-DD）' }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: '營業額金額不正確' }, { status: 400 });
  }

  await dbConnect();
  const entry = await Revenue.findOneAndUpdate(
    { user: currentUser._id, date },
    { amount },
    { new: true, upsert: true }
  );

  return NextResponse.json(entry, { status: 201 });
}
