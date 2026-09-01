import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import VendorReceipt from '@/models/VendorReceipt';
import { getCurrentUser } from '@/lib/session';

type Params = { params: Promise<{ id: string; receiptId: string }> };

// PATCH /api/vendors/:id/receipts/:receiptId - 修正已存檔的收據資料（日期/總額/品項明細）
export async function PATCH(request: Request, { params }: Params) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: '尚未登入' }, { status: 401 });
  }

  const { id, receiptId } = await params;
  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(receiptId)) {
    return NextResponse.json({ error: 'id 格式不正確' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const update: Record<string, unknown> = {};
  if (typeof body?.date === 'string') update.date = body.date;
  if (typeof body?.receiptTotal === 'number') update.receiptTotal = body.receiptTotal;
  if (Array.isArray(body?.items)) update.items = body.items;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: '沒有可更新的欄位' }, { status: 400 });
  }

  await dbConnect();
  const receipt = await VendorReceipt.findOneAndUpdate(
    { _id: receiptId, vendor: id, user: currentUser._id },
    update,
    { new: true }
  );
  if (!receipt) {
    return NextResponse.json({ error: '找不到這筆紀錄' }, { status: 404 });
  }

  return NextResponse.json(receipt);
}

// DELETE /api/vendors/:id/receipts/:receiptId - 刪除一筆收據紀錄
export async function DELETE(_request: Request, { params }: Params) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: '尚未登入' }, { status: 401 });
  }

  const { id, receiptId } = await params;
  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(receiptId)) {
    return NextResponse.json({ error: 'id 格式不正確' }, { status: 400 });
  }

  await dbConnect();
  const receipt = await VendorReceipt.findOneAndDelete({ _id: receiptId, vendor: id, user: currentUser._id });
  if (!receipt) {
    return NextResponse.json({ error: '找不到這筆紀錄' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
