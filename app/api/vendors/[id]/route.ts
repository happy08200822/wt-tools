import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Vendor from '@/models/Vendor';
import VendorReceipt from '@/models/VendorReceipt';
import { getCurrentUser } from '@/lib/session';
import '@/models/Category'; // 註冊 Category schema，給下面 .populate('category', ...) 用

type Params = { params: Promise<{ id: string }> };

// PATCH /api/vendors/:id - 改名 / 改分類
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
  const update: Record<string, unknown> = {};

  if (typeof body?.name === 'string') {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: '廠商名稱不能是空的' }, { status: 400 });
    update.name = name;
  }
  if ('categoryId' in (body ?? {})) {
    const categoryId = body.categoryId;
    if (categoryId === null || categoryId === '') {
      update.category = null;
    } else if (typeof categoryId === 'string' && mongoose.Types.ObjectId.isValid(categoryId)) {
      update.category = categoryId;
    } else {
      return NextResponse.json({ error: '分類 id 格式不正確' }, { status: 400 });
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: '沒有可更新的欄位' }, { status: 400 });
  }

  await dbConnect();
  try {
    const vendor = await Vendor.findOneAndUpdate({ _id: id, user: currentUser._id }, update, { new: true }).populate(
      'category',
      'name'
    );
    if (!vendor) {
      return NextResponse.json({ error: '找不到這個廠商' }, { status: 404 });
    }
    return NextResponse.json(vendor);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 11000) {
      return NextResponse.json({ error: '這個廠商名稱已經新增過了' }, { status: 409 });
    }
    return NextResponse.json({ error: '更新失敗' }, { status: 500 });
  }
}

// DELETE /api/vendors/:id - 刪除廠商（底下還有收據紀錄的話不能刪，避免資料孤兒）
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

  const receiptCount = await VendorReceipt.countDocuments({ vendor: id, user: currentUser._id });
  if (receiptCount > 0) {
    return NextResponse.json(
      { error: `這個廠商底下還有 ${receiptCount} 筆收據紀錄，無法刪除` },
      { status: 400 }
    );
  }

  const vendor = await Vendor.findOneAndDelete({ _id: id, user: currentUser._id });
  if (!vendor) {
    return NextResponse.json({ error: '找不到這個廠商' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
