'use client';

import { useEffect, useRef, useState } from 'react';
import { lightenColor, type Plan } from '@/app/line-card/blocks';

type LeadData = { customerName: string; accentColor: string; plans: Plan[] };

const VALUE_POINTS = [
  '業績報表，隨時掌握營運狀況',
  '薪資計算，省下每個月對帳的時間',
  '庫存管理，避免缺貨或囤貨',
  '線上票券 / 預約系統，客人自己上網就能約',
  '聯播網導客，幫您把流量變成客人',
];

export default function QuoteLeadClient({ id }: { id: string }) {
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
      <main className="min-h-screen flex items-center justify-center p-6 bg-[#0B0F14]">
        <p className="text-gray-500">{error}</p>
      </main>
    );
  }

  if (!lead) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-[#0B0F14]">
        <p className="text-gray-500">載入中...</p>
      </main>
    );
  }

  const accent = lead.accentColor;
  const soft = lightenColor(accent, 0.94);

  return (
    <main className="min-h-screen pb-32" style={{ backgroundColor: '#F5F6F8' }}>
      {/* Hero */}
      <div
        className="relative overflow-hidden px-6 pt-16 pb-24 text-center text-white"
        style={{ background: `linear-gradient(160deg, ${accent}, ${lightenColor(accent, 0.25)} 60%, ${lightenColor(accent, 0.4)})` }}
      >
        <div
          className="absolute -top-16 -right-16 h-56 w-56 rounded-full opacity-20 blur-2xl"
          style={{ backgroundColor: '#FFFFFF' }}
        />
        <div
          className="absolute -bottom-24 -left-10 h-64 w-64 rounded-full opacity-10 blur-2xl"
          style={{ backgroundColor: '#FFFFFF' }}
        />
        <p className="relative text-sm font-medium tracking-wide opacity-90">{lead.customerName} 您好</p>
        <h1 className="relative text-[26px] font-extrabold mt-3 leading-snug">
          感謝您撥空了解
          <br />
          ezPretty 預約科技
        </h1>
        <p className="relative text-sm opacity-80 mt-3">為您準備的專屬報價方案如下</p>
      </div>

      {/* Plans */}
      <div className="max-w-md mx-auto px-5 -mt-14 flex flex-col gap-4 relative">
        {lead.plans.map((p, i) => (
          <div
            key={i}
            className="rounded-[22px] p-6 bg-white transition-transform"
            style={{
              boxShadow: p.highlight
                ? `0 20px 40px -12px ${accent}55`
                : '0 12px 28px -14px rgba(15,23,42,0.18)',
              border: p.highlight ? `1.5px solid ${accent}` : '1px solid #EEF0F3',
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-[15px] text-gray-900 tracking-wide">{p.title}</span>
              {p.badge.trim() && (
                <span
                  className="text-[11px] font-bold text-white px-3 py-1 rounded-full shrink-0 tracking-wide"
                  style={{ backgroundColor: accent }}
                >
                  {p.badge}
                </span>
              )}
            </div>
            <p className="text-[34px] font-extrabold mt-2 tracking-tight" style={{ color: accent }}>
              {p.price}
            </p>
            <div className="mt-3 flex flex-col gap-1.5 border-t border-gray-100 pt-3">
              {p.details
                .filter((d) => d.trim())
                .map((d, j) => (
                  <p key={j} className="text-[13px] text-gray-500 flex items-start gap-1.5">
                    <span style={{ color: accent }}>・</span>
                    {d}
                  </p>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* Value points */}
      <section className="max-w-md mx-auto px-5 mt-14">
        <p className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: accent }}>
          Why ezPretty
        </p>
        <h2 className="text-xl font-extrabold text-gray-900 mt-1 mb-5">使用 ezPretty，您可以獲得</h2>
        <div className="flex flex-col gap-2.5">
          {VALUE_POINTS.map((v, i) => (
            <div key={i} className="flex items-center gap-3 bg-white rounded-2xl p-3.5 shadow-[0_8px_20px_-12px_rgba(15,23,42,0.15)]">
              <span
                className="shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: soft, color: accent }}
              >
                {i + 1}
              </span>
              <p className="text-sm text-gray-700">{v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why 暐庭 */}
      <section className="max-w-md mx-auto px-5 mt-14">
        <p className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: accent }}>
          Your Partner
        </p>
        <h2 className="text-xl font-extrabold text-gray-900 mt-1 mb-5">為什麼選擇暐庭</h2>
        <div
          className="rounded-2xl p-6 relative overflow-hidden"
          style={{ backgroundColor: '#111827' }}
        >
          <span
            className="absolute -top-4 left-4 text-6xl font-serif opacity-20 select-none"
            style={{ color: accent }}
          >
            “
          </span>
          <p className="relative text-sm text-gray-200 leading-relaxed">
            很多業務簽約後就消失了，但我不會。除了系統本身的服務，我也會依照您的需求，額外幫您做一些小工具、優化流程，
            持續提供價值，不是簽完約就結束——選擇我，等於多一個長期能問、能幫忙的窗口。
          </p>
          <div className="relative flex items-center gap-2 mt-5 pt-4 border-t border-white/10">
            <span
              className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{ backgroundColor: accent }}
            >
              暐
            </span>
            <div>
              <p className="text-sm font-bold text-white">黃暐庭 Wei</p>
              <p className="text-[11px] text-gray-400">ezPretty 預約科技・業務</p>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 px-5 pb-5 pt-8 bg-gradient-to-t from-[#F5F6F8] via-[#F5F6F8] to-transparent">
        <a
          href="https://line.me/ti/p/"
          target="_blank"
          rel="noopener noreferrer"
          className="block max-w-md mx-auto text-center text-white font-bold py-3.5 rounded-full shadow-[0_16px_30px_-10px] transition-transform active:scale-[0.98]"
          style={{ backgroundColor: accent, boxShadow: `0 16px 30px -10px ${accent}88` }}
        >
          加我好友，直接聯繫
        </a>
      </div>
    </main>
  );
}
