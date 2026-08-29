import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';

// GET /api/users - 列出所有使用者（供選單使用）
export async function GET() {
  await dbConnect();
  const users = await User.find().select('name email').sort({ name: 1 });
  return NextResponse.json(users);
}

// POST /api/users - 新增使用者
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

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
    });

    const { passwordHash: _passwordHash, ...userWithoutPassword } = user.toObject();
    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 11000) {
      return NextResponse.json({ error: '這個 email 已經被使用過了' }, { status: 409 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '新增失敗' },
      { status: 500 }
    );
  }
}
