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

const CONTRACT_STEPS = [
  {
    title: '提供基本資料',
    desc: '我們會跟您要以下資料，先打合約給您過目',
    fields: ['乙　　方：', '代 表 人：', '統一編號：', '電　　話：', '地　　址：'],
  },
  { title: '傳送合約', desc: '確認資料無誤後，將合約傳給您過目' },
  { title: '確認並簽名', desc: '合約沒問題的話，請在最後一頁乙方旁邊空白處簽名（用手機編輯即可，不用印出來）' },
  { title: '填寫建置資料', desc: '付款完成後，會傳 3 份 Google 表單給您填寫，做為系統建置的資料依據' },
  { title: '系統建置', desc: '建置完成需要約一週時間，完成後會跟您約教學時間，確保您一定會使用系統' },
  {
    title: '技術客服團隊',
    desc: '會開一個群組，讓工程師直接在裡面協助您',
    team: {
      names: ['Ray', 'Hank', 'Charlie', 'Emily', 'Jeff', 'Marshall'],
      hours: ['週日及國定假日：12:00～18:00', '週一～週六：10:00～19:00'],
      note: '工程師與客服都會盡力協助您解決問題，也請在提問時保持基本禮貌，讓彼此溝通更順暢 ❤️',
    },
  },
];

type ContractForm = {
  selectedPlan: string;
  companyName: string;
  contactPerson: string;
  taxId: string;
  phone: string;
  address: string;
};
const EMPTY_FORM: ContractForm = {
  selectedPlan: '',
  companyName: '',
  contactPerson: '',
  taxId: '',
  phone: '',
  address: '',
};

export default function QuoteLeadClient({ id }: { id: string }) {
  const [lead, setLead] = useState<LeadData | null>(null);
  const [error, setError] = useState('');
  const visitIdRef = useRef<string | null>(null);
  const startedAtRef = useRef<number>(0);

  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState<ContractForm>(EMPTY_FORM);

  useEffect(() => {
    fetch(`/api/quote-leads/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data: LeadData) => {
        setLead(data);
        const defaultPlan = data.plans.find((p) => p.highlight) ?? data.plans[0];
        if (defaultPlan) setForm((f) => ({ ...f, selectedPlan: defaultPlan.title }));
      })
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

  async function handleSubmitForm() {
    if (!form.selectedPlan) {
      setFormError('請選擇一個方案');
      return;
    }
    if (!form.companyName.trim() || !form.phone.trim()) {
      setFormError('請至少填寫「乙方」跟「電話」');
      return;
    }
    setFormError('');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/quote-leads/${id}/interest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setSubmitted(true);
    } catch {
      setFormError('送出失敗，請稍後再試');
    } finally {
      setSubmitting(false);
    }
  }

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

      {/* Contract flow */}
      <section className="max-w-md mx-auto px-5 mt-14">
        <p className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: accent }}>
          What&apos;s Next
        </p>
        <h2 className="text-xl font-extrabold text-gray-900 mt-1 mb-5">簽約後的流程</h2>
        <div className="flex flex-col gap-3">
          {CONTRACT_STEPS.map((step, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-[0_8px_20px_-12px_rgba(15,23,42,0.15)]">
              <div className="flex items-start gap-3">
                <span
                  className="shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: accent }}
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900">{step.title}</p>
                  <p className="text-[13px] text-gray-500 mt-0.5">{step.desc}</p>

                  {step.fields && (
                    <div className="mt-3 bg-gray-50 rounded-xl p-3 flex flex-col gap-1">
                      {step.fields.map((f, j) => (
                        <p key={j} className="text-xs text-gray-500 font-mono">
                          {f}
                        </p>
                      ))}
                    </div>
                  )}

                  {step.team && (
                    <div className="mt-3 bg-gray-50 rounded-xl p-3 flex flex-col gap-2">
                      <p className="text-xs text-gray-600">
                        👨‍💻 {step.team.names.join('、')}
                      </p>
                      <div className="text-xs text-gray-600">
                        <p>📆 服務時間：</p>
                        {step.team.hours.map((h, k) => (
                          <p key={k} className="ml-4">
                            ・{h}
                          </p>
                        ))}
                      </div>
                      <p className="text-[11px] text-gray-400 leading-relaxed">⚠️ {step.team.note}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 px-5 pb-5 pt-8 bg-gradient-to-t from-[#F5F6F8] via-[#F5F6F8] to-transparent">
        <button
          onClick={() => {
            setSubmitted(false);
            setFormError('');
            setShowForm(true);
          }}
          className="block w-full max-w-md mx-auto text-center text-white font-bold py-3.5 rounded-full shadow-[0_16px_30px_-10px] transition-transform active:scale-[0.98]"
          style={{ backgroundColor: accent, boxShadow: `0 16px 30px -10px ${accent}88` }}
        >
          我要簽約，請與我聯繫
        </button>
      </div>

      {/* 簽約意願表單彈窗 */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-0 sm:px-4"
          onClick={() => setShowForm(false)}
        >
          <div
            className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-6 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {submitted ? (
              <div className="text-center py-6">
                <p className="text-3xl">✅</p>
                <p className="text-base font-bold text-gray-900 mt-3">已收到您的資料！</p>
                <p className="text-sm text-gray-500 mt-1">我們會盡快與您聯繫，謝謝您 🙏</p>
                <button
                  onClick={() => setShowForm(false)}
                  className="mt-5 w-full py-2.5 rounded-full font-bold text-white"
                  style={{ backgroundColor: accent }}
                >
                  關閉
                </button>
              </div>
            ) : (
              <>
                <p className="text-base font-extrabold text-gray-900">提供以下資料，我先打合約給您過目</p>
                <p className="text-xs text-gray-400 mt-1 mb-4">送出後我們會盡快與您聯繫</p>

                <p className="text-xs font-semibold text-gray-500 mb-1.5">選擇方案</p>
                <div className="flex flex-col gap-2 mb-4">
                  {lead.plans.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, selectedPlan: p.title }))}
                      className="flex items-center justify-between gap-2 rounded-xl border-2 px-3 py-2.5 text-left transition-colors"
                      style={{
                        borderColor: form.selectedPlan === p.title ? accent : '#E5E7EB',
                        backgroundColor: form.selectedPlan === p.title ? lightenColor(accent, 0.92) : '#FFFFFF',
                      }}
                    >
                      <span className="text-sm font-bold text-gray-900">{p.title}</span>
                      <span className="text-sm font-bold" style={{ color: accent }}>
                        {p.price}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-3">
                  <input
                    value={form.companyName}
                    onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                    placeholder="乙方（公司/商號名稱）"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 bg-white placeholder:text-gray-400"
                  />
                  <input
                    value={form.contactPerson}
                    onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))}
                    placeholder="代表人"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 bg-white placeholder:text-gray-400"
                  />
                  <input
                    value={form.taxId}
                    onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))}
                    placeholder="統一編號"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 bg-white placeholder:text-gray-400"
                  />
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="電話"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 bg-white placeholder:text-gray-400"
                  />
                  <input
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    placeholder="地址"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 bg-white placeholder:text-gray-400"
                  />
                </div>

                {formError && <p className="text-xs text-red-500 mt-3 text-center">{formError}</p>}

                <button
                  onClick={handleSubmitForm}
                  disabled={submitting}
                  className="mt-5 w-full py-3 rounded-full font-bold text-white disabled:opacity-60"
                  style={{ backgroundColor: accent }}
                >
                  {submitting ? '送出中...' : '確認送出'}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="mt-2 w-full py-2 text-sm text-gray-400"
                >
                  取消
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
