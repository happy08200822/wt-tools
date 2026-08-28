'use client';

import { useState } from 'react';

type MbtiResult = {
  mbti: string;
  summary: string;
  traits: string[];
};

export default function MbtiPage() {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MbtiResult | null>(null);
  const [error, setError] = useState('');

  async function handleAnalyze() {
    if (!description.trim()) {
      setError('請先描述一下自己的個性');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/mbti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '分析失敗，請稍後再試');
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8 bg-gradient-to-br from-fuchsia-200 via-purple-400 to-indigo-600">
      <div className="flex flex-col items-center gap-1">
        <h1
          className="text-4xl md:text-5xl font-extrabold text-white tracking-wide"
          style={{
            textShadow: '0 2px 6px rgba(0,0,0,0.25), 0 0 24px rgba(255,255,255,0.5)',
          }}
        >
          AI MBTI 分析
        </h1>
        <p className="text-white/90 text-sm font-medium">
          描述你的個性，讓 AI 幫你猜猜看是哪個類型
        </p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-lg bg-white/95 backdrop-blur rounded-3xl p-6 sm:p-8 shadow-2xl">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="例如：我喜歡獨處思考，做決定前會反覆分析利弊，不太喜歡臨時的社交活動，但對有興趣的主題可以研究很久..."
          rows={6}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-black text-sm resize-none outline-none focus:ring-2 focus:ring-purple-400"
        />

        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="w-full px-8 py-3 rounded-full bg-purple-600 disabled:bg-gray-300 text-white font-bold shadow-lg hover:bg-purple-700 hover:scale-105 active:scale-95 transition-transform"
        >
          {loading ? '分析中...' : '開始分析'}
        </button>

        {error && <p className="text-center text-red-500 text-sm">{error}</p>}

        {result && (
          <div className="flex flex-col items-center gap-3 border-t border-gray-100 pt-5 mt-1">
            <span className="text-5xl font-mono font-extrabold text-purple-700 tracking-widest">
              {result.mbti}
            </span>
            <p className="text-center text-gray-700 text-sm leading-relaxed">
              {result.summary}
            </p>
            {result.traits?.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mt-1">
                {result.traits.map((trait) => (
                  <span
                    key={trait}
                    className="rounded-full bg-purple-100 text-purple-700 text-xs font-semibold px-3 py-1"
                  >
                    {trait}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
