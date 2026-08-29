import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/session';
import AdminDashboard from './AdminDashboard';

export default async function AdminPage() {
  const admin = await requireAdmin();
  if (!admin) redirect('/');

  return <AdminDashboard adminId={admin._id} />;
}
