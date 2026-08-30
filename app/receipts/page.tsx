'use client';

import { useState } from 'react';

type Item = { name: string; unitPrice: number; unit: string; quantity: number; itemTotal: number };
type Usage = { inputTokens: number; outputTokens: number; costUsd: number };
type Receipt = { date: string; vendor: string; receiptTotal: number; items: Item[]; usage?: Usage };

export default function ReceiptsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [copied, setCopied] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError('');
    setReceipt(null);
    setCopied(false);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleScan() {
    if (!file) return;
    setUploading(true);
    setError('');
    setReceipt(null);
    setCopied(false);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/receipts', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '辨識失敗');
      setReceipt(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '辨識失敗');
    } finally {
      setUploading(false);
    }
  }

  function updateField(path: 'date' | 'vendor' | 'receiptTotal', value: string) {
    setReceipt((r) => (r ? { ...r, [path]: path === 'receiptTotal' ? Number(value) || 0 : value } : r));
  }

  function updateItem(index: number, field: keyof Item, value: string) {
    setReceipt((r) => {
      if (!r) return r;
      const items = [...r.items];
      const isNumeric = field === 'unitPrice' || field === 'quantity' || field === 'itemTotal';
      items[index] = { ...items[index], [field]: isNumeric ? Number(value) || 0 : value };
      return { ...r, items };
    });
  }

  function removeItem(index: number) {
    setReceipt((r) => (r ? { ...r, items: r.items.filter((_, i) => i !== index) } : r));
  }

  function handleCopy() {
    if (!receipt) return;
    const rows = receipt.items.map((item, i) =>
      [
        receipt.date,
        item.name,
        item.unitPrice,
        item.unit,
        item.quantity,
        item.itemTotal,
        i === 0 ? receipt.receiptTotal : '',
        '',
        '',
      ].join('\t')
    );
    navigator.clipboard.writeText(rows.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <main className="min-h-screen flex flex-col items-center gap-6 p-6 bg-gradient-to-br from-amber-50 via-white to-orange-50">
      <div className="flex flex-col items-center gap-1 mt-2">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800">收據辨識</h1>
        <p className="text-sm text-gray-500">上傳收據照片，AI 拆解明細後直接複製貼上到 Excel</p>
      </div>

      <div className="w-full max-w-xl bg-white rounded-3xl p-6 shadow-xl flex flex-col gap-4">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="w-full text-sm text-gray-600 file:mr-3 file:px-4 file:py-2 file:rounded-full file:border-0 file:bg-amber-100 file:text-amber-700 file:text-sm file:font-semibold hover:file:bg-amber-200"
        />

        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="收據預覽" className="max-h-64 w-auto mx-auto rounded-xl border border-gray-100" />
        )}

        <button
          onClick={handleScan}
          disabled={!file || uploading}
          className="w-full px-8 py-3 rounded-full bg-amber-600 disabled:bg-gray-300 text-white font-bold shadow-lg hover:bg-amber-700 transition-colors"
        >
          {uploading ? '辨識中...' : '開始辨識'}
        </button>

        {error && <p className="text-center text-red-500 text-sm">{error}</p>}
      </div>

      {receipt && (
        <div className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-xl flex flex-col gap-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[140px]">
              <label className="text-xs font-semibold text-gray-500">日期</label>
              <input
                value={receipt.date}
                onChange={(e) => updateField('date', e.target.value)}
                className="w-full mt-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-900 bg-white"
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="text-xs font-semibold text-gray-500">廠商</label>
              <input
                value={receipt.vendor}
                onChange={(e) => updateField('vendor', e.target.value)}
                className="w-full mt-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-900 bg-white"
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="text-xs font-semibold text-gray-500">單據總額</label>
              <input
                value={receipt.receiptTotal}
                onChange={(e) => updateField('receiptTotal', e.target.value)}
                inputMode="decimal"
                className="w-full mt-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-900 bg-white"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400">
                  <th className="pb-2">品項</th>
                  <th className="pb-2 w-20">單價</th>
                  <th className="pb-2 w-16">單位</th>
                  <th className="pb-2 w-16">數量</th>
                  <th className="pb-2 w-20">總額</th>
                  <th className="pb-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {receipt.items.map((item, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="py-1 pr-1">
                      <input
                        value={item.name}
                        onChange={(e) => updateItem(i, 'name', e.target.value)}
                        className="w-full text-sm border border-gray-200 rounded px-2 py-1 text-gray-900 bg-white"
                      />
                    </td>
                    <td className="py-1 pr-1">
                      <input
                        value={item.unitPrice}
                        onChange={(e) => updateItem(i, 'unitPrice', e.target.value)}
                        inputMode="decimal"
                        className="w-full text-sm border border-gray-200 rounded px-2 py-1 text-gray-900 bg-white"
                      />
                    </td>
                    <td className="py-1 pr-1">
                      <input
                        value={item.unit}
                        onChange={(e) => updateItem(i, 'unit', e.target.value)}
                        className="w-full text-sm border border-gray-200 rounded px-2 py-1 text-gray-900 bg-white"
                      />
                    </td>
                    <td className="py-1 pr-1">
                      <input
                        value={item.quantity}
                        onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                        inputMode="decimal"
                        className="w-full text-sm border border-gray-200 rounded px-2 py-1 text-gray-900 bg-white"
                      />
                    </td>
                    <td className="py-1 pr-1">
                      <input
                        value={item.itemTotal}
                        onChange={(e) => updateItem(i, 'itemTotal', e.target.value)}
                        inputMode="decimal"
                        className="w-full text-sm border border-gray-200 rounded px-2 py-1 text-gray-900 bg-white"
                      />
                    </td>
                    <td className="py-1">
                      <button onClick={() => removeItem(i)} className="text-gray-300 hover:text-red-500 text-xs px-1">
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleCopy}
            className="w-full px-8 py-3 rounded-full bg-gray-800 text-white font-bold shadow-lg hover:bg-gray-900 transition-colors"
          >
            {copied ? '已複製！可以去貼上了' : '📋 複製（可直接貼到 Excel）'}
          </button>
          <p className="text-[11px] text-gray-400 text-center -mt-2">
            複製格式對應欄位：進貨日期／品項／單價／單位／數量／總額／單據總額／是否支付／支付日期
          </p>

          {receipt.usage && (
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
              <span>輸入 {receipt.usage.inputTokens.toLocaleString()} tokens</span>
              <span>輸出 {receipt.usage.outputTokens.toLocaleString()} tokens</span>
              <span>
                預估花費：${receipt.usage.costUsd.toFixed(4)} USD（約 NT${(receipt.usage.costUsd * 31.5).toFixed(1)}）
              </span>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
