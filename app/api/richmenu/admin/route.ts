import { NextResponse } from 'next/server';
import {
  getAllUsage,
  getRecentLog,
  checkAdminPassword,
  addUser,
  removeUser,
} from '@/app/lib/richmenuUsers';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!checkAdminPassword(body?.password)) {
    return NextResponse.json({ error: '管理密碼錯誤' }, { status: 401 });
  }

  const action = typeof body?.action === 'string' ? body.action : null;

  if (action === 'addUser') {
    const code = typeof body?.code === 'string' ? body.code.trim() : '';
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!code || !name) {
      return NextResponse.json({ error: '密碼與姓名都要填' }, { status: 400 });
    }
    await addUser(code, name);
  } else if (action === 'removeUser') {
    const code = typeof body?.code === 'string' ? body.code.trim() : '';
    if (!code) {
      return NextResponse.json({ error: '缺少要移除的密碼' }, { status: 400 });
    }
    await removeUser(code);
  }

  const [users, log] = await Promise.all([getAllUsage(), getRecentLog(50)]);

  return NextResponse.json({ users, log });
}
