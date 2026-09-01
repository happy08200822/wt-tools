'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { resizeImageForUpload } from '@/app/lib/imageResize';
import { currentMonth, shiftMonth, formatMonthLabel } from '@/app/lib/monthUtils';
import ImageModal from '../ImageModal';

type Item = { name: string; unitPrice: number; unit: string; quantity: number; itemTotal: number };
type Usage = { inputTokens: number; outputTokens: number; costUsd: number };

// 剛辨識完、還沒存檔的草稿
type Draft = {
  id: string;
  fileName: string;
  file: File | null;
  date: string;
  receiptTotal: number;
  items: Item[];
  usage?: Usage;
  error?: string;
  saving?: boolean;
};

// 已經存進資料庫的紀錄
type SavedReceipt = {
  _id: string;
  date: string;
  receiptTotal: number;
  imageUrl: string;
  items: Item[];
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  createdAt: string;
};


export default function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [vendorName, setVendorName] = useState('');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState('');

  const [monthFilter, setMonthFilter] = useState<string>(currentMonth());
  const [saved, setSaved] = useState<SavedReceipt[]>([]);
  const [savedLoading, setSavedLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState('');
  const [importError, setImportError] = useState('');

  useEffect(() => {
    fetch('/api/vendors')
      .then((res) => (res.ok ? res.json() : []))
      .then((list: { _id: string; name: string }[]) => {
        const v = list.find((x) => x._id === id);
        if (v) setVendorName(v.name);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    loadSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, monthFilter]);

  function loadSaved() {
    setSavedLoading(true);
    const query = monthFilter === 'all' ? '' : `?month=${monthFilter}`;
    fetch(`/api/vendors/${id}/receipts${query}`)
      .then((res) => (res.ok ? res.json() : { items: [], hasMore: false }))
      .then((data: { items: SavedReceipt[]; hasMore: boolean }) => {
        setSaved(data.items ?? []);
        setHasMore(data.hasMore ?? false);
      })
      .finally(() => setSavedLoading(false));
  }

  async function loadMore() {
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/vendors/${id}/receipts?skip=${saved.length}`);
      const data: { items: SavedReceipt[]; hasMore: boolean } = await res.json();
      setSaved((s) => [...s, ...data.items]);
      setHasMore(data.hasMore);
    } finally {
      setLoadingMore(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    setError('');
    handleScan(picked);
    e.target.value = '';
  }

  async function handleScan(files: File[]) {
    setUploading(true);
    setError('');
    setProgress({ done: 0, total: files.length });

    const results: Draft[] = [];
    for (const file of files) {
      const draftId = `${file.name}-${Date.now()}-${Math.random()}`;
      try {
        const uploadFile = await resizeImageForUpload(file);
        const formData = new FormData();
        formData.append('file', uploadFile);
        const res = await fetch('/api/receipts', { method: 'POST', body: formData });

        let data: {
          error?: string;
          date?: string;
          receiptTotal?: number;
          items?: Item[];
          usage?: Usage;
        };
        try {
          data = await res.json();
        } catch {
          throw new Error(res.status === 413 ? '照片太大，請重新拍攝或裁切後再試' : `伺服器錯誤（HTTP ${res.status}）`);
        }

        if (!res.ok || !data.date || !data.items) throw new Error(data.error || '辨識失敗');
        results.push({
          id: draftId,
          fileName: file.name,
          file: uploadFile,
          date: data.date,
          receiptTotal: data.receiptTotal ?? 0,
          items: data.items,
          usage: data.usage,
        });
      } catch (err) {
        results.push({
          id: draftId,
          fileName: file.name,
          file: null,
          date: '',
          receiptTotal: 0,
          items: [],
          error: err instanceof Error ? err.message : '辨識失敗',
        });
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }

    setDrafts((prev) => [...results, ...prev]);
    setUploading(false);
  }

  function updateDraftField(draftId: string, path: 'date' | 'receiptTotal', value: string) {
    setDrafts((ds) =>
      ds.map((d) => (d.id === draftId ? { ...d, [path]: path === 'receiptTotal' ? Number(value) || 0 : value } : d))
    );
  }

  function updateDraftItem(draftId: string, index: number, field: keyof Item, value: string) {
    setDrafts((ds) =>
      ds.map((d) => {
        if (d.id !== draftId) return d;
        const items = [...d.items];
        const isNumeric = field === 'unitPrice' || field === 'quantity' || field === 'itemTotal';
        items[index] = { ...items[index], [field]: isNumeric ? Number(value) || 0 : value };
        return { ...d, items };
      })
    );
  }

  function removeDraftItem(draftId: string, index: number) {
    setDrafts((ds) => ds.map((d) => (d.id === draftId ? { ...d, items: d.items.filter((_, i) => i !== index) } : d)));
  }

  function addDraftItem(draftId: string) {
    setDrafts((ds) =>
      ds.map((d) =>
        d.id === draftId ? { ...d, items: [...d.items, { name: '', unitPrice: 0, unit: '', quantity: 0, itemTotal: 0 }] } : d
      )
    );
  }

  function addManualDraft() {
    const draftId = `manual-${Date.now()}-${Math.random()}`;
    setDrafts((prev) => [
      {
        id: draftId,
        fileName: '手動輸入（沒有照片）',
        file: null,
        date: new Date().toISOString().slice(0, 10),
        receiptTotal: 0,
        items: [{ name: '', unitPrice: 0, unit: '', quantity: 0, itemTotal: 0 }],
      },
      ...prev,
    ]);
  }

  function discardDraft(draftId: string) {
    setDrafts((ds) => ds.filter((d) => d.id !== draftId));
  }

  async function saveDraft(draftId: string) {
    const draft = drafts.find((d) => d.id === draftId);
    if (!draft) return;

    setDrafts((ds) => ds.map((d) => (d.id === draftId ? { ...d, saving: true } : d)));
    try {
      const formData = new FormData();
      if (draft.file) formData.append('file', draft.file);
      formData.append(
        'data',
        JSON.stringify({ date: draft.date, receiptTotal: draft.receiptTotal, items: draft.items, usage: draft.usage })
      );
      const res = await fetch(`/api/vendors/${id}/receipts`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '存檔失敗');

      // 存檔成功後，如果新紀錄的月份剛好是目前篩選的月份就加進畫面，不然不強行插入避免跟篩選條件矛盾
      if (monthFilter === 'all' || data.date?.startsWith(monthFilter)) {
        setSaved((s) => [data, ...s]);
      }
      discardDraft(draftId);
    } catch (err) {
      setError(err instanceof Error ? err.message : '存檔失敗');
      setDrafts((ds) => ds.map((d) => (d.id === draftId ? { ...d, saving: false } : d)));
    }
  }

  async function handleImportCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setImporting(true);
    setImportError('');
    setImportResult('');
    try {
      const csv = await file.text();
      const res = await fetch(`/api/vendors/${id}/receipts/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '匯入失敗');
      setImportResult(
        `匯入成功：${data.receiptCount} 張收據、${data.itemCount} 個品項` +
          (data.skippedRows > 0 ? `（略過 ${data.skippedRows} 列看不懂的資料）` : '')
      );
      loadSaved();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : '匯入失敗');
    } finally {
      setImporting(false);
    }
  }

  async function deleteSaved(receiptId: string) {
    if (!confirm('確定要刪除這筆紀錄嗎？')) return;
    setSaved((s) => s.filter((r) => r._id !== receiptId));
    try {
      await fetch(`/api/vendors/${id}/receipts/${receiptId}`, { method: 'DELETE' });
    } catch {
      loadSaved(); // 失敗的話重新載入，避免畫面跟資料庫不一致
    }
  }

  async function saveEdited(receiptId: string, edited: { date: string; receiptTotal: number; items: Item[] }): Promise<boolean> {
    try {
      const res = await fetch(`/api/vendors/${id}/receipts/${receiptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(edited),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '儲存失敗');
      setSaved((s) => s.map((r) => (r._id === receiptId ? data : r)));
      return true;
    } catch (err) {
      alert(err instanceof Error ? err.message : '儲存失敗');
      return false;
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center gap-6 p-6 bg-gray-100">
      <div className="flex flex-col items-center gap-1 mt-2">
        <Link href="/vendors" className="text-sm text-amber-600 hover:underline">
          ← 回廠商清單
        </Link>
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800">{vendorName || '廠商'}</h1>
        <p className="text-sm text-gray-500">
          上傳收據照片，AI 辨識後確認存檔到這個廠商的進貨紀錄
          <Link
            href={`/vendors/${id}/items?month=${monthFilter === 'all' ? currentMonth() : monthFilter}`}
            className="ml-2 text-amber-600 underline"
          >
            查看完整明細
          </Link>
        </p>
      </div>

      <div className="w-full max-w-xl bg-white rounded-3xl p-6 shadow-lg border border-gray-200 flex flex-col gap-4">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={handleFileChange}
          disabled={uploading}
          className="w-full text-sm text-gray-600 file:mr-3 file:px-4 file:py-2 file:rounded-full file:border-0 file:bg-amber-100 file:text-amber-700 file:text-sm file:font-semibold hover:file:bg-amber-200"
        />
        {uploading && (
          <p className="text-center text-sm text-gray-500">
            辨識中...（{progress.done}/{progress.total}）
          </p>
        )}
        {error && <p className="text-center text-red-500 text-sm">{error}</p>}

        <button onClick={addManualDraft} className="text-xs font-semibold text-gray-400 hover:text-gray-600 self-center">
          沒有收據照片？手動輸入一筆 →
        </button>

        <div className="border-t border-gray-100 pt-3 flex flex-col items-center gap-1.5">
          <label className="text-xs font-semibold text-gray-400 hover:text-gray-600 cursor-pointer">
            有舊資料想一次匯入？上傳 CSV（欄位跟匯出格式一致）
            <input type="file" accept=".csv,text/csv" onChange={handleImportCsv} disabled={importing} className="hidden" />
          </label>
          {importing && <p className="text-xs text-gray-400">匯入中...</p>}
          {importResult && <p className="text-xs text-emerald-600">{importResult}</p>}
          {importError && <p className="text-xs text-red-500">{importError}</p>}
        </div>
      </div>

      {drafts.map((draft) => (
        <DraftCard
          key={draft.id}
          draft={draft}
          onFieldChange={(path, value) => updateDraftField(draft.id, path, value)}
          onItemChange={(i, field, value) => updateDraftItem(draft.id, i, field, value)}
          onItemRemove={(i) => removeDraftItem(draft.id, i)}
          onItemAdd={() => addDraftItem(draft.id)}
          onDiscard={() => discardDraft(draft.id)}
          onSave={() => saveDraft(draft.id)}
        />
      ))}

      <div className="w-full max-w-2xl flex flex-col gap-3">
        <div className="flex items-center justify-between bg-white rounded-2xl shadow-lg border border-gray-200 px-4 py-2.5">
          <p className="text-sm font-bold text-gray-700">已存檔紀錄</p>
          {monthFilter === 'all' ? (
            <button
              onClick={() => setMonthFilter(currentMonth())}
              className="text-xs font-semibold text-amber-600 hover:underline"
            >
              目前顯示：全部（點此回到當月）
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMonthFilter((m) => shiftMonth(m, -1))}
                className="text-gray-400 hover:text-gray-700 px-1"
              >
                ←
              </button>
              <span className="text-sm font-semibold text-gray-700 w-24 text-center">
                {formatMonthLabel(monthFilter)}
              </span>
              <button
                onClick={() => setMonthFilter((m) => shiftMonth(m, 1))}
                className="text-gray-400 hover:text-gray-700 px-1"
              >
                →
              </button>
              <button onClick={() => setMonthFilter('all')} className="text-xs text-gray-400 hover:text-gray-600 ml-1">
                看全部
              </button>
            </div>
          )}
        </div>

        {savedLoading && <p className="text-center text-gray-400 text-sm py-6">載入中...</p>}
        {!savedLoading && saved.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-6">
            {monthFilter === 'all' ? '還沒有存過任何紀錄' : '這個月還沒有任何紀錄'}
          </p>
        )}
        {saved.map((r) => (
          <SavedCard key={r._id} receipt={r} onSave={(edited) => saveEdited(r._id, edited)} onDelete={() => deleteSaved(r._id)} />
        ))}

        {monthFilter === 'all' && hasMore && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="w-full py-2.5 rounded-xl bg-white border border-gray-200 shadow text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            {loadingMore ? '載入中...' : '載入更多'}
          </button>
        )}
      </div>
    </main>
  );
}

function DraftCard({
  draft,
  onFieldChange,
  onItemChange,
  onItemRemove,
  onItemAdd,
  onDiscard,
  onSave,
}: {
  draft: Draft;
  onFieldChange: (path: 'date' | 'receiptTotal', value: string) => void;
  onItemChange: (index: number, field: keyof Item, value: string) => void;
  onItemRemove: (index: number) => void;
  onItemAdd: () => void;
  onDiscard: () => void;
  onSave: () => void;
}) {
  if (draft.error) {
    return (
      <div className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-lg border border-gray-200">
        <p className="text-sm font-semibold text-gray-700 truncate">{draft.fileName}</p>
        <p className="text-sm text-red-500 mt-2">辨識失敗：{draft.error}</p>
        <button onClick={onDiscard} className="mt-2 text-xs text-gray-400 hover:text-gray-600">
          關閉
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-lg border-2 border-amber-300 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400 truncate">{draft.fileName}</p>
        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">尚未存檔</span>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[140px]">
          <label className="text-xs font-semibold text-gray-500">日期</label>
          <input
            value={draft.date}
            onChange={(e) => onFieldChange('date', e.target.value)}
            className="w-full mt-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-900 bg-white"
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="text-xs font-semibold text-gray-500">單據總額</label>
          <input
            value={draft.receiptTotal}
            onChange={(e) => onFieldChange('receiptTotal', e.target.value)}
            inputMode="decimal"
            className="w-full mt-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-900 bg-white"
          />
        </div>
      </div>

      <ItemsTable items={draft.items} onItemChange={onItemChange} onItemRemove={onItemRemove} />

      <button onClick={onItemAdd} className="self-start text-xs font-semibold text-amber-600 hover:text-amber-700">
        ＋ 新增品項
      </button>

      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={draft.saving}
          className="flex-1 px-8 py-3 rounded-full bg-amber-600 disabled:bg-gray-300 text-white font-bold shadow-lg hover:bg-amber-700 transition-colors"
        >
          {draft.saving ? '存檔中...' : '✅ 確認存檔'}
        </button>
        <button
          onClick={onDiscard}
          disabled={draft.saving}
          className="px-5 py-3 rounded-full bg-gray-100 text-gray-500 font-semibold hover:bg-gray-200"
        >
          放棄
        </button>
      </div>

      {draft.usage && (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
          <span>輸入 {draft.usage.inputTokens.toLocaleString()} tokens</span>
          <span>輸出 {draft.usage.outputTokens.toLocaleString()} tokens</span>
          <span>
            預估花費：${draft.usage.costUsd.toFixed(4)} USD（約 NT${(draft.usage.costUsd * 31.5).toFixed(1)}）
          </span>
        </div>
      )}
    </div>
  );
}

type CardMode = 'collapsed' | 'view' | 'edit';

function SavedCard({
  receipt,
  onSave,
  onDelete,
}: {
  receipt: SavedReceipt;
  onSave: (edited: { date: string; receiptTotal: number; items: Item[] }) => Promise<boolean>;
  onDelete: () => void;
}) {
  const [mode, setMode] = useState<CardMode>('collapsed');
  const [draftDate, setDraftDate] = useState(receipt.date);
  const [draftTotal, setDraftTotal] = useState(receipt.receiptTotal);
  const [draftItems, setDraftItems] = useState<Item[]>(receipt.items);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [showImage, setShowImage] = useState(false);

  function enterEdit() {
    setDraftDate(receipt.date);
    setDraftTotal(receipt.receiptTotal);
    setDraftItems(receipt.items);
    setMode('edit');
  }

  function cancelEdit() {
    setMode('view');
  }

  function updateItem(index: number, field: keyof Item, value: string) {
    const isNumeric = field === 'unitPrice' || field === 'quantity' || field === 'itemTotal';
    setDraftItems((items) => items.map((it, i) => (i === index ? { ...it, [field]: isNumeric ? Number(value) || 0 : value } : it)));
  }

  function removeItem(index: number) {
    setDraftItems((items) => items.filter((_, i) => i !== index));
  }

  function addItem() {
    setDraftItems((items) => [...items, { name: '', unitPrice: 0, unit: '', quantity: 0, itemTotal: 0 }]);
  }

  async function handleSaveEdit() {
    setSaving(true);
    const ok = await onSave({ date: draftDate, receiptTotal: draftTotal, items: draftItems });
    setSaving(false);
    if (ok) {
      setMode('view');
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200">
      <button
        onClick={() => setMode(mode === 'collapsed' ? 'view' : 'collapsed')}
        className="w-full flex items-center justify-between gap-3 text-left p-4"
      >
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-800">
            {receipt.date}
            {justSaved && <span className="ml-2 text-xs font-semibold text-emerald-600">已儲存</span>}
          </p>
          <p className="text-xs text-gray-400">{receipt.items.length} 個品項</p>
        </div>
        <span className="text-sm font-bold text-amber-600 shrink-0">NT${receipt.receiptTotal.toLocaleString()}</span>
      </button>

      {mode === 'view' && (
        <div className="px-4 pb-4 flex flex-col gap-3 border-t border-gray-100 pt-3">
          {receipt.imageUrl && (
            <button
              onClick={() => setShowImage(true)}
              className="self-start text-xs text-amber-600 underline hover:text-amber-700"
            >
              查看原始照片
            </button>
          )}

          <ReadOnlyItemsTable items={receipt.items} />

          <div className="flex gap-2 pt-1">
            <button
              onClick={enterEdit}
              className="flex-1 py-2 rounded-full bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200"
            >
              編輯
            </button>
            <button
              onClick={onDelete}
              className="px-4 py-2 rounded-full bg-red-50 text-red-500 text-sm font-semibold hover:bg-red-100"
            >
              刪除
            </button>
          </div>
        </div>
      )}

      {mode === 'edit' && (
        <div className="px-4 pb-4 flex flex-col gap-3 border-t border-gray-100 pt-3">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[120px]">
              <label className="text-xs font-semibold text-gray-500">日期</label>
              <input
                value={draftDate}
                onChange={(e) => setDraftDate(e.target.value)}
                className="w-full mt-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-900 bg-white"
              />
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="text-xs font-semibold text-gray-500">單據總額</label>
              <input
                value={draftTotal}
                onChange={(e) => setDraftTotal(Number(e.target.value) || 0)}
                inputMode="decimal"
                className="w-full mt-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-900 bg-white"
              />
            </div>
          </div>

          <ItemsTable items={draftItems} onItemChange={updateItem} onItemRemove={removeItem} />

          <button onClick={addItem} className="self-start text-xs font-semibold text-amber-600 hover:text-amber-700">
            ＋ 新增品項
          </button>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSaveEdit}
              disabled={saving}
              className="flex-1 py-2.5 rounded-full bg-amber-600 disabled:bg-gray-300 text-white text-sm font-bold hover:bg-amber-700"
            >
              {saving ? '儲存中...' : '儲存修改'}
            </button>
            <button
              onClick={cancelEdit}
              disabled={saving}
              className="px-4 py-2.5 rounded-full bg-gray-100 text-gray-500 text-sm font-semibold hover:bg-gray-200"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {showImage && receipt.imageUrl && (
        <ImageModal src={receipt.imageUrl} onClose={() => setShowImage(false)} />
      )}
    </div>
  );
}

function ReadOnlyItemsTable({ items }: { items: Item[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-400">
            <th className="pb-2">品項</th>
            <th className="pb-2 w-16 text-right">單價</th>
            <th className="pb-2 w-14">單位</th>
            <th className="pb-2 w-14 text-right">數量</th>
            <th className="pb-2 w-16 text-right">總額</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-t border-gray-100">
              <td className="py-1.5 pr-1 text-gray-800">{item.name}</td>
              <td className="py-1.5 pr-1 text-gray-600 text-right">{item.unitPrice}</td>
              <td className="py-1.5 pr-1 text-gray-600">{item.unit}</td>
              <td className="py-1.5 pr-1 text-gray-600 text-right">{item.quantity}</td>
              <td className="py-1.5 pr-1 text-gray-800 font-semibold text-right">${item.itemTotal.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ItemsTable({
  items,
  onItemChange,
  onItemRemove,
}: {
  items: Item[];
  onItemChange: (index: number, field: keyof Item, value: string) => void;
  onItemRemove?: (index: number) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-400">
            <th className="pb-2">品項</th>
            <th className="pb-2 w-20">單價</th>
            <th className="pb-2 w-16">單位</th>
            <th className="pb-2 w-16">數量</th>
            <th className="pb-2 w-20">總額</th>
            {onItemRemove && <th className="pb-2 w-8"></th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-t border-gray-100">
              <td className="py-1 pr-1">
                <input
                  value={item.name}
                  onChange={(e) => onItemChange(i, 'name', e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded px-2 py-1 text-gray-900 bg-white"
                />
              </td>
              <td className="py-1 pr-1">
                <input
                  value={item.unitPrice}
                  onChange={(e) => onItemChange(i, 'unitPrice', e.target.value)}
                  inputMode="decimal"
                  className="w-full text-sm border border-gray-200 rounded px-2 py-1 text-gray-900 bg-white"
                />
              </td>
              <td className="py-1 pr-1">
                <input
                  value={item.unit}
                  onChange={(e) => onItemChange(i, 'unit', e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded px-2 py-1 text-gray-900 bg-white"
                />
              </td>
              <td className="py-1 pr-1">
                <input
                  value={item.quantity}
                  onChange={(e) => onItemChange(i, 'quantity', e.target.value)}
                  inputMode="decimal"
                  className="w-full text-sm border border-gray-200 rounded px-2 py-1 text-gray-900 bg-white"
                />
              </td>
              <td className="py-1 pr-1">
                <input
                  value={item.itemTotal}
                  onChange={(e) => onItemChange(i, 'itemTotal', e.target.value)}
                  inputMode="decimal"
                  className="w-full text-sm border border-gray-200 rounded px-2 py-1 text-gray-900 bg-white"
                />
              </td>
              {onItemRemove && (
                <td className="py-1">
                  <button onClick={() => onItemRemove(i)} className="text-gray-300 hover:text-red-500 text-xs px-1">
                    ✕
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
