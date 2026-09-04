'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AiUsageReportTab from './AiUsageReportTab';
import LinePushSettingsTab from './LinePushSettingsTab';

type Tab = 'users' | 'transactions' | 'posts' | 'aiUsage' | 'linePush';

type AdminUser = {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
  lineUserId?: string;
  providers: string[];
};

const PROVIDER_LABEL: Record<string, { label: string; className: string }> = {
  credentials: { label: '帳密', className: 'bg-slate-100 text-slate-600' },
  google: { label: 'Google', className: 'bg-red-50 text-red-600' },
  line: { label: 'LINE', className: 'bg-emerald-50 text-emerald-600' },
};
type AdminTransaction = {
  _id: string;
  user: { _id: string; name: string; email: string } | null;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  date: string;
};
type AdminPost = {
  _id: string;
  user: { _id: string; name: string; email: string } | null;
  content: string;
  createdAt: string;
};

const TABS: { id: Tab; label: string }[] = [
  { id: 'users', label: '使用者' },
  { id: 'transactions', label: '記帳紀錄' },
  { id: 'posts', label: '留言板文章' },
  { id: 'aiUsage', label: 'AI 用量報表' },
  { id: 'linePush', label: 'LINE 推播設定' },
];

export default function AdminDashboard({ adminId }: { adminId: string }) {
  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadTab(t: Tab) {
    if (t === 'aiUsage' || t === 'linePush') return; // 這兩個分頁自己管理資料，不用共用的載入邏輯
    setLoading(true);
    setError('');
    try {
      if (t === 'users') {
        const res = await fetch('/api/admin/users');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setUsers(data);
      } else if (t === 'transactions') {
        const res = await fetch('/api/admin/transactions');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setTransactions(data);
      } else {
        const res = await fetch('/api/admin/posts');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setPosts(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '讀取失敗');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTab(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function toggleRole(user: AdminUser) {
    const nextRole = user.role === 'admin' ? 'user' : 'admin';
    if (!confirm(`確定要把「${user.name}」的身份改成 ${nextRole === 'admin' ? '管理者' : '一般使用者'}？`)) return;
    try {
      const res = await fetch(`/api/admin/users/${user._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await loadTab('users');
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失敗');
    }
  }

  async function sendTestPush(user: AdminUser) {
    const message = prompt(`要傳送給「${user.name}」的測試訊息內容：`, '這是一則測試推播訊息 👋');
    if (!message || !message.trim()) return;
    try {
      const res = await fetch('/api/admin/line-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id, message: message.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert('推播成功！');
    } catch (err) {
      alert(err instanceof Error ? err.message : '推播失敗');
    }
  }

  async function deleteUser(user: AdminUser) {
    if (!confirm(`確定要刪除使用者「${user.name}」？此動作無法復原。`)) return;
    try {
      const res = await fetch(`/api/admin/users/${user._id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await loadTab('users');
    } catch (err) {
      alert(err instanceof Error ? err.message : '刪除失敗');
    }
  }

  async function deleteTransaction(id: string) {
    if (!confirm('確定要刪除這筆記帳紀錄？')) return;
    try {
      const res = await fetch(`/api/admin/transactions/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await loadTab('transactions');
    } catch (err) {
      alert(err instanceof Error ? err.message : '刪除失敗');
    }
  }

  async function deletePost(id: string) {
    if (!confirm('確定要刪除這篇文章？')) return;
    try {
      const res = await fetch(`/api/admin/posts/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await loadTab('posts');
    } catch (err) {
      alert(err instanceof Error ? err.message : '刪除失敗');
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center gap-6 p-8 bg-slate-100">
      <div className="w-full max-w-4xl flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-800">後台管理</h1>
        <Link href="/" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
          ← 回首頁
        </Link>
      </div>

      <div className="flex gap-2 bg-white rounded-full p-1 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              tab === t.id ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      {loading && <p className="text-slate-400 text-sm">讀取中...</p>}

      {!loading && tab === 'users' && (
        <div className="w-full max-w-4xl bg-white rounded-2xl shadow p-5 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-slate-400 border-b border-slate-200">
                <th className="py-2 pr-4">姓名</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">角色</th>
                <th className="py-2 pr-4">登入方式</th>
                <th className="py-2 pr-4">註冊時間</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="border-b border-slate-100">
                  <td className="py-2 pr-4 font-semibold text-slate-800">{u.name}</td>
                  <td className="py-2 pr-4 text-slate-600">{u.email}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {u.role === 'admin' ? '管理者' : '一般使用者'}
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex gap-1 flex-wrap">
                      {u.providers.length === 0 && (
                        <span className="text-[11px] text-slate-300">—</span>
                      )}
                      {u.providers.map((p) => {
                        const meta = PROVIDER_LABEL[p] ?? { label: p, className: 'bg-slate-100 text-slate-500' };
                        return (
                          <span
                            key={p}
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${meta.className}`}
                          >
                            {meta.label}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="py-2 pr-4 text-slate-500">{new Date(u.createdAt).toLocaleDateString('zh-TW')}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    {u.lineUserId && (
                      <button
                        onClick={() => sendTestPush(u)}
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 mr-3"
                      >
                        推播測試
                      </button>
                    )}
                    {u._id === adminId ? (
                      <span className="text-xs text-slate-300">（自己）</span>
                    ) : (
                      <>
                        <button
                          onClick={() => toggleRole(u)}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 mr-3"
                        >
                          切換角色
                        </button>
                        <button
                          onClick={() => deleteUser(u)}
                          className="text-xs font-semibold text-red-500 hover:text-red-600"
                        >
                          刪除
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && tab === 'transactions' && (
        <div className="w-full max-w-4xl bg-white rounded-2xl shadow p-5 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-slate-400 border-b border-slate-200">
                <th className="py-2 pr-4">使用者</th>
                <th className="py-2 pr-4">類型</th>
                <th className="py-2 pr-4">分類</th>
                <th className="py-2 pr-4">金額</th>
                <th className="py-2 pr-4">日期</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t._id} className="border-b border-slate-100">
                  <td className="py-2 pr-4 font-semibold text-slate-800">{t.user?.name ?? '（已刪除）'}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        t.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {t.type === 'income' ? '收入' : '支出'}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-slate-600">{t.category}</td>
                  <td className="py-2 pr-4 text-slate-700">${t.amount.toLocaleString('zh-TW')}</td>
                  <td className="py-2 pr-4 text-slate-500">{t.date.slice(0, 10)}</td>
                  <td className="py-2 pr-4">
                    <button
                      onClick={() => deleteTransaction(t._id)}
                      className="text-xs font-semibold text-red-500 hover:text-red-600"
                    >
                      刪除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && tab === 'posts' && (
        <div className="w-full max-w-4xl flex flex-col gap-3">
          {posts.map((p) => (
            <div key={p._id} className="bg-white rounded-2xl shadow p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={`text-sm font-bold ${p.user ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                  {p.user ? p.user.name : '匿名'}
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {new Date(p.createdAt).toLocaleString('zh-TW')}
                  </span>
                </p>
                <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap break-words">{p.content}</p>
              </div>
              <button
                onClick={() => deletePost(p._id)}
                className="shrink-0 text-xs font-semibold text-red-500 hover:text-red-600"
              >
                刪除
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'aiUsage' && <AiUsageReportTab />}
      {tab === 'linePush' && <LinePushSettingsTab />}
    </main>
  );
}
