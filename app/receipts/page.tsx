'use client';

import { useState } from 'react';

type Item = { name: string; unitPrice: number; unit: string; quantity: number; itemTotal: number };
type Usage = { inputTokens: number; outputTokens: number; costUsd: number };
type Receipt = {
  id: string;
  fileName: string;
  date: string;
  vendor: string;
  receiptTotal: number;
  items: Item[];
  usage?: Usage;
  error?: string;
};

function receiptToRows(r: Receipt): string[] {
  return r.items.map((item, i) =>
    [r.date, item.name, item.unitPrice, item.unit, item.quantity, item.itemTotal, i === 0 ? r.receiptTotal : '', '', ''].join(
      '\t'
    )
  );
}

// 手機拍照常常一張就 3~8MB，超過 Vercel 平台的請求大小上限（約 4.5MB）會直接被擋掉，
// 收據辨識用不到原始解析度，上傳前先縮小壓縮可以從根本避免超過限制、也省 AI 費用
async function resizeImageForUpload(file: File, maxDim = 1600, quality = 0.82): Promise<File> {
  if (file.type === 'image/heic' || file.type === 'image/heif') return file; // 瀏覽器普遍畫不出來，跳過

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = URL.createObjectURL(file);
    });

    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob || blob.size >= file.size) return file; // 壓縮完反而更大就用原檔
    return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
  } catch {
    return file; // 縮圖失敗就退回原檔，讓伺服器端的大小檢查去擋
  }
}

export default function ReceiptsPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState('');
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [copiedAll, setCopiedAll] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    setError('');
    setReceipts([]);
    setCopiedAll(false);
    setFiles(picked);
    setPreviews(picked.map((f) => URL.createObjectURL(f)));
  }

  async function handleScan() {
    if (files.length === 0) return;
    setUploading(true);
    setError('');
    setReceipts([]);
    setCopiedAll(false);
    setProgress({ done: 0, total: files.length });

    const results: Receipt[] = [];
    for (const file of files) {
      try {
        const uploadFile = await resizeImageForUpload(file);
        const formData = new FormData();
        formData.append('file', uploadFile);
        const res = await fetch('/api/receipts', { method: 'POST', body: formData });

        let data: { error?: string } & Partial<Omit<Receipt, 'id' | 'fileName' | 'error'>>;
        try {
          data = await res.json();
        } catch {
          throw new Error(res.status === 413 ? '照片太大，請重新拍攝或裁切後再試' : `伺服器錯誤（HTTP ${res.status}）`);
        }

        if (!res.ok || !data.date || !data.vendor || !data.items) throw new Error(data.error || '辨識失敗');
        results.push({
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          fileName: file.name,
          date: data.date,
          vendor: data.vendor,
          receiptTotal: data.receiptTotal ?? 0,
          items: data.items,
          usage: data.usage,
        });
      } catch (err) {
        results.push({
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          fileName: file.name,
          date: '',
          vendor: '',
          receiptTotal: 0,
          items: [],
          error: err instanceof Error ? err.message : '辨識失敗',
        });
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }

    setReceipts(results);
    setUploading(false);
  }

  function updateField(id: string, path: 'date' | 'vendor' | 'receiptTotal', value: string) {
    setReceipts((rs) =>
      rs.map((r) => (r.id === id ? { ...r, [path]: path === 'receiptTotal' ? Number(value) || 0 : value } : r))
    );
  }

  function updateItem(id: string, index: number, field: keyof Item, value: string) {
    setReceipts((rs) =>
      rs.map((r) => {
        if (r.id !== id) return r;
        const items = [...r.items];
        const isNumeric = field === 'unitPrice' || field === 'quantity' || field === 'itemTotal';
        items[index] = { ...items[index], [field]: isNumeric ? Number(value) || 0 : value };
        return { ...r, items };
      })
    );
  }

  function removeItem(id: string, index: number) {
    setReceipts((rs) => rs.map((r) => (r.id === id ? { ...r, items: r.items.filter((_, i) => i !== index) } : r)));
  }

  function handleCopyAll() {
    const ok = receipts.filter((r) => !r.error);
    const text = ok.map((r) => receiptToRows(r).join('\n')).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    });
  }

  const successCount = receipts.filter((r) => !r.error).length;

  return (
    <main className="min-h-screen flex flex-col items-center gap-6 p-6 bg-gradient-to-br from-amber-50 via-white to-orange-50">
      <div className="flex flex-col items-center gap-1 mt-2">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800">收據辨識</h1>
        <p className="text-sm text-gray-500">上傳收據照片（可一次選多張），AI 拆解明細後直接複製貼上到 Excel</p>
      </div>

      <div className="w-full max-w-xl bg-white rounded-3xl p-6 shadow-xl flex flex-col gap-4">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={handleFileChange}
          className="w-full text-sm text-gray-600 file:mr-3 file:px-4 file:py-2 file:rounded-full file:border-0 file:bg-amber-100 file:text-amber-700 file:text-sm file:font-semibold hover:file:bg-amber-200"
        />

        {previews.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center">
            {previews.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt={files[i]?.name} className="h-20 w-20 object-cover rounded-lg border border-gray-100" />
            ))}
          </div>
        )}

        <button
          onClick={handleScan}
          disabled={files.length === 0 || uploading}
          className="w-full px-8 py-3 rounded-full bg-amber-600 disabled:bg-gray-300 text-white font-bold shadow-lg hover:bg-amber-700 transition-colors"
        >
          {uploading
            ? `辨識中...（${progress.done}/${progress.total}）`
            : files.length > 1
              ? `開始辨識（共 ${files.length} 張）`
              : '開始辨識'}
        </button>

        {error && <p className="text-center text-red-500 text-sm">{error}</p>}
      </div>

      {receipts.length > 1 && successCount > 0 && (
        <div className="w-full max-w-2xl">
          <button
            onClick={handleCopyAll}
            className="w-full px-8 py-3 rounded-full bg-gray-800 text-white font-bold shadow-lg hover:bg-gray-900 transition-colors"
          >
            {copiedAll ? '已複製全部！可以去貼上了' : `📋 複製全部 ${successCount} 張的明細`}
          </button>
        </div>
      )}

      {receipts.map((receipt) => (
        <ReceiptCard
          key={receipt.id}
          receipt={receipt}
          onFieldChange={(path, value) => updateField(receipt.id, path, value)}
          onItemChange={(i, field, value) => updateItem(receipt.id, i, field, value)}
          onItemRemove={(i) => removeItem(receipt.id, i)}
        />
      ))}
    </main>
  );
}

