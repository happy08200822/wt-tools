'use client';

import { useEffect, useState } from 'react';
import { resizeImageForUpload } from '@/app/lib/imageResize';
import { currentMonth, shiftMonth, formatMonthLabel } from '@/app/lib/monthUtils';

type Usage = { inputTokens: number; outputTokens: number; costUsd: number };
type DraftEntry = { id: string; date: string; amount: number; selected: boolean };
type SavedEntry = { _id: string; date: string; amount: number };

export default function IncomeTab() {
  const [month, setMonth] = useState(currentMonth());
  const [saved, setSaved] = useState<SavedEntry[]>([]);
  const [savedTotal, setSavedTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [drafts, setDrafts] = useState<DraftEntry[]>([]);
  const [draftUsage, setDraftUsage] = useState<Usage | null>(null);
  const [savingDrafts, setSavingDrafts] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ done: 0, total: 0 });

  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10));
  const [manualAmount, setManualAmount] = useState('');
  const [savingManual, setSavingManual] = useState(false);
  const [manualError, setManualError] = useState('');

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState('');
  const [importError, setImportError] = useState('');

  function loadSaved() {
    setLoading(true);
    fetch(`/api/revenue?month=${month}`)
      .then((res) => (res.ok ? res.json() : { entries: [], total: 0 }))
      .then((data: { entries: SavedEntry[]; total: number }) => {
        setSaved(data.entries ?? []);
        setSavedTotal(data.total ?? 0);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    e.target.value = '';
    setScanError('');
    setScanning(true);

    const allEntries: DraftEntry[] = [];
    let usageSum: Usage = { inputTokens: 0, outputTokens: 0, costUsd: 0 };

    for (const file of picked) {
      try {
        const uploadFile = await resizeImageForUpload(file);
        const formData = new FormData();
        formData.append('file', uploadFile);
        const res = await fetch('/api/revenue/scan', { method: 'POST', body: formData });

        let data: { error?: string; entries?: { date: string; amount: number }[]; usage?: Usage };
        try {
          data = await res.json();
        } catch {
          throw new Error(res.status === 413 ? '截圖太大，請重新截圖後再試' : `伺服器錯誤（HTTP ${res.status}）`);
        }
        if (!res.ok || !data.entries) throw new Error(data.error || '辨識失敗');

        for (const entry of data.entries) {
          allEntries.push({ id: `${entry.date}-${Date.now()}-${Math.random()}`, date: entry.date, amount: entry.amount, selected: true });
        }
        if (data.usage) {
          usageSum = {
            inputTokens: usageSum.inputTokens + data.usage.inputTokens,
            outputTokens: usageSum.outputTokens + data.usage.outputTokens,
            costUsd: usageSum.costUsd + data.usage.costUsd,
          };
        }
      } catch (err) {
        setScanError(err instanceof Error ? err.message : '辨識失敗');
      }
    }

    allEntries.sort((a, b) => a.date.localeCompare(b.date));
    setDrafts((prev) => [...prev, ...allEntries]);
    setDraftUsage(usageSum.inputTokens > 0 ? usageSum : null);
    setScanning(false);
  }

  function toggleDraft(id: string) {
    setDrafts((ds) => ds.map((d) => (d.id === id ? { ...d, selected: !d.selected } : d)));
  }

  function updateDraft(id: string, field: 'date' | 'amount', value: string) {
    setDrafts((ds) =>
      ds.map((d) => (d.id === id ? { ...d, [field]: field === 'amount' ? Number(value) || 0 : value } : d))
    );
  }

  function removeDraft(id: string) {
    setDrafts((ds) => ds.filter((d) => d.id !== id));
  }

  function discardAllDrafts() {
    setDrafts([]);
    setDraftUsage(null);
    setScanError('');
  }

  async function confirmSaveDrafts() {
    const selected = drafts.filter((d) => d.selected);
    if (selected.length === 0) return;
    setSavingDrafts(true);
    setSaveProgress({ done: 0, total: selected.length });

    for (const d of selected) {
      try {
        await fetch('/api/revenue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: d.date, amount: d.amount }),
        });
      } catch {
        // 個別失敗不中斷，繼續存其他天
      }
      setSaveProgress((p) => ({ ...p, done: p.done + 1 }));
    }

    setSavingDrafts(false);
    discardAllDrafts();
    loadSaved();
  }

  async function handleSaveManual() {
    const amount = Number(manualAmount);
    if (!manualDate || !Number.isFinite(amount) || amount < 0) {
      setManualError('請輸入正確的日期跟金額');
      return;
    }
    setSavingManual(true);
    setManualError('');
    try {
      const res = await fetch('/api/revenue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: manualDate, amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '儲存失敗');
      setManualAmount('');
      if (data.date.startsWith(month)) loadSaved();
    } catch (err) {
      setManualError(err instanceof Error ? err.message : '儲存失敗');
    } finally {
      setSavingManual(false);
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
      const res = await fetch('/api/revenue/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '匯入失敗');
      setImportResult(
        `匯入成功：${data.importedCount} 天` + (data.skippedRows > 0 ? `（略過 ${data.skippedRows} 列看不懂的資料）` : '')
      );
      loadSaved();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : '匯入失敗');
    } finally {
      setImporting(false);
    }
  }

  async function deleteSaved(id: string) {
    if (!confirm('確定要刪除這筆營業額紀錄嗎？')) return;
    setSaved((entries) => entries.filter((e) => e._id !== id));
    try {
      await fetch(`/api/revenue/${id}`, { method: 'DELETE' });
      loadSaved();
    } catch {
      loadSaved();
    }
  }

  const selectedCount = drafts.filter((d) => d.selected).length;

  return (
    <div className="w-full max-w-xl flex flex-col items-center gap-6">
      <div className="w-full bg-white rounded-3xl p-6 shadow-lg border border-gray-200 flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1.5">上傳報表截圖（可一次多張，AI 會自動辨識每天的營業額）</p>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            disabled={scanning}
            className="w-full text-sm text-gray-600 file:mr-3 file:px-4 file:py-2 file:rounded-full file:border-0 file:bg-amber-100 file:text-amber-700 file:text-sm file:font-semibold hover:file:bg-amber-200"
          />
          {scanning && <p className="text-center text-sm text-gray-500 mt-2">辨識中...</p>}
          {scanError && <p className="text-center text-red-500 text-sm mt-2">{scanError}</p>}
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-500 mb-1.5">或手動登記單一天</p>
          <div className="flex gap-2">
            <input
              type="date"
              value={manualDate}
              onChange={(e) => setManualDate(e.target.value)}
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white"
            />
            <input
              value={manualAmount}
              onChange={(e) => setManualAmount(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveManual()}
              inputMode="decimal"
              placeholder="金額"
              className="w-28 text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white placeholder:text-gray-400"
            />
            <button
              onClick={handleSaveManual}
              disabled={savingManual}
              className="px-4 py-2 rounded-lg bg-gray-700 disabled:bg-gray-300 text-white text-sm font-semibold whitespace-nowrap"
            >
              {savingManual ? '儲存中...' : '儲存'}
            </button>
          </div>
          {manualError && <p className="text-red-500 text-xs mt-1.5">{manualError}</p>}
        </div>

        <div className="border-t border-gray-100 pt-4 flex flex-col items-start gap-1.5">
          <label className="text-xs font-semibold text-gray-500 hover:text-gray-700 cursor-pointer">
            有舊資料想一次匯入？上傳 CSV（欄位：日期／營業額）
            <input type="file" accept=".csv,text/csv" onChange={handleImportCsv} disabled={importing} className="hidden" />
          </label>
          {importing && <p className="text-xs text-gray-400">匯入中...</p>}
          {importResult && <p className="text-xs text-emerald-600">{importResult}</p>}
          {importError && <p className="text-xs text-red-500">{importError}</p>}
        </div>
      </div>

      {drafts.length > 0 && (
        <div className="w-full bg-white rounded-3xl p-6 shadow-lg border-2 border-amber-300 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-gray-700">辨識結果（{selectedCount}/{drafts.length} 筆已勾選）</p>
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">尚未存檔</span>
          </div>

          <div className="max-h-80 overflow-y-auto flex flex-col gap-1.5">
            {drafts.map((d) => (
              <div key={d.id} className="flex items-center gap-2">
                <input type="checkbox" checked={d.selected} onChange={() => toggleDraft(d.id)} />
                <input
                  value={d.date}
                  onChange={(e) => updateDraft(d.id, 'date', e.target.value)}
                  className="flex-1 text-sm border border-gray-200 rounded px-2 py-1 text-gray-900 bg-white"
                />
                <input
                  value={d.amount}
                  onChange={(e) => updateDraft(d.id, 'amount', e.target.value)}
                  inputMode="decimal"
                  className="w-24 text-sm border border-gray-200 rounded px-2 py-1 text-gray-900 bg-white text-right"
                />
                <button onClick={() => removeDraft(d.id)} className="text-gray-300 hover:text-red-500 text-xs px-1">
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={confirmSaveDrafts}
              disabled={savingDrafts || selectedCount === 0}
              className="flex-1 px-8 py-3 rounded-full bg-amber-600 disabled:bg-gray-300 text-white font-bold shadow-lg hover:bg-amber-700 transition-colors"
            >
              {savingDrafts ? `存檔中...（${saveProgress.done}/${saveProgress.total}）` : `✅ 確認存檔（${selectedCount} 筆）`}
            </button>
            <button
              onClick={discardAllDrafts}
              disabled={savingDrafts}
              className="px-5 py-3 rounded-full bg-gray-100 text-gray-500 font-semibold hover:bg-gray-200"
            >
              放棄
            </button>
          </div>

          {draftUsage && (
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
              <span>輸入 {draftUsage.inputTokens.toLocaleString()} tokens</span>
              <span>輸出 {draftUsage.outputTokens.toLocaleString()} tokens</span>
              <span>
                預估花費：${draftUsage.costUsd.toFixed(4)} USD（約 NT${(draftUsage.costUsd * 31.5).toFixed(1)}）
              </span>
            </div>
          )}
        </div>
      )}

      <div className="w-full flex items-center justify-center gap-3 bg-white rounded-2xl shadow-lg border border-gray-200 px-4 py-3">
        <button onClick={() => setMonth((m) => shiftMonth(m, -1))} className="text-gray-400 hover:text-gray-700 px-2">
          ←
        </button>
        <span className="text-base font-bold text-gray-800 w-28 text-center">{formatMonthLabel(month)}</span>
        <button onClick={() => setMonth((m) => shiftMonth(m, 1))} className="text-gray-400 hover:text-gray-700 px-2">
          →
        </button>
      </div>

      <div className="w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-gray-700">已存檔紀錄</p>
          <span className="text-sm font-bold text-amber-600">NT${savedTotal.toLocaleString()}</span>
        </div>
        {loading && <p className="text-center text-gray-400 text-sm py-6">載入中...</p>}
        {!loading && saved.length === 0 && <p className="text-center text-gray-400 text-sm py-6">這個月還沒有任何紀錄</p>}
        {!loading && saved.length > 0 && (
          <div className="flex flex-col gap-1 max-h-72 overflow-y-auto">
            {saved.map((e) => (
              <div key={e._id} className="flex items-center justify-between text-sm border-t border-gray-100 pt-1.5">
                <span className="text-gray-500">{e.date}</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800">NT${e.amount.toLocaleString()}</span>
                  <button onClick={() => deleteSaved(e._id)} className="text-gray-300 hover:text-red-500 text-xs">
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
