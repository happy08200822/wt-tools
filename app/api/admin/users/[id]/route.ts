import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import { requireAdmin } from '@/lib/session';

type Params = { params: Promise<{ id: string }> };

// PATCH /api/admin/users/:id - 變更角色，僅管理者
export async function PATCH(request: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: '沒有權限' }, { status: 403 });
  }

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'id 格式不正確' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const role = body?.role;
  if (role !== 'admin' && role !== 'user') {
    return NextResponse.json({ error: 'role 必須是 admin 或 user' }, { status: 400 });
  }

  if (id === admin._id) {
    return NextResponse.json({ error: '不能變更自己的角色' }, { status: 400 });
  }

  await dbConnect();
  const user = await User.findByIdAndUpdate(id, { role }, { new: true }).select('name email role');
  if (!user) {
    return NextResponse.json({ error: '找不到這個使用者' }, { status: 404 });
  }

  return NextResponse.json(user);
}

// DELETE /api/admin/users/:id - 刪除使用者，僅管理者
export async function DELETE(_request: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: '沒有權限' }, { status: 403 });
  }

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'id 格式不正確' }, { status: 400 });
  }

  if (id === admin._id) {
    return NextResponse.json({ error: '不能刪除自己的帳號' }, { status: 400 });
  }

  await dbConnect();
  const user = await User.findByIdAndDelete(id);
  if (!user) {
    return NextResponse.json({ error: '找不到這個使用者' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
