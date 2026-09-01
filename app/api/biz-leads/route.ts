import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import BizLead, { BIZ_LEAD_STATUSES } from '@/models/BizLead';
import { getCurrentUser } from '@/lib/session';

// GET /api/biz-leads - 列出目前登入者建立的店家開發名單
export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: '尚未登入' }, { status: 401 });
  }

  await dbConnect();
  const leads = await BizLead.find({ user: currentUser._id }).sort({ createdAt: -1 });

  return NextResponse.json(leads);
}

// POST /api/biz-leads - 新增一筆店家開發名單
export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: '尚未登入' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return NextResponse.json({ error: '請輸入店名' }, { status: 400 });
  }

  const status = typeof body?.status === 'string' ? body.status : 'new';
  if (!BIZ_LEAD_STATUSES.includes(status)) {
    return NextResponse.json({ error: '狀態格式不正確' }, { status: 400 });
  }

  await dbConnect();
  const lead = await BizLead.create({
    user: currentUser._id,
    name,
    category: typeof body?.category === 'string' ? body.category.trim() : '',
    address: typeof body?.address === 'string' ? body.address.trim() : '',
    phone: typeof body?.phone === 'string' ? body.phone.trim() : '',
    lineUrl: typeof body?.lineUrl === 'string' ? body.lineUrl.trim() : '',
    igUrl: typeof body?.igUrl === 'string' ? body.igUrl.trim() : '',
    fbUrl: typeof body?.fbUrl === 'string' ? body.fbUrl.trim() : '',
    status,
    note: typeof body?.note === 'string' ? body.note.trim() : '',
  });

  return NextResponse.json(lead, { status: 201 });
}
