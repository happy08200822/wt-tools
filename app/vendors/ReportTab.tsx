'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { currentMonth, shiftMonth, formatMonthLabel } from '@/app/lib/monthUtils';

// 兩位合夥老闆的名字，損益平分顯示用
const PARTNERS = ['Nuvola', '麥Shine'];

type CategoryTotal = { categoryId?: string; name: string; total: number };

export default function ReportTab() {
  const [month, setMonth] = useState(currentMonth());

  const [revenueTotal, setRevenueTotal] = useState(0);
  const [categories, setCategories] = useState<CategoryTotal[]>([]);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/revenue?month=${month}`).then((res) => (res.ok ? res.json() : { total: 0 })),
      fetch(`/api/vendors/report?month=${month}`).then((res) => (res.ok ? res.json() : { categories: [], grandTotal: 0 })),
    ])
      .then(([rev, exp]: [{ total: number }, { categories: CategoryTotal[]; grandTotal: number }]) => {
        setRevenueTotal(rev.total ?? 0);
        setCategories(exp.categories ?? []);
        setExpenseTotal(exp.grandTotal ?? 0);
      })
      .finally(() => setLoading(false));
  }, [month]);

  const netProfit = revenueTotal - expenseTotal;
  const perPartner = netProfit / 2;

  return (
    <div className="w-full max-w-xl flex flex-col items-center gap-6">
      <div className="w-full flex items-center justify-center gap-3 bg-white rounded-2xl shadow-lg border border-gray-200 px-4 py-3">
        <button onClick={() => setMonth((m) => shiftMonth(m, -1))} className="text-gray-400 hover:text-gray-700 px-2">
          ←
        </button>
        <span className="text-base font-bold text-gray-800 w-28 text-center">{formatMonthLabel(month)}</span>
        <button onClick={() => setMonth((m) => shiftMonth(m, 1))} className="text-gray-400 hover:text-gray-700 px-2">
          →
        </button>
      </div>

      <div className="w-full grid grid-cols-2 gap-3">
        <SummaryCard label="本月營業額" value={revenueTotal} color="text-emerald-600" />
        <SummaryCard label="本月總支出" value={expenseTotal} color="text-red-500" />
        <SummaryCard label="淨損益" value={netProfit} color={netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'} big />
        <SummaryCard label="每人分潤" value={perPartner} color={perPartner >= 0 ? 'text-emerald-600' : 'text-red-500'} big />
      </div>

      <div className="w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-4 flex flex-col gap-2">
        {PARTNERS.map((name) => (
          <div key={name} className="flex items-center justify-between text-sm">
            <span className="font-semibold text-gray-700">{name}</span>
            <span className={`font-bold ${perPartner >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              NT${Math.round(perPartner).toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      <div className="w-full bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <p className="text-sm font-bold text-gray-700 px-5 pt-4 pb-2">分類支出明細</p>
        {loading && <p className="text-center text-gray-400 py-6">載入中...</p>}
        {!loading && categories.length === 0 && <p className="text-center text-gray-400 py-6">這個月還沒有支出紀錄</p>}
        {!loading && categories.length > 0 && (
          <div className="pb-2">
            {categories.map((c, i) => (
              <CategoryRow key={c.categoryId ?? i} month={month} category={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type VendorTotal = { vendorId: string; name: string; total: number; count: number };

function CategoryRow({ month, category }: { month: string; category: CategoryTotal }) {
  const [open, setOpen] = useState(false);
  const [vendors, setVendors] = useState<VendorTotal[] | null>(null);
  const [loading, setLoading] = useState(false);

  function toggle() {
    if (!open && vendors === null) {
      setLoading(true);
      const categoryParam = category.categoryId ?? 'none';
      fetch(`/api/vendors/report/vendors?month=${month}&categoryId=${categoryParam}`)
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => setVendors(Array.isArray(data) ? data : []))
        .finally(() => setLoading(false));
    }
    setOpen((o) => !o);
  }

  return (
    <div className="border-t border-gray-100">
      <button onClick={toggle} className="w-full flex items-center justify-between px-5 py-2.5 hover:bg-gray-50">
        <span className="text-gray-600 flex items-center gap-1.5">
          <span className={`text-xs text-gray-300 transition-transform inline-block ${open ? 'rotate-90' : ''}`}>▸</span>
          {category.name}
        </span>
        <span className="text-gray-800 font-medium">NT${category.total.toLocaleString()}</span>
      </button>

      {open && (
        <div className="pl-9 pr-5 pb-2 flex flex-col gap-1">
          {loading && <p className="text-xs text-gray-400 py-2">載入中...</p>}
          {!loading && vendors?.length === 0 && <p className="text-xs text-gray-400 py-2">這個月沒有明細</p>}
          {!loading &&
            vendors?.map((v) => (
              <Link
                key={v.vendorId}
                href={`/vendors/${v.vendorId}/items?month=${month}`}
                className="flex items-center justify-between text-xs py-1.5 border-t border-gray-50 hover:text-amber-600"
              >
                <span className="text-gray-500">
                  {v.name}
                  <span className="text-gray-300 ml-1">（{v.count} 筆）</span>
                </span>
                <span className="font-semibold text-gray-700">NT${v.total.toLocaleString()}</span>
              </Link>
            ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color, big }: { label: string; value: number; color: string; big?: boolean }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 flex flex-col gap-1">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`font-extrabold ${color} ${big ? 'text-2xl' : 'text-xl'}`}>NT${Math.round(value).toLocaleString()}</p>
    </div>
  );
}
