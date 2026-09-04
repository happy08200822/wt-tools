import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { recordLineTarget, type LineTargetType } from '@/app/lib/lineTargets';

type LineEventSource = {
  type: LineTargetType;
  userId?: string;
  groupId?: string;
  roomId?: string;
};

type LineEvent = {
  type: string;
  replyToken?: string;
  source?: LineEventSource;
};

const TYPE_LABEL: Record<LineTargetType, string> = {
  user: '個人',
  group: '群組',
  room: '多人聊天室',
};

function sourceId(source?: LineEventSource): string | null {
  if (!source) return null;
  if (source.type === 'group') return source.groupId ?? null;
  if (source.type === 'room') return source.roomId ?? null;
  if (source.type === 'user') return source.userId ?? null;
  return null;
}

async function replyLineMessage(replyToken: string, text: string): Promise<void> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return;
  try {
    await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ replyToken, messages: [{ type: 'text', text }] }),
    });
  } catch {
    // 回覆失敗不影響 webhook 主流程，LINE 只在乎我們有沒有回 200
  }
}

// POST /api/line/webhook - LINE Messaging API 的 webhook 網址（設定在 LINE Developers 後台）
// 用途單純是「取得推播目標 ID」：把官方帳號拉進群組、或私訊官方帳號，
// 這裡收到事件時會把來源 ID 記錄下來，並直接回覆訊息把 ID 貼在聊天室裡，
// 不用另外去後台翻紀錄。記錄下來的 ID 會出現在 /admin 的「LINE 推播設定」分頁可以選
export async function POST(request: Request) {
  const secret = process.env.LINE_CHANNEL_SECRET;
  const rawBody = await request.text();

  if (secret) {
    const signature = request.headers.get('x-line-signature') ?? '';
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
    if (signature !== expected) {
      return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
    }
  }

  const body = JSON.parse(rawBody || '{}');
  const events: LineEvent[] = Array.isArray(body?.events) ? body.events : [];

  await Promise.all(
    events.map(async (event) => {
      const id = sourceId(event.source);
      if (!id || !event.source) return;

      const displayName = await recordLineTarget(id, event.source.type);

      if (event.replyToken) {
        const namePart = displayName ? `（${displayName}）` : '';
        await replyLineMessage(
          event.replyToken,
          `📎 這個${TYPE_LABEL[event.source.type]}${namePart}的推播 ID 是：\n${id}\n\n可以到後台「LINE 推播設定」選這個當通知對象`
        );
      }
    })
  );

  return NextResponse.json({ ok: true });
}
