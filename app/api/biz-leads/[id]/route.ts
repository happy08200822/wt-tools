import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import BizLead, { BIZ_LEAD_STATUSES } from '@/models/BizLead';
import { getCurrentUser } from '@/lib/session';

type Params = { params: Promise<{ id: string }> };

const EDITABLE_TEXT_FIELDS = ['name', 'category', 'address', 'phone', 'lineUrl', 'igUrl', 'fbUrl', 'note'] as const;

// PATCH /api/biz-leads/:id - 更新店家資料或開發狀態
export async function PATCH(request: Request, { params }: Params) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: '尚未登入' }, { status: 401 });
  }

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'id 格式不正確' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: '請提供更新內容' }, { status: 400 });
  }

  const update: Record<string, string> = {};
  for (const field of EDITABLE_TEXT_FIELDS) {
    if (typeof body[field] === 'string') {
      update[field] = body[field].trim();
    }
  }
  if (update.name === '') {
    return NextResponse.json({ error: '店名不能是空的' }, { status: 400 });
  }

  if (typeof body.status === 'string') {
    if (!BIZ_LEAD_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: '狀態格式不正確' }, { status: 400 });
    }
    update.status = body.status;
  }

  await dbConnect();
  const lead = await BizLead.findOneAndUpdate(
    { _id: id, user: currentUser._id },
    { $set: update },
    { new: true }
  );
  if (!lead) {
    return NextResponse.json({ error: '找不到這筆資料' }, { status: 404 });
  }

  return NextResponse.json(lead);
}

// DELETE /api/biz-leads/:id - 刪除一筆店家開發名單
export async function DELETE(_request: Request, { params }: Params) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: '尚未登入' }, { status: 401 });
  }

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'id 格式不正確' }, { status: 400 });
  }

  await dbConnect();
  const lead = await BizLead.findOneAndDelete({ _id: id, user: currentUser._id });
  if (!lead) {
    return NextResponse.json({ error: '找不到這筆資料' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
