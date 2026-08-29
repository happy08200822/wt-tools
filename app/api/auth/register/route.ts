import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';

// POST /api/auth/register - 建立帳密登入用的帳號
// 只負責建立帳號，前端要接著呼叫 Auth.js 的 signIn('credentials', ...) 才會真的登入
export async function POST(request: Request) {
  await dbConnect();

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: '請提供有效的 JSON 內容' }, { status: 400 });
  }

  const { name, email, password } = body;

  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: '缺少 name' }, { status: 400 });
  }
  if (typeof email !== 'string' || !email.trim()) {
    return NextResponse.json({ error: '缺少 email' }, { status: 400 });
  }
  if (typeof password !== 'string' || password.length < 6) {
    return NextResponse.json({ error: 'password 至少需要 6 個字元' }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const role = normalizedEmail === process.env.ADMIN_EMAIL?.toLowerCase() ? 'admin' : 'user';
    const user = await User.create({ name: name.trim(), email: normalizedEmail, passwordHash, role });

    return NextResponse.json({ _id: user._id, name: user.name, email: user.email }, { status: 201 });
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 11000) {
      return NextResponse.json({ error: '這個 email 已經被註冊過了' }, { status: 409 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '註冊失敗' },
      { status: 500 }
    );
  }
}
