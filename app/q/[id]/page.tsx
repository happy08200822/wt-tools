'use client';

import { use, useEffect, useRef, useState } from 'react';
import { lightenColor, type Plan } from '@/app/line-card/blocks';

type LeadData = { customerName: string; accentColor: string; plans: Plan[] };

const VALUE_POINTS = [
  '業績報表，隨時掌握營運狀況',
  '薪資計算，省下每個月對帳的時間',
  '庫存管理，避免缺貨或囤貨',
  '線上票券 / 預約系統，客人自己上網就能約',
  '聯播網導客，幫您把流量變成客人',
];

export default function QuoteLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [lead, setLead] = useState<LeadData | null>(null);
  const [error, setError] = useState('');
  const visitIdRef = useRef<string | null>(null);
  const startedAtRef = useRef<number>(0);

  useEffect(() => {
    fetch(`/api/quote-leads/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data: LeadData) => setLead(data))
      .catch(() => setError('找不到這份報價，連結可能已失效'));
  }, [id]);

  useEffect(() => {
    startedAtRef.current = Date.now();

    fetch(`/api/quote-leads/${id}/visit`, { method: 'POST' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.visitId) visitIdRef.current = data.visitId;
      })
      .catch(() => {});

    function reportDuration() {
      const visitId = visitIdRef.current;
      if (!visitId) return;
      const durationSec = Math.round((Date.now() - startedAtRef.current) / 1000);
      const blob = new Blob([JSON.stringify({ durationSec })], { type: 'application/json' });
      navigator.sendBeacon(`/api/quote-leads/${id}/visit/${visitId}`, blob);
    }

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') reportDuration();
    });
    window.addEventListener('pagehide', reportDuration);

    return () => {
      window.removeEventListener('pagehide', reportDuration);
    };
  }, [id]);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-gray-400">{error}</p>
      </main>
    );
  }

  if (!lead) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-gray-400">載入中...</p>
      </main>
    );
  }

  const accent = lead.accentColor;

  return (
    <main className="min-h-screen bg-gray-50 pb-16">
      <div
        className="px-6 py-14 text-center text-white"
        style={{ background: `linear-gradient(135deg, ${accent}, ${lightenColor(accent, 0.35)})` }}
      >
        <p className="text-sm opacity-90">{lead.customerName} 您好</p>
        <h1 className="text-2xl font-extrabold mt-2">感謝您撥空了解 ezPretty</h1>
        <p className="text-sm opacity-90 mt-2">以下是為您準備的報價方案</p>
      </div>

      <div className="max-w-md mx-auto px-5 -mt-8 flex flex-col gap-4">
        {lead.plans.map((p, i) => (
          <div
            key={i}
            className="rounded-2xl p-5 bg-white shadow-lg"
            style={{ border: p.highlight ? `2px solid ${accent}` : undefined }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-gray-900">{p.title}</span>
              {p.badge.trim() && (
                <span
                  className="text-xs font-bold text-white px-2.5 py-1 rounded-full shrink-0"
                  style={{ backgroundColor: accent }}
                >
                  {p.badge}
                </span>
              )}
            </div>
            <p className="text-3xl font-extrabold mt-2" style={{ color: accent }}>
              {p.price}
            </p>
            <div className="mt-2 flex flex-col gap-1">
              {p.details
                .filter((d) => d.trim())
                .map((d, j) => (
                  <p key={j} className="text-sm text-gray-500">
                    ・{d}
                  </p>
                ))}
            </div>
          </div>
        ))}
      </div>

      <section className="max-w-md mx-auto px-5 mt-10">
        <h2 className="text-lg font-extrabold text-gray-900 mb-3">使用 ezPretty，您可以獲得</h2>
        <div className="flex flex-col gap-2">
          {VALUE_POINTS.map((v, i) => (
            <div key={i} className="flex items-start gap-2 bg-white rounded-xl p-3 shadow-sm">
              <span style={{ color: accent }}>✓</span>
              <p className="text-sm text-gray-700">{v}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-md mx-auto px-5 mt-10">
        <h2 className="text-lg font-extrabold text-gray-900 mb-3">為什麼選擇暐庭</h2>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-700 leading-relaxed">
            很多業務簽約後就消失了，但我不會。除了系統本身的服務，我也會依照您的需求，額外幫您做一些小工具、優化流程，
            持續提供價值，不是簽完約就結束——選擇我，等於多一個長期能問、能幫忙的窗口。
          </p>
        </div>
      </section>

      <div className="max-w-md mx-auto px-5 mt-10">
        <a
          href="https://line.me/ti/p/"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center text-white font-bold py-3 rounded-full shadow-lg"
          style={{ backgroundColor: accent }}
        >
          加我好友，直接聯繫
        </a>
      </div>
    </main>
  );
}
