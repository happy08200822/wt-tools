import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { listLineTargets, getActiveTarget, setActiveTarget, PUSH_KEY_CONTRACT, type LineTargetType } from '@/app/lib/lineTargets';

const VALID_TYPES: LineTargetType[] = ['user', 'group', 'room'];

// GET /api/admin/line-targets - 列出目前已知的 LINE 對象（個人/群組/多人聊天室），以及合約通知目前選的是哪一個
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: '沒有權限' }, { status: 401 });
  }

  const [targets, active] = await Promise.all([listLineTargets(), getActiveTarget(PUSH_KEY_CONTRACT)]);
  return NextResponse.json({ targets, active });
}

// POST /api/admin/line-targets - 把合約通知的推播對象切換成指定的 LINE 對象
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: '沒有權限' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const targetId = typeof body?.targetId === 'string' ? body.targetId.trim() : '';
  const type = typeof body?.type === 'string' ? body.type : '';
  const displayName = typeof body?.displayName === 'string' ? body.displayName : '';

  if (!targetId || !VALID_TYPES.includes(type as LineTargetType)) {
    return NextResponse.json({ error: '缺少 targetId 或 type 不正確' }, { status: 400 });
  }

  await setActiveTarget(PUSH_KEY_CONTRACT, targetId, type as LineTargetType, displayName);

  const [targets, active] = await Promise.all([listLineTargets(), getActiveTarget(PUSH_KEY_CONTRACT)]);
  return NextResponse.json({ targets, active });
}
