'use client';

import { useEffect, useMemo, useState } from 'react';

type Status =
  | 'new'
  | 'friended'
  | 'messaged'
  | 'replied'
  | 'demo_scheduled'
  | 'demoed'
  | 'won'
  | 'rejected'
  | 'no_reply'
  | 'unreachable';

type IntentLevel = '' | 'high' | 'medium' | 'low';

type Lead = {
  _id: string;
  name: string;
  category: string;
  address: string;
  ownerName: string;
  phone: string;
  email: string;
  lineId: string;
  lineUrl: string;
  igUrl: string;
  fbUrl: string;
  status: Status;
  intentLevel: IntentLevel;
  companyStatus: string;
  note: string;
  createdAt: string;
};

type FormState = {
  name: string;
  category: string;
  address: string;
  ownerName: string;
  phone: string;
  email: string;
  lineId: string;
  lineUrl: string;
  igUrl: string;
  fbUrl: string;
  companyStatus: string;
  note: string;
};

// messaged 沿用舊的欄位值，但語意改成「聯絡中」，避免既有資料的狀態值失效
const STATUS_META: Record<Status, { label: string; badge: string }> = {
  new: { label: '未聯繫', badge: 'bg-slate-100 text-slate-600' },
  friended: { label: '已加好友', badge: 'bg-sky-100 text-sky-700' },
  messaged: { label: '聯絡中', badge: 'bg-amber-100 text-amber-700' },
  replied: { label: '已回覆', badge: 'bg-indigo-100 text-indigo-700' },
  demo_scheduled: { label: '已約展', badge: 'bg-violet-100 text-violet-700' },
  demoed: { label: '已展示', badge: 'bg-cyan-100 text-cyan-700' },
  won: { label: '成交', badge: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: '拒絕', badge: 'bg-rose-100 text-rose-700' },
  no_reply: { label: '已讀不回', badge: 'bg-orange-100 text-orange-700' },
  unreachable: { label: '聯絡不到人', badge: 'bg-zinc-200 text-zinc-600' },
};

const STATUS_ORDER: Status[] = [
  'new',
  'friended',
  'messaged',
  'replied',
  'demo_scheduled',
  'demoed',
  'won',
  'rejected',
  'no_reply',
  'unreachable',
];

// 展示完之後才有意義的意願度評估，跟主進度分開存
const INTENT_META: Record<Exclude<IntentLevel, ''>, { label: string; badge: string }> = {
  high: { label: '意願度高', badge: 'bg-emerald-100 text-emerald-700' },
  medium: { label: '意願度中', badge: 'bg-amber-100 text-amber-700' },
  low: { label: '意願度低', badge: 'bg-rose-100 text-rose-700' },
};

// 只有走到「已展示」之後，評估意願度才有意義
const INTENT_ELIGIBLE_STATUSES: Status[] = ['demoed', 'won', 'rejected'];

// 自己追蹤的狀態 vs 公司表 AA欄狀態，兩邊看起來對不上時提醒去公司表手動改
// 先寫一版簡單的關鍵字比對，不準的話之後再調整
function isCompanyStatusStale(lead: Lead): boolean {
  if (!lead.companyStatus) return false;
  const cs = lead.companyStatus;
  switch (lead.status) {
    case 'demo_scheduled':
      return !cs.includes('約展');
    case 'demoed':
      return !cs.includes('展示') && !cs.includes('聯絡到');
    case 'won':
      return !cs.includes('成交');
    case 'rejected':
      return !cs.includes('拒絕') && !cs.includes('無效');
    default:
      return false;
  }
}

const EMPTY_FORM: FormState = {
  name: '',
  category: '',
  address: '',
  ownerName: '',
  phone: '',
  email: '',
  lineId: '',
  lineUrl: '',
  igUrl: '',
  fbUrl: '',
  companyStatus: '',
  note: '',
};

