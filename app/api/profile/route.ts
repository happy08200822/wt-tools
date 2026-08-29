import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import { getCurrentUser } from '@/lib/session';

// GET /api/profile - 讀取目前登入者的完整資料
export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: '尚未登入' }, { status: 401 });
  }

  await dbConnect();
  const user = await User.findById(currentUser._id).select('name email image role');
  if (!user) {
    return NextResponse.json({ error: '找不到使用者' }, { status: 404 });
  }

  return NextResponse.json(user);
}

// PATCH /api/profile - 更新目前登入者的大頭照（只能改自己的）
export async function PATCH(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: '尚未登入' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const image = body?.image;

  if (typeof image !== 'string' || !/^https?:\/\//.test(image)) {
    return NextResponse.json({ error: '缺少有效的圖片網址' }, { status: 400 });
  }

  await dbConnect();
  const user = await User.findByIdAndUpdate(currentUser._id, { image }, { new: true }).select(
    'name email image role'
  );

  return NextResponse.json(user);
}
