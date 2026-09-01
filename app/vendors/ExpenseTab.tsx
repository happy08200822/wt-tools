'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Category = { _id: string; name: string };
type Vendor = {
  _id: string;
  name: string;
  category?: { _id: string; name: string } | null;
  receiptCount: number;
  totalSpend: number;
};

const UNCATEGORIZED = '__uncategorized__';

export default function ExpenseTab() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [newName, setNewName] = useState('');
  const [newCategoryId, setNewCategoryId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [newCategoryName, setNewCategoryName] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  function loadAll() {
    setLoading(true);
    Promise.all([
      fetch('/api/vendors').then((res) => (res.ok ? res.json() : [])),
      fetch('/api/categories').then((res) => (res.ok ? res.json() : [])),
    ])
      .then(([v, c]) => {
        setVendors(Array.isArray(v) ? v : []);
        setCategories(Array.isArray(c) ? c : []);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleAddCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    setSavingCategory(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '新增失敗');
      setCategories((c) => [...c, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCategoryName('');
    } catch (err) {
      alert(err instanceof Error ? err.message : '新增失敗');
    } finally {
      setSavingCategory(false);
    }
  }

  async function handleAddVendor() {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, categoryId: newCategoryId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '新增失敗');
      setVendors((v) => [...v, data]);
      setNewName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '新增失敗');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(v: Vendor) {
    setEditingId(v._id);
    setEditName(v.name);
    setEditCategoryId(v.category?._id ?? '');
    setEditError('');
  }

  async function saveEdit(vendorId: string) {
    const name = editName.trim();
    if (!name) {
      setEditError('名稱不能是空的');
      return;
    }
    setEditSaving(true);
    setEditError('');
    try {
      const res = await fetch(`/api/vendors/${vendorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, categoryId: editCategoryId || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '更新失敗');
      setVendors((vs) => vs.map((v) => (v._id === vendorId ? { ...v, ...data } : v)));
      setEditingId(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : '更新失敗');
    } finally {
      setEditSaving(false);
    }
  }

  const groups = new Map<string, { label: string; vendors: Vendor[] }>();
  for (const cat of categories) {
    groups.set(cat._id, { label: cat.name, vendors: [] });
  }
  groups.set(UNCATEGORIZED, { label: '未分類', vendors: [] });
  for (const v of vendors) {
    const key = v.category?._id ?? UNCATEGORIZED;
    if (!groups.has(key)) groups.set(key, { label: v.category?.name ?? '未分類', vendors: [] });
    groups.get(key)!.vendors.push(v);
  }

  return (
    <div className="w-full max-w-xl flex flex-col items-center gap-6">
      <div className="w-full bg-white rounded-3xl p-6 shadow-lg border border-gray-200 flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1.5">新增廠商</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddVendor()}
              placeholder="廠商名稱"
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white placeholder:text-gray-400"
            />
            <select
              value={newCategoryId}
              onChange={(e) => setNewCategoryId(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white"
            >
              <option value="">未分類</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleAddVendor}
              disabled={!newName.trim() || saving}
              className="px-5 py-2 rounded-lg bg-amber-600 disabled:bg-gray-300 text-white text-sm font-semibold whitespace-nowrap"
            >
              {saving ? '新增中...' : '新增廠商'}
            </button>
          </div>
          {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-500 mb-1.5">新增分類</p>
          <div className="flex gap-2">
            <input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
              placeholder="例如：食材、飲品、耗材"
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white placeholder:text-gray-400"
            />
            <button
              onClick={handleAddCategory}
              disabled={!newCategoryName.trim() || savingCategory}
              className="px-5 py-2 rounded-lg bg-gray-700 disabled:bg-gray-300 text-white text-sm font-semibold whitespace-nowrap"
            >
              {savingCategory ? '新增中...' : '新增分類'}
            </button>
          </div>
        </div>
      </div>

      <div className="w-full flex flex-col gap-5">
        {loading && <p className="text-center text-gray-400 py-6">載入中...</p>}
        {!loading && vendors.length === 0 && (
          <p className="text-center text-gray-400 py-6">還沒有任何廠商，先在上面新增一個吧</p>
        )}

        {!loading &&
          Array.from(groups.entries())
            .filter(([, g]) => g.vendors.length > 0)
            .map(([key, g]) => (
              <div key={key} className="flex flex-col gap-2">
                <p className="text-xs font-bold text-gray-400 tracking-wide uppercase px-1">{g.label}</p>
                {g.vendors.map((v) =>
                  editingId === v._id ? (
                    <div key={v._id} className="bg-white rounded-2xl shadow-lg border-2 border-amber-300 p-4 flex flex-col gap-2">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-900 bg-white"
                        />
                        <select
                          value={editCategoryId}
                          onChange={(e) => setEditCategoryId(e.target.value)}
                          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-900 bg-white"
                        >
                          <option value="">未分類</option>
                          {categories.map((c) => (
                            <option key={c._id} value={c._id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      {editError && <p className="text-red-500 text-xs">{editError}</p>}
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(v._id)}
                          disabled={editSaving}
                          className="flex-1 py-1.5 rounded-full bg-amber-600 disabled:bg-gray-300 text-white text-sm font-semibold"
                        >
                          {editSaving ? '儲存中...' : '儲存'}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          disabled={editSaving}
                          className="px-4 py-1.5 rounded-full bg-gray-100 text-gray-500 text-sm font-semibold"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={v._id}
                      className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 flex items-center justify-between gap-3 hover:border-amber-300 transition-colors"
                    >
                      <Link href={`/vendors/${v._id}`} className="flex-1 min-w-0">
                        <span className="font-bold text-gray-800">{v.name}</span>
                      </Link>
                      <span className="text-sm text-gray-400 shrink-0">
                        {v.receiptCount} 筆・NT${v.totalSpend.toLocaleString()}
                      </span>
                      <button
                        onClick={() => startEdit(v)}
                        className="shrink-0 text-gray-300 hover:text-amber-600 text-sm px-1"
                        aria-label="編輯廠商"
                      >
                        ✎
                      </button>
                    </div>
                  )
                )}
              </div>
            ))}
      </div>
    </div>
  );
}
