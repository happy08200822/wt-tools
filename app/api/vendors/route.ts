import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Vendor from '@/models/Vendor';
import VendorReceipt from '@/models/VendorReceipt';
import { getCurrentUser } from '@/lib/session';
// 只是要註冊 Category schema 給下面 .populate('category', ...) 用，見 richmenu/admin 那邊同樣的 MissingSchemaError 教訓
import '@/models/Category';

// GET /api/vendors - 列出目前登入者的廠商清單，附上每個廠商目前有幾筆收據紀錄
export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: '尚未登入' }, { status: 401 });
  }

  await dbConnect();
  const vendors = await Vendor.find({ user: currentUser._id })
    .populate('category', 'name')
    .sort({ name: 1 })
    .lean();

  const counts = await VendorReceipt.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(currentUser._id) } },
    { $group: { _id: '$vendor', count: { $sum: 1 }, totalSpend: { $sum: '$receiptTotal' } } },
  ]);
  const countMap = new Map(counts.map((c) => [c._id.toString(), c]));

  const result = vendors.map((v) => ({
    ...v,
    receiptCount: countMap.get(v._id.toString())?.count ?? 0,
    totalSpend: countMap.get(v._id.toString())?.totalSpend ?? 0,
  }));

  return NextResponse.json(result);
}

// POST /api/vendors - 新增廠商，可選擇性帶 categoryId
export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: '尚未登入' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const categoryId = typeof body?.categoryId === 'string' && body.categoryId ? body.categoryId : undefined;
  if (!name) {
    return NextResponse.json({ error: '請輸入廠商名稱' }, { status: 400 });
  }
  if (categoryId && !mongoose.Types.ObjectId.isValid(categoryId)) {
    return NextResponse.json({ error: '分類 id 格式不正確' }, { status: 400 });
  }

  await dbConnect();
  try {
    const vendor = await Vendor.create({ user: currentUser._id, name, category: categoryId });
    await vendor.populate('category', 'name');
    return NextResponse.json({ ...vendor.toObject(), receiptCount: 0, totalSpend: 0 }, { status: 201 });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 11000) {
      return NextResponse.json({ error: '這個廠商名稱已經新增過了' }, { status: 409 });
    }
    return NextResponse.json({ error: '新增失敗' }, { status: 500 });
  }
}
