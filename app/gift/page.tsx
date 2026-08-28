'use client';

import { useState } from 'react';

const AGE_OPTIONS = ['兒童 (0-12)', '青少年 (13-18)', '青年 (19-30)', '壯年 (31-50)', '長輩 (51+)'];
const REGION_OPTIONS = ['北部', '中部', '南部', '東部', '離島', '海外'];
const INTEREST_OPTIONS = ['3C 科技', '美妝保養', '運動健身', '閱讀學習', '美食料理', '旅遊', '遊戲', '藝術手作'];
const BUDGET_OPTIONS = ['500 元以下', '500-1000 元', '1000-3000 元', '3000-5000 元', '5000 元以上'];
const OCCASION_OPTIONS = ['生日', '節慶送禮', '畢業', '結婚', '喬遷', '感謝致意', '情人節'];

type Gift = { name: string; reason: string };
type GiftResult = { summary: string; gifts: Gift[] };

export default function GiftPage() {
  const [ageRange, setAgeRange] = useState(AGE_OPTIONS[0]);
  const [region, setRegion] = useState(REGION_OPTIONS[0]);
  const [interest, setInterest] = useState(INTEREST_OPTIONS[0]);
  const [budget, setBudget] = useState(BUDGET_OPTIONS[0]);
  const [occasion, setOccasion] = useState(OCCASION_OPTIONS[0]);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GiftResult | null>(null);
  const [error, setError] = useState('');

  async function handleRecommend() {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ageRange, region, interest, budget, occasion }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '推薦失敗，請稍後再試');
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '推薦失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8 bg-gradient-to-br from-rose-200 via-pink-400 to-red-500">
      <div className="flex flex-col items-center gap-1">
        <h1
          className="text-4xl md:text-5xl font-extrabold text-white tracking-wide"
          style={{
            textShadow: '0 2px 6px rgba(0,0,0,0.25), 0 0 24px rgba(255,255,255,0.5)',
          }}
        >
          AI 禮物推薦
        </h1>
        <p className="text-white/90 text-sm font-medium">
          選幾個條件，讓 AI 幫你想送什麼
        </p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-lg bg-white/95 backdrop-blur rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="🎂 年齡層" value={ageRange} onChange={setAgeRange} options={AGE_OPTIONS} />
          <Field label="📍 地區" value={region} onChange={setRegion} options={REGION_OPTIONS} />
          <Field label="🎯 興趣" value={interest} onChange={setInterest} options={INTEREST_OPTIONS} />
          <Field label="💰 預算" value={budget} onChange={setBudget} options={BUDGET_OPTIONS} />
          <Field
            label="🎉 場合"
            value={occasion}
            onChange={setOccasion}
            options={OCCASION_OPTIONS}
            className="sm:col-span-2"
          />
        </div>

        <button
          onClick={handleRecommend}
          disabled={loading}
          className="w-full px-8 py-3 rounded-full bg-rose-500 disabled:bg-gray-300 text-white font-bold shadow-lg hover:bg-rose-600 hover:scale-105 active:scale-95 transition-transform"
        >
          {loading ? '推薦中...' : '幫我推薦禮物'}
        </button>

        {error && <p className="text-center text-red-500 text-sm">{error}</p>}

        {result && (
          <div className="flex flex-col gap-3 border-t border-gray-100 pt-5 mt-1">
            <p className="text-center text-gray-700 text-sm leading-relaxed">
              {result.summary}
            </p>
            <div className="flex flex-col gap-2">
              {result.gifts.map((gift) => (
                <div
                  key={gift.name}
                  className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3"
                >
                  <p className="font-bold text-rose-700 text-sm">🎁 {gift.name}</p>
                  <p className="text-gray-600 text-xs mt-1 leading-relaxed">{gift.reason}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  options,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 text-xs font-semibold text-gray-600 ${className}`}>
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-black text-sm outline-none focus:ring-2 focus:ring-rose-400 bg-white"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}
