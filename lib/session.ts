import { auth } from '@/auth';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';

export type CurrentUser = {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  image?: string;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  // 直接查資料庫拿最新的 name/image，避免依賴登入當下寫進 JWT 的舊資料
  // （role 沒有這樣做是刻意的，改角色這種敏感操作本來就該要求重新登入才生效）
  await dbConnect();
  const user = await User.findById(session.user.id).select('name email image');
  if (!user) return null;

  return {
    _id: session.user.id,
    name: user.name ?? session.user.name ?? '',
    email: user.email ?? session.user.email ?? '',
    image: user.image,
    role: session.user.role,
  };
}

export async function requireAdmin(): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  return user?.role === 'admin' ? user : null;
}