export default function BizLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');

  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const [showImportForm, setShowImportForm] = useState(false);
  const [importCsv, setImportCsv] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);
  const [savingEdit, setSavingEdit] = useState(false);

  async function loadLeads() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/biz-leads');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '讀取失敗');
      setLeads(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '讀取失敗');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLeads();
  }, []);

  async function handleCreate() {
    if (!form.name.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/biz-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '新增失敗');
      setForm(EMPTY_FORM);
      setShowAddForm(false);
      await loadLeads();
    } catch (err) {
      setError(err instanceof Error ? err.message : '新增失敗');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleImport() {
    if (!importCsv.trim()) return;
    setImporting(true);
    setError('');
    setImportResult('');
    try {
      const res = await fetch('/api/biz-leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: importCsv }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '匯入失敗');
      setImportResult(
        `新增 ${data.importedCount} 筆` +
          (data.updatedCount > 0 ? `，更新 ${data.updatedCount} 筆（電話號碼比對到既有名單）` : '') +
          (data.skippedRows > 0 ? `，略過 ${data.skippedRows} 筆（缺店名）` : '')
      );
      setImportCsv('');
      await loadLeads();
    } catch (err) {
      setError(err instanceof Error ? err.message : '匯入失敗');
    } finally {
      setImporting(false);
    }
  }

  async function handleStatusChange(id: string, status: Status) {
    setError('');
    try {
      const res = await fetch(`/api/biz-leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '更新失敗');
      setLeads((prev) => prev.map((l) => (l._id === id ? data : l)));
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失敗');
    }
  }

  async function handleIntentChange(id: string, intentLevel: IntentLevel) {
    setError('');
    try {
      const res = await fetch(`/api/biz-leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intentLevel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '更新失敗');
      setLeads((prev) => prev.map((l) => (l._id === id ? data : l)));
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失敗');
    }
  }

  function startEdit(lead: Lead) {
    setEditingId(lead._id);
    setEditForm({
      name: lead.name,
      category: lead.category,
      address: lead.address,
      ownerName: lead.ownerName,
      phone: lead.phone,
      email: lead.email,
      lineId: lead.lineId,
      lineUrl: lead.lineUrl,
      igUrl: lead.igUrl,
      fbUrl: lead.fbUrl,
      companyStatus: lead.companyStatus,
      note: lead.note,
    });
  }

  async function handleSaveEdit(id: string) {
    if (!editForm.name.trim()) return;
    setSavingEdit(true);
    setError('');
    try {
      const res = await fetch(`/api/biz-leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '更新失敗');
      setLeads((prev) => prev.map((l) => (l._id === id ? data : l)));
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失敗');
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(id: string) {
    setError('');
    try {
      const res = await fetch(`/api/biz-leads/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '刪除失敗');
      setLeads((prev) => prev.filter((l) => l._id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : '刪除失敗');
    }
  }

  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<Status, number>;
    for (const lead of leads) counts[lead.status] += 1;
    return counts;
  }, [leads]);

  const filteredLeads = useMemo(
    () => (statusFilter === 'all' ? leads : leads.filter((l) => l.status === statusFilter)),
    [leads, statusFilter]
  );

  const staleCount = useMemo(() => leads.filter(isCompanyStatusStale).length, [leads]);

  return (
    <main className="min-h-screen flex flex-col items-center gap-6 p-8 bg-gradient-to-br from-pink-200 via-rose-300 to-fuchsia-600">
      <div className="flex flex-col items-center gap-1 mt-4">
        <h1
          className="text-4xl md:text-5xl font-extrabold text-white tracking-wide"
          style={{ textShadow: '0 2px 6px rgba(0,0,0,0.25), 0 0 24px rgba(255,255,255,0.5)' }}
        >
          店家開發名單
        </h1>
        <p className="text-white text-sm font-semibold" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.45)' }}>
          整理美業店家的聯絡方式，追蹤業務開發進度
        </p>
      </div>

      <div className="w-full max-w-2xl bg-white/95 backdrop-blur rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-5">
        {staleCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-amber-700">
            ⚠️ 有 {staleCount} 筆的狀態跟公司表對不上，記得去公司表手動更新
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-600">共 {leads.length} 筆名單</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowImportForm((s) => !s)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              {showImportForm ? '取消匯入' : '📋 批次匯入'}
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm((s) => !s)}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700"
            >
              {showAddForm ? '取消新增' : '+ 新增店家'}
            </button>
          </div>
        </div>

        {showImportForm && (
          <div className="flex flex-col gap-2 bg-indigo-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-600">
              貼上表格資料（例如從 Excel/Google Sheets 複製），第一列要是標題
            </p>
            <p className="text-[11px] text-gray-400">
              標題可以用：店名、類別、地址、負責人姓名、電話、email、line_id、LINE、IG、FB、業務進度、備註（只有「店名」是必填）
            </p>
            <p className="text-[11px] text-gray-400">
              電話號碼比對到既有名單時，只會更新聯絡資訊跟「業務進度」，不會動到你自己追蹤的狀態
            </p>
            <textarea
              value={importCsv}
              onChange={(e) => setImportCsv(e.target.value)}
              placeholder={'店名,類別,地址,電話,LINE,IG,FB,備註\n測試髮廊,美髮,台中市西區OO路1號,04-1234567,,,,'}
              rows={5}
              className="border border-gray-300 rounded-lg px-3 py-2 text-black text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            />
            {importResult && <p className="text-xs text-emerald-600 font-semibold">{importResult}</p>}
            <button
              onClick={handleImport}
              disabled={importing || !importCsv.trim()}
              className="w-full px-6 py-2 rounded-full bg-indigo-600 disabled:bg-gray-300 text-white font-semibold text-sm shadow hover:bg-indigo-700 transition-colors"
            >
              {importing ? '匯入中...' : '開始匯入'}
            </button>
          </div>
        )}

        {showAddForm && (
          <div className="flex flex-col gap-2 bg-rose-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-600">新增店家</p>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="店名（必填）"
                className="col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-black text-sm outline-none focus:ring-2 focus:ring-rose-400 bg-white"
              />
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="類別，例如：美髮"
                className="border border-gray-300 rounded-lg px-3 py-2 text-black text-sm outline-none focus:ring-2 focus:ring-rose-400 bg-white"
              />
              <input
                value={form.ownerName}
                onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                placeholder="負責人姓名"
                className="border border-gray-300 rounded-lg px-3 py-2 text-black text-sm outline-none focus:ring-2 focus:ring-rose-400 bg-white"
              />
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="電話"
                className="border border-gray-300 rounded-lg px-3 py-2 text-black text-sm outline-none focus:ring-2 focus:ring-rose-400 bg-white"
              />
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email"
                className="border border-gray-300 rounded-lg px-3 py-2 text-black text-sm outline-none focus:ring-2 focus:ring-rose-400 bg-white"
              />
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="地址"
                className="col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-black text-sm outline-none focus:ring-2 focus:ring-rose-400 bg-white"
              />
              <input
                value={form.lineId}
                onChange={(e) => setForm({ ...form, lineId: e.target.value })}
                placeholder="LINE ID"
                className="border border-gray-300 rounded-lg px-3 py-2 text-black text-sm outline-none focus:ring-2 focus:ring-rose-400 bg-white"
              />
              <input
                value={form.lineUrl}
                onChange={(e) => setForm({ ...form, lineUrl: e.target.value })}
                placeholder="LINE 連結"
                className="border border-gray-300 rounded-lg px-3 py-2 text-black text-sm outline-none focus:ring-2 focus:ring-rose-400 bg-white"
              />
              <input
                value={form.igUrl}
                onChange={(e) => setForm({ ...form, igUrl: e.target.value })}
                placeholder="Instagram 連結"
                className="col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-black text-sm outline-none focus:ring-2 focus:ring-rose-400 bg-white"
              />
              <input
                value={form.fbUrl}
                onChange={(e) => setForm({ ...form, fbUrl: e.target.value })}
                placeholder="Facebook 連結"
                className="col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-black text-sm outline-none focus:ring-2 focus:ring-rose-400 bg-white"
              />
              <input
                value={form.companyStatus}
                onChange={(e) => setForm({ ...form, companyStatus: e.target.value })}
                placeholder="公司表狀態（選填）"
                className="col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-black text-sm outline-none focus:ring-2 focus:ring-rose-400 bg-white"
              />
              <textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="備註（選填）"
                rows={2}
                className="col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-black text-sm outline-none focus:ring-2 focus:ring-rose-400 bg-white"
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={submitting || !form.name.trim()}
              className="w-full px-6 py-2 rounded-full bg-rose-600 disabled:bg-gray-300 text-white font-semibold text-sm shadow hover:bg-rose-700 transition-colors"
            >
              {submitting ? '新增中...' : '加入名單'}
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              statusFilter === 'all' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            全部（{leads.length}）
          </button>
          {STATUS_ORDER.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                statusFilter === status ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {STATUS_META[status].label}（{statusCounts[status]}）
            </button>
          ))}
        </div>

        {error && <p className="text-center text-red-500 text-sm">{error}</p>}

        <div className="flex flex-col gap-2 border-t border-gray-100 pt-4">
          {loading && <p className="text-center text-gray-400 text-sm py-6">讀取中...</p>}
          {!loading && filteredLeads.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-6">目前沒有符合的名單</p>
          )}
          {filteredLeads.map((lead) => (
            <div key={lead._id} className="border border-gray-200 rounded-xl p-3">
              {editingId === lead._id ? (
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="店名"
                      className="col-span-2 border border-gray-300 rounded-lg px-2 py-1.5 text-black text-sm outline-none focus:ring-2 focus:ring-rose-400"
                    />
                    <input
                      value={editForm.category}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      placeholder="類別"
                      className="border border-gray-300 rounded-lg px-2 py-1.5 text-black text-sm outline-none focus:ring-2 focus:ring-rose-400"
                    />
                    <input
                      value={editForm.ownerName}
                      onChange={(e) => setEditForm({ ...editForm, ownerName: e.target.value })}
                      placeholder="負責人姓名"
                      className="border border-gray-300 rounded-lg px-2 py-1.5 text-black text-sm outline-none focus:ring-2 focus:ring-rose-400"
                    />
                    <input
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="電話"
                      className="border border-gray-300 rounded-lg px-2 py-1.5 text-black text-sm outline-none focus:ring-2 focus:ring-rose-400"
                    />
                    <input
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      placeholder="email"
                      className="border border-gray-300 rounded-lg px-2 py-1.5 text-black text-sm outline-none focus:ring-2 focus:ring-rose-400"
                    />
                    <input
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      placeholder="地址"
                      className="col-span-2 border border-gray-300 rounded-lg px-2 py-1.5 text-black text-sm outline-none focus:ring-2 focus:ring-rose-400"
                    />
                    <input
                      value={editForm.lineId}
                      onChange={(e) => setEditForm({ ...editForm, lineId: e.target.value })}
                      placeholder="LINE ID"
                      className="border border-gray-300 rounded-lg px-2 py-1.5 text-black text-sm outline-none focus:ring-2 focus:ring-rose-400"
                    />
                    <input
                      value={editForm.lineUrl}
                      onChange={(e) => setEditForm({ ...editForm, lineUrl: e.target.value })}
                      placeholder="LINE 連結"
                      className="border border-gray-300 rounded-lg px-2 py-1.5 text-black text-sm outline-none focus:ring-2 focus:ring-rose-400"
                    />
                    <input
                      value={editForm.igUrl}
                      onChange={(e) => setEditForm({ ...editForm, igUrl: e.target.value })}
                      placeholder="Instagram 連結"
                      className="col-span-2 border border-gray-300 rounded-lg px-2 py-1.5 text-black text-sm outline-none focus:ring-2 focus:ring-rose-400"
                    />
                    <input
                      value={editForm.fbUrl}
                      onChange={(e) => setEditForm({ ...editForm, fbUrl: e.target.value })}
                      placeholder="Facebook 連結"
                      className="col-span-2 border border-gray-300 rounded-lg px-2 py-1.5 text-black text-sm outline-none focus:ring-2 focus:ring-rose-400"
                    />
                    <input
                      value={editForm.companyStatus}
                      onChange={(e) => setEditForm({ ...editForm, companyStatus: e.target.value })}
                      placeholder="公司表狀態"
                      className="col-span-2 border border-gray-300 rounded-lg px-2 py-1.5 text-black text-sm outline-none focus:ring-2 focus:ring-rose-400"
                    />
                    <textarea
                      value={editForm.note}
                      onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                      placeholder="備註"
                      rows={2}
                      className="col-span-2 border border-gray-300 rounded-lg px-2 py-1.5 text-black text-sm outline-none focus:ring-2 focus:ring-rose-400"
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
                      onClick={() => handleSaveEdit(lead._id)}
                      disabled={savingEdit}
                      className="px-3 py-1 rounded-full text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700"
                    >
                      {savingEdit ? '儲存中...' : '儲存'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-gray-800">{lead.name}</p>
                        {lead.category && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {lead.category}
                          </span>
                        )}
                      </div>
                      {lead.address && <p className="text-xs text-gray-400 mt-0.5">{lead.address}</p>}
                      {lead.ownerName && <p className="text-xs text-gray-400">👤 {lead.ownerName}</p>}
                      {lead.phone && <p className="text-xs text-gray-400">☎️ {lead.phone}</p>}
                      {lead.email && <p className="text-xs text-gray-400">✉️ {lead.email}</p>}
                      {lead.lineId && <p className="text-xs text-gray-400">💬 {lead.lineId}</p>}
                      {lead.note && <p className="text-xs text-gray-500 mt-1">{lead.note}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <select
                        value={lead.status}
                        onChange={(e) => handleStatusChange(lead._id, e.target.value as Status)}
                        className={`text-[11px] font-bold rounded-full px-2 py-1 border-0 outline-none ${STATUS_META[lead.status].badge}`}
                      >
                        {STATUS_ORDER.map((status) => (
                          <option key={status} value={status}>
                            {STATUS_META[status].label}
                          </option>
                        ))}
                      </select>
                      {INTENT_ELIGIBLE_STATUSES.includes(lead.status) && (
                        <select
                          value={lead.intentLevel}
                          onChange={(e) => handleIntentChange(lead._id, e.target.value as IntentLevel)}
                          className={`text-[11px] font-semibold rounded-full px-2 py-1 border-0 outline-none ${
                            lead.intentLevel ? INTENT_META[lead.intentLevel].badge : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          <option value="">意願度未評估</option>
                          <option value="high">{INTENT_META.high.label}</option>
                          <option value="medium">{INTENT_META.medium.label}</option>
                          <option value="low">{INTENT_META.low.label}</option>
                        </select>
                      )}
                      {lead.companyStatus && (
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isCompanyStatusStale(lead)
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                          title="公司表 AA欄目前的值"
                        >
                          {isCompanyStatusStale(lead) ? '⚠️ ' : ''}公司表：{lead.companyStatus}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex gap-2 text-xs font-semibold">
                      {lead.lineUrl && (
                        <a
                          href={lead.lineUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 hover:text-emerald-700"
                        >
                          LINE
                        </a>
                      )}
                      {lead.igUrl && (
                        <a
                          href={lead.igUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-fuchsia-600 hover:text-fuchsia-700"
                        >
                          IG
                        </a>
                      )}
                      {lead.fbUrl && (
                        <a
                          href={lead.fbUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          FB
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => startEdit(lead)}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                      >
                        編輯
                      </button>
                      <button
                        onClick={() => handleDelete(lead._id)}
                        className="text-xs font-semibold text-red-500 hover:text-red-600"
                      >
                        刪除
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
