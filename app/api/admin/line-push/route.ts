import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import { requireAdmin } from '@/lib/session';

// POST /api/admin/line-push - 用 LINE Messaging API 推播訊息給指定使用者，僅管理者
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: '沒有權限' }, { status: 403 });
  }

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({ error: '伺服器未設定 LINE_CHANNEL_ACCESS_TOKEN' }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const userId = body?.userId;
  const message = body?.message;

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ error: '缺少有效的 userId' }, { status: 400 });
  }
  if (typeof message !== 'string' || !message.trim()) {
    return NextResponse.json({ error: '缺少 message' }, { status: 400 });
  }

  await dbConnect();
  const user = await User.findById(userId).select('name lineUserId');
  if (!user) {
    return NextResponse.json({ error: '找不到這個使用者' }, { status: 404 });
  }
  if (!user.lineUserId) {
    return NextResponse.json({ error: '這個使用者沒有 lineUserId，沒辦法推播' }, { status: 400 });
  }

  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: user.lineUserId,
        messages: [{ type: 'text', text: message.trim() }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `LINE API 錯誤：${res.status} ${errText}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '推播失敗' },
      { status: 500 }
    );
  }
}
