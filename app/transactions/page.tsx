'use client';

import { useEffect, useState } from 'react';

type UserOption = { _id: string; name: string; email: string };

type TransactionItem = {
  _id: string;
  user: { _id: string; name: string; email: string } | string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  date: string;
  note?: string;
};

type FormState = {
  type: 'income' | 'expense';
  category: string;
  amount: string;
  date: string;
  note: string;
};

type LogEntry = {
  _id: string;
  action: 'create' | 'update' | 'delete';
  changes: { field: string; from?: unknown; to?: unknown }[];
  createdAt: string;
};

const FIELD_LABEL: Record<string, string> = {
  type: '類型',
  category: '分類',
  amount: '金額',
  date: '日期',
  note: '備註',
};

function formatLogValue(field: string, value: unknown) {
  if (value === undefined || value === null || value === '') return '(空白)';
  if (field === 'type') return value === 'income' ? '收入' : '支出';
  if (field === 'date') return String(value).slice(0, 10);
  return String(value);
}

const EMPTY_FORM: FormState = {
  type: 'expense',
  category: '',
  amount: '',
  date: new Date().toISOString().slice(0, 10),
  note: '',
};

function formatMoney(n: number) {
  return n.toLocaleString('zh-TW');
}

export default function TransactionsPage() {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);
  const [savingEdit, setSavingEdit] = useState(false);

  const [logOpenId, setLogOpenId] = useState<string | null>(null);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [logLoading, setLogLoading] = useState(false);

  const [showNewUser, setShowNewUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [userError, setUserError] = useState('');

  async function loadUsers(selectId?: string) {
    try {
      const res = await fetch('/api/users');
      const data: UserOption[] = await res.json();
      setUsers(data);
      if (selectId) {
        setSelectedUserId(selectId);
      } else if (data.length > 0 && !selectedUserId) {
        setSelectedUserId(data[0]._id);
      }
    } catch {
      setError('讀取使用者清單失敗');
    }
  }

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreateUser() {
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword) return;
    setCreatingUser(true);
    setUserError('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUserName.trim(),
          email: newUserEmail.trim(),
          password: newUserPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '新增使用者失敗');
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setShowNewUser(false);
      await loadUsers(data._id);
    } catch (err) {
      setUserError(err instanceof Error ? err.message : '新增使用者失敗');
    } finally {
      setCreatingUser(false);
    }
  }

  async function loadTransactions(userId: string) {
    if (!userId) {
      setTransactions([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/transactions?userId=${userId}&limit=100`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '讀取失敗');
      setTransactions(data.transactions);
    } catch (err) {
      setError(err instanceof Error ? err.message : '讀取失敗');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTransactions(selectedUserId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId]);

  async function handleCreate() {
    if (!selectedUserId || !form.category.trim() || !form.amount) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: selectedUserId,
          type: form.type,
          category: form.category.trim(),
          amount: Number(form.amount),
          date: form.date,
          note: form.note.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '新增失敗');
      setForm({ ...EMPTY_FORM, date: form.date });
      await loadTransactions(selectedUserId);
    } catch (err) {
      setError(err instanceof Error ? err.message : '新增失敗');
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(tx: TransactionItem) {
    setEditingId(tx._id);
    setEditForm({
      type: tx.type,
      category: tx.category,
      amount: String(tx.amount),
      date: tx.date.slice(0, 10),
      note: tx.note ?? '',
    });
  }

  async function handleSaveEdit(id: string) {
    setSavingEdit(true);
    setError('');
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: editForm.type,
          category: editForm.category.trim(),
          amount: Number(editForm.amount),
          date: editForm.date,
          note: editForm.note.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '更新失敗');
      setEditingId(null);
      await loadTransactions(selectedUserId);
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失敗');
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(id: string) {
    setError('');
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '刪除失敗');
      await loadTransactions(selectedUserId);
    } catch (err) {
      setError(err instanceof Error ? err.message : '刪除失敗');
    }
  }

  async function toggleLog(id: string) {
    if (logOpenId === id) {
      setLogOpenId(null);
      return;
    }
    setLogOpenId(id);
    setLogLoading(true);
    try {
      const res = await fetch(`/api/transactions/${id}/log`);
      const data = await res.json();
      setLogEntries(res.ok ? data : []);
    } catch {
      setLogEntries([]);
    } finally {
      setLogLoading(false);
    }
  }

  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  return (
    <main className="min-h-screen flex flex-col items-center gap-6 p-8 bg-gradient-to-br from-indigo-200 via-violet-400 to-indigo-700">
      <div className="flex flex-col items-center gap-1 mt-4">
        <h1
          className="text-4xl md:text-5xl font-extrabold text-white tracking-wide"
          style={{ textShadow: '0 2px 6px rgba(0,0,0,0.25), 0 0 24px rgba(255,255,255,0.5)' }}
        >
          記帳本
        </h1>
        <p className="text-white text-sm font-semibold" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.45)' }}>
          選擇使用者，記錄收支
        </p>
      </div>

      <div className="w-full max-w-2xl bg-white/95 backdrop-blur rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-600">選擇使用者</label>
            <button
              type="button"
              onClick={() => setShowNewUser((s) => !s)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              {showNewUser ? '取消新增' : '+ 新增使用者'}
            </button>
          </div>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-black text-sm outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          >
            {users.length === 0 && <option value="">目前沒有使用者</option>}
            {users.map((u) => (
              <option key={u._id} value={u._id}>
                {u.name}（{u.email}）
              </option>
            ))}
          </select>
        </div>

        {showNewUser && (
          <div className="flex flex-col gap-2 bg-indigo-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-600">新增使用者</p>
            <input
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="姓名"
              className="border border-gray-300 rounded-lg px-3 py-2 text-black text-sm outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            />
            <input
              type="email"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="email"
              className="border border-gray-300 rounded-lg px-3 py-2 text-black text-sm outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            />
            <input
              type="password"
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              placeholder="密碼（至少 6 個字元）"
              className="border border-gray-300 rounded-lg px-3 py-2 text-black text-sm outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            />
            {userError && <p className="text-xs text-red-500">{userError}</p>}
            <button
              onClick={handleCreateUser}
              disabled={creatingUser || !newUserName.trim() || !newUserEmail.trim() || !newUserPassword}
              className="w-full px-6 py-2 rounded-full bg-indigo-600 disabled:bg-gray-300 text-white font-semibold text-sm shadow hover:bg-indigo-700 transition-colors"
            >
              {creatingUser ? '新增中...' : '建立使用者'}
            </button>
          </div>
        )}

        {selectedUserId && (
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-emerald-50 py-3">
              <p className="text-[11px] text-emerald-600 font-semibold">總收入</p>
              <p className="text-lg font-bold text-emerald-700">${formatMoney(totalIncome)}</p>
            </div>
            <div className="rounded-xl bg-rose-50 py-3">
              <p className="text-[11px] text-rose-600 font-semibold">總支出</p>
              <p className="text-lg font-bold text-rose-700">${formatMoney(totalExpense)}</p>
            </div>
            <div className="rounded-xl bg-indigo-50 py-3">
              <p className="text-[11px] text-indigo-600 font-semibold">結餘</p>
              <p className="text-lg font-bold text-indigo-700">${formatMoney(balance)}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-600">新增一筆記帳</p>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as 'income' | 'expense' })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-black text-sm outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            >
              <option value="expense">支出</option>
              <option value="income">收入</option>
            </select>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-black text-sm outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="分類，例如：餐飲"
              className="border border-gray-300 rounded-lg px-3 py-2 text-black text-sm outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <input
              type="number"
              min={0}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="金額"
              className="border border-gray-300 rounded-lg px-3 py-2 text-black text-sm outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="備註（選填）"
              className="col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-black text-sm outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={submitting || !selectedUserId || !form.category.trim() || !form.amount}
            className="w-full px-6 py-2.5 rounded-full bg-indigo-600 disabled:bg-gray-300 text-white font-bold shadow hover:bg-indigo-700 transition-colors"
          >
            {submitting ? '新增中...' : '新增紀錄'}
          </button>
        </div>

        {error && <p className="text-center text-red-500 text-sm">{error}</p>}

        <div className="flex flex-col gap-2 border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-600">
            記帳紀錄{loading && '（讀取中...）'}
          </p>
          {transactions.length === 0 && !loading && (
            <p className="text-center text-gray-400 text-sm py-6">目前沒有任何紀錄</p>
          )}
          <div className="flex flex-col gap-2">
            {transactions.map((tx) => (
              <div key={tx._id} className="border border-gray-200 rounded-xl p-3">
                {editingId === tx._id ? (
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={editForm.type}
                        onChange={(e) => setEditForm({ ...editForm, type: e.target.value as 'income' | 'expense' })}
                        className="border border-gray-300 rounded-lg px-2 py-1.5 text-black text-sm outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                      >
                        <option value="expense">支出</option>
                        <option value="income">收入</option>
                      </select>
                      <input
                        type="date"
                        value={editForm.date}
                        onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                        className="border border-gray-300 rounded-lg px-2 py-1.5 text-black text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                      <input
                        value={editForm.category}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        className="border border-gray-300 rounded-lg px-2 py-1.5 text-black text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                      <input
                        type="number"
                        min={0}
                        value={editForm.amount}
                        onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                        className="border border-gray-300 rounded-lg px-2 py-1.5 text-black text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                      <input
                        value={editForm.note}
                        onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                        placeholder="備註"
                        className="col-span-2 border border-gray-300 rounded-lg px-2 py-1.5 text-black text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1 rounded-full text-xs font-semibold text-gray-500 hover:bg-gray-100"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => handleSaveEdit(tx._id)}
                        disabled={savingEdit}
                        className="px-3 py-1 rounded-full text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        {savingEdit ? '儲存中...' : '儲存'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          tx.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {tx.type === 'income' ? '收入' : '支出'}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {tx.category}
                          {tx.note && <span className="text-gray-400 font-normal"> ・ {tx.note}</span>}
                        </p>
                        <p className="text-[11px] text-gray-400">{tx.date.slice(0, 10)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`text-sm font-bold ${
                          tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '-'}${formatMoney(tx.amount)}
                      </span>
                      <button
                        onClick={() => startEdit(tx)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                      >
                        編輯
                      </button>
                      <button
                        onClick={() => toggleLog(tx._id)}
                        className="text-xs font-semibold text-gray-500 hover:text-gray-700"
                      >
                        {logOpenId === tx._id ? '收合紀錄' : '紀錄'}
                      </button>
                      <button
                        onClick={() => handleDelete(tx._id)}
                        className="text-xs font-semibold text-red-500 hover:text-red-600"
                      >
                        刪除
                      </button>
                    </div>
                  </div>
                )}

                {logOpenId === tx._id && (
                  <div className="mt-3 border-t border-gray-100 pt-3 flex flex-col gap-2">
                    {logLoading && <p className="text-xs text-gray-400">讀取中...</p>}
                    {!logLoading && logEntries.length === 0 && (
                      <p className="text-xs text-gray-400">沒有異動紀錄</p>
                    )}
                    {!logLoading &&
                      logEntries.map((entry) => (
                        <div key={entry._id} className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                          <div className="flex items-center justify-between">
                            <span
                              className={`font-bold ${
                                entry.action === 'create'
                                  ? 'text-emerald-600'
                                  : entry.action === 'delete'
                                    ? 'text-red-500'
                                    : 'text-indigo-600'
                              }`}
                            >
                              {entry.action === 'create' ? '建立' : entry.action === 'delete' ? '刪除' : '修改'}
                            </span>
                            <span className="text-gray-400">
                              {new Date(entry.createdAt).toLocaleString('zh-TW')}
                            </span>
                          </div>
                          {entry.action === 'update' && entry.changes.length > 0 && (
                            <ul className="mt-1 space-y-0.5">
                              {entry.changes.map((c, i) => (
                                <li key={i}>
                                  {FIELD_LABEL[c.field] ?? c.field}：
                                  <span className="line-through text-gray-400 mx-1">
                                    {formatLogValue(c.field, c.from)}
                                  </span>
                                  →
                                  <span className="ml-1 font-semibold text-gray-700">
                                    {formatLogValue(c.field, c.to)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
