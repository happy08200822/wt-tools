import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Category from '@/models/Category';
import Vendor from '@/models/Vendor';
import { getCurrentUser } from '@/lib/session';

type Params = { params: Promise<{ id: string }> };

// DELETE /api/categories/:id - 刪除分類（底下還有廠商掛著的話不能刪）
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

  const vendorCount = await Vendor.countDocuments({ category: id, user: currentUser._id });
  if (vendorCount > 0) {
    return NextResponse.json(
      { error: `這個分類底下還有 ${vendorCount} 個廠商，請先改到別的分類再刪除` },
      { status: 400 }
    );
  }

  const category = await Category.findOneAndDelete({ _id: id, user: currentUser._id });
  if (!category) {
    return NextResponse.json({ error: '找不到這個分類' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
