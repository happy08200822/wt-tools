'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { currentMonth, shiftMonth, formatMonthLabel } from '@/app/lib/monthUtils';
import ImageModal from '../../ImageModal';

type Item = { name: string; unitPrice: number; unit: string; quantity: number; itemTotal: number };
type Receipt = { _id: string; date: string; receiptTotal: number; imageUrl: string; items: Item[] };

export default function VendorItemsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { id } = use(params);
  const initialMonth = use(searchParams).month;

  const [vendorName, setVendorName] = useState('');
  const [month, setMonth] = useState(initialMonth && /^\d{4}-\d{2}$/.test(initialMonth) ? initialMonth : currentMonth());
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [openImageUrl, setOpenImageUrl] = useState<string | null>(null);

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
    setLoading(true);
    fetch(`/api/vendors/${id}/receipts?month=${month}`)
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data: { items: Receipt[] }) => setReceipts((data.items ?? []).slice().sort((a, b) => a.date.localeCompare(b.date))))
      .finally(() => setLoading(false));
  }, [id, month]);

  const monthTotal = receipts.reduce((sum, r) => sum + r.receiptTotal, 0);
  const rowCount = receipts.reduce((sum, r) => sum + r.items.length, 0);

  function handleExportCsv() {
    const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const header = ['日期', '照片連結', '品項', '單價', '單位', '數量', '總額', '單據總額'];
    const rows: string[] = [header.map(escape).join(',')];

    for (const r of receipts) {
      r.items.forEach((item, i) => {
        rows.push(
          [
            i === 0 ? r.date : '',
            i === 0 ? r.imageUrl : '',
            item.name,
            item.unitPrice,
            item.unit,
            item.quantity,
            item.itemTotal,
            i === 0 ? r.receiptTotal : '',
          ]
            .map(escape)
            .join(',')
        );
      });
    }

    // 前面加 BOM，不然 Excel 開啟中文會亂碼
    const blob = new Blob(['﻿' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${vendorName || '廠商'}_${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen flex flex-col items-center gap-6 p-6 bg-gray-100">
      <div className="flex flex-col items-center gap-1 mt-2">
        <Link href="/vendors" className="text-sm text-amber-600 hover:underline">
          ← 回報表查詢
        </Link>
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800">{vendorName || '廠商'}</h1>
        <p className="text-sm text-gray-500">完整明細（唯讀）</p>
      </div>

      <div className="w-full max-w-2xl flex items-center justify-center gap-3 bg-white rounded-2xl shadow-lg border border-gray-200 px-4 py-3">
        <button onClick={() => setMonth((m) => shiftMonth(m, -1))} className="text-gray-400 hover:text-gray-700 px-2">
          ←
        </button>
        <span className="text-base font-bold text-gray-800 w-28 text-center">{formatMonthLabel(month)}</span>
        <button onClick={() => setMonth((m) => shiftMonth(m, 1))} className="text-gray-400 hover:text-gray-700 px-2">
          →
        </button>
      </div>

      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 gap-3">
          <p className="text-sm text-gray-500 shrink-0">
            共 {receipts.length} 張收據・{rowCount} 個品項
          </p>
          <div className="flex items-center gap-3 shrink-0">
            <p className="text-sm font-bold text-amber-600">合計 NT${monthTotal.toLocaleString()}</p>
            {receipts.length > 0 && (
              <button
                onClick={handleExportCsv}
                className="text-xs font-semibold text-gray-500 hover:text-amber-600 border border-gray-200 rounded-full px-3 py-1"
              >
                匯出 Excel
              </button>
            )}
          </div>
        </div>

        {loading && <p className="text-center text-gray-400 py-10">載入中...</p>}
        {!loading && receipts.length === 0 && <p className="text-center text-gray-400 py-10">這個月沒有任何紀錄</p>}

        {!loading && receipts.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs text-gray-400">
                  <th className="px-4 py-2">日期</th>
                  <th className="px-4 py-2">照片</th>
                  <th className="px-4 py-2">品項</th>
                  <th className="px-4 py-2 text-right">單價</th>
                  <th className="px-4 py-2">單位</th>
                  <th className="px-4 py-2 text-right">數量</th>
                  <th className="px-4 py-2 text-right">總額</th>
                  <th className="px-4 py-2 text-right">單據總額</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r, ri) => (
                  <RowGroup key={r._id} receipt={r} shaded={ri % 2 === 1} onViewImage={() => setOpenImageUrl(r.imageUrl)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {openImageUrl && <ImageModal src={openImageUrl} onClose={() => setOpenImageUrl(null)} />}
    </main>
  );
}

function RowGroup({
  receipt,
  shaded,
  onViewImage,
}: {
  receipt: Receipt;
  shaded: boolean;
  onViewImage: () => void;
}) {
  const bg = shaded ? 'bg-gray-50' : 'bg-white';
  return (
    <>
      {receipt.items.map((item, i) => (
        <tr key={i} className={`${bg} ${i === 0 ? 'border-t-2 border-gray-300' : 'border-t border-gray-100'}`}>
          <td className="px-4 py-1.5 text-gray-500 whitespace-nowrap">{i === 0 ? receipt.date : ''}</td>
          <td className="px-4 py-1.5">
            {i === 0 && receipt.imageUrl && (
              <button onClick={onViewImage} className="text-xs text-amber-600 hover:text-amber-700 underline whitespace-nowrap">
                📷 查看
              </button>
            )}
          </td>
          <td className="px-4 py-1.5 text-gray-800">{item.name}</td>
          <td className="px-4 py-1.5 text-right text-gray-600">{item.unitPrice}</td>
          <td className="px-4 py-1.5 text-gray-600">{item.unit}</td>
          <td className="px-4 py-1.5 text-right text-gray-600">{item.quantity}</td>
          <td className="px-4 py-1.5 text-right text-gray-800 font-medium">${item.itemTotal.toLocaleString()}</td>
          <td className="px-4 py-1.5 text-right text-gray-500">
            {i === 0 ? `$${receipt.receiptTotal.toLocaleString()}` : ''}
          </td>
        </tr>
      ))}
    </>
  );
}
