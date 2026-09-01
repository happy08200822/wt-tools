'use client';

import { useState } from 'react';
import ExpenseTab from './ExpenseTab';
import IncomeTab from './IncomeTab';
import ReportTab from './ReportTab';

type Tab = 'expense' | 'income' | 'report';

const TABS: { id: Tab; label: string }[] = [
  { id: 'expense', label: '支出紀錄' },
  { id: 'income', label: '收入紀錄' },
  { id: 'report', label: '報表查詢' },
];

export default function NuvolaHomePage() {
  const [tab, setTab] = useState<Tab>('report');

  return (
    <main className="min-h-screen flex flex-col items-center gap-6 p-6 bg-gray-100">
      <div className="flex flex-col items-center gap-1 mt-2">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800">NUVOLA 記帳系統</h1>
      </div>

      <div className="flex gap-2 bg-white rounded-full p-1 shadow-lg border border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              tab === t.id ? 'bg-amber-600 text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'expense' && <ExpenseTab />}
      {tab === 'income' && <IncomeTab />}
      {tab === 'report' && <ReportTab />}
    </main>
  );
}
