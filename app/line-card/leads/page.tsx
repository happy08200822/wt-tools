'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Visit = { _id: string; visitedAt: string; durationSec: number };
type InterestClick = {
  clickedAt: string;
  companyName?: string;
  contactPerson?: string;
  taxId?: string;
  phone?: string;
  address?: string;
};
type Lead = {
  _id: string;
  customerName: string;
  plans: { title: string }[];
  visits: Visit[];
  interestClicks?: InterestClick[];
  createdAt: string;
};

function formatDuration(sec: number) {
  if (sec < 60) return `${sec} 秒`;
  return `${Math.floor(sec / 60)} 分 ${sec % 60} 秒`;
}

export default function QuoteLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/quote-leads')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setLeads(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center gap-6 p-6 bg-gray-50">
      <div className="flex flex-col items-center gap-1 mt-2">
        <h1 className="text-3xl font-extrabold text-gray-800">報價追蹤紀錄</h1>
        <p className="text-sm text-gray-500">
          誰看了你發的報價頁面、看了幾次、停留多久
          <Link href="/line-card" className="ml-2 text-emerald-600 underline">
            回卡片編輯器
          </Link>
        </p>
      </div>

      <div className="w-full max-w-2xl flex flex-col gap-3">
        {loading && <p className="text-center text-gray-400 py-10">載入中...</p>}
        {!loading && leads.length === 0 && (
          <p className="text-center text-gray-400 py-10">還沒有任何報價追蹤連結，去卡片編輯器發送一張看看</p>
        )}

        {leads.map((lead) => {
          const visitCount = lead.visits.length;
          const interestCount = lead.interestClicks?.length ?? 0;
          const lastVisit = visitCount > 0 ? lead.visits[visitCount - 1] : null;
          const isOpen = expanded === lead._id;

          return (
            <div
              key={lead._id}
              className={`bg-white rounded-2xl shadow p-4 ${interestCount > 0 ? 'ring-2 ring-rose-400' : ''}`}
            >
              <button
                onClick={() => setExpanded(isOpen ? null : lead._id)}
                className="w-full flex items-center justify-between gap-3 text-left"
              >
                <div className="min-w-0">
                  <p className="font-bold text-gray-800">
                    {lead.customerName}
                    {interestCount > 0 && (
                      <span className="ml-2 text-[10px] font-bold text-white bg-rose-500 px-2 py-0.5 rounded-full align-middle">
                        🔥 有意願
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {lead.plans.map((p) => p.title).join('、') || '（無方案）'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold ${visitCount > 0 ? 'text-emerald-600' : 'text-gray-300'}`}>
                    {visitCount > 0 ? `已查看 ${visitCount} 次` : '尚未查看'}
                  </p>
                  {lastVisit && (
                    <p className="text-[11px] text-gray-400">
                      最後：{new Date(lastVisit.visitedAt).toLocaleString('zh-TW')}
                    </p>
                  )}
                </div>
              </button>

              {isOpen && interestCount > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-2">
                  <p className="text-xs font-bold text-rose-500">客戶填寫的簽約資料</p>
                  {[...(lead.interestClicks ?? [])].reverse().map((c, i) => (
                    <div key={i} className="bg-rose-50 rounded-lg p-2.5 text-xs text-gray-700 flex flex-col gap-0.5">
                      <p className="text-[10px] text-gray-400 mb-1">{new Date(c.clickedAt).toLocaleString('zh-TW')}</p>
                      {c.companyName && <p>乙方：{c.companyName}</p>}
                      {c.contactPerson && <p>代表人：{c.contactPerson}</p>}
                      {c.taxId && <p>統一編號：{c.taxId}</p>}
                      {c.phone && <p>電話：{c.phone}</p>}
                      {c.address && <p>地址：{c.address}</p>}
                    </div>
                  ))}
                </div>
              )}

              {isOpen && visitCount > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-1.5">
                  {[...lead.visits].reverse().map((v, i) => (
                    <div key={v._id} className="flex items-center justify-between text-xs text-gray-500">
                      <span>第 {visitCount - i} 次・{new Date(v.visitedAt).toLocaleString('zh-TW')}</span>
                      <span>{v.durationSec > 0 ? formatDuration(v.durationSec) : '停留時間未知'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
