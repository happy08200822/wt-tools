import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import { requireAdmin } from '@/lib/session';

// GET /api/admin/users - 列出所有使用者（含角色、登入方式），僅管理者
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: '沒有權限' }, { status: 403 });
  }

  await dbConnect();
  const users = await User.find()
    .select('name email role createdAt lineUserId passwordHash')
    .sort({ createdAt: -1 });

  // accounts 是 Auth.js adapter 用原生 driver 管理的，不是 Mongoose model，直接用底層連線查
  const db = mongoose.connection.db;
  const accounts = db ? await db.collection('accounts').find().toArray() : [];
  const providersByUserId = new Map<string, string[]>();
  for (const acc of accounts) {
    const key = String(acc.userId);
    const list = providersByUserId.get(key) ?? [];
    list.push(acc.provider);
    providersByUserId.set(key, list);
  }

  const result = users.map((u) => {
    const providers = providersByUserId.get(u._id.toString()) ?? [];
    if (u.passwordHash) providers.unshift('credentials');
    return {
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      lineUserId: u.lineUserId,
      providers,
    };
  });

  return NextResponse.json(result);
}
