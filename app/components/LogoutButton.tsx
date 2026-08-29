'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await signOut({ callbackUrl: '/login' });
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
    >
      {loading ? '登出中...' : '登出'}
    </button>
  );
}
