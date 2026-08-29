import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import QuoteLead from '@/models/QuoteLead';
import { getCurrentUser } from '@/lib/session';

// GET /api/quote-leads - 列出目前登入者建立過的報價追蹤連結（含瀏覽紀錄）
export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: '尚未登入' }, { status: 401 });
  }

  await dbConnect();
  const leads = await QuoteLead.find({ user: currentUser._id }).sort({ createdAt: -1 });

  return NextResponse.json(leads);
}

// POST /api/quote-leads - 建立一個新的報價追蹤連結，回傳 id 給卡片按鈕使用
export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: '尚未登入' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const customerName = typeof body?.customerName === 'string' ? body.customerName.trim() : '';
  const accentColor = typeof body?.accentColor === 'string' ? body.accentColor : '';
  const plans = Array.isArray(body?.plans) ? body.plans : null;

  if (!customerName) {
    return NextResponse.json({ error: '請輸入客戶名稱' }, { status: 400 });
  }
  if (!accentColor || !plans || plans.length === 0) {
    return NextResponse.json({ error: '沒有報價方案內容，請先新增方案清單區塊' }, { status: 400 });
  }

  await dbConnect();
  const lead = await QuoteLead.create({
    user: currentUser._id,
    customerName,
    accentColor,
    plans,
    visits: [],
  });

  return NextResponse.json({ _id: lead._id }, { status: 201 });
}
