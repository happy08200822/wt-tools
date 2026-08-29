import { auth } from '@/auth';

export type CurrentUser = {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  if (!session?.user) return null;

  return {
    _id: session.user.id,
    name: session.user.name ?? '',
    email: session.user.email ?? '',
    role: session.user.role,
  };
}

export async function requireAdmin(): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  return user?.role === 'admin' ? user : null;
}
