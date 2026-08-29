import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';

// GET /api/line-card/quota - 查詢 LINE 官方帳號本月推播訊息用量（登入者才能看）
export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: '尚未登入' }, { status: 401 });
  }

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({ error: '伺服器未設定 LINE_CHANNEL_ACCESS_TOKEN' }, { status: 500 });
  }

  try {
    const headers = { Authorization: `Bearer ${token}` };
    const [quotaRes, consumptionRes] = await Promise.all([
      fetch('https://api.line.me/v2/bot/message/quota', { headers }),
      fetch('https://api.line.me/v2/bot/message/quota/consumption', { headers }),
    ]);

    if (!quotaRes.ok || !consumptionRes.ok) {
      const errText = await (quotaRes.ok ? consumptionRes : quotaRes).text();
      return NextResponse.json({ error: `LINE API 錯誤：${errText}` }, { status: 502 });
    }

    const quota = await quotaRes.json(); // { type: 'none'|'limited'|'unlimited', value?: number }
    const consumption = await consumptionRes.json(); // { totalUsage: number }

    const remaining =
      quota.type === 'limited' && typeof quota.value === 'number'
        ? Math.max(0, quota.value - consumption.totalUsage)
        : null;

    return NextResponse.json({
      type: quota.type,
      limit: quota.value ?? null,
      used: consumption.totalUsage,
      remaining,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '查詢失敗' },
      { status: 500 }
    );
  }
}