function ReceiptCard({
  receipt,
  onFieldChange,
  onItemChange,
  onItemRemove,
}: {
  receipt: Receipt;
  onFieldChange: (path: 'date' | 'vendor' | 'receiptTotal', value: string) => void;
  onItemChange: (index: number, field: keyof Item, value: string) => void;
  onItemRemove: (index: number) => void;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(receiptToRows(receipt).join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (receipt.error) {
    return (
      <div className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-xl">
        <p className="text-sm font-semibold text-gray-700 truncate">{receipt.fileName}</p>
        <p className="text-sm text-red-500 mt-2">辨識失敗：{receipt.error}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-xl flex flex-col gap-4">
      <p className="text-xs text-gray-400 truncate">{receipt.fileName}</p>

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[140px]">
          <label className="text-xs font-semibold text-gray-500">日期</label>
          <input
            value={receipt.date}
            onChange={(e) => onFieldChange('date', e.target.value)}
            className="w-full mt-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-900 bg-white"
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="text-xs font-semibold text-gray-500">廠商</label>
          <input
            value={receipt.vendor}
            onChange={(e) => onFieldChange('vendor', e.target.value)}
            className="w-full mt-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-900 bg-white"
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="text-xs font-semibold text-gray-500">單據總額</label>
          <input
            value={receipt.receiptTotal}
            onChange={(e) => onFieldChange('receiptTotal', e.target.value)}
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
                <td className="py-1">
                  <button onClick={() => onItemRemove(i)} className="text-gray-300 hover:text-red-500 text-xs px-1">
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
  );
}
