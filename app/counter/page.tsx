'use client';

import { useState } from 'react';

export default function CounterPage() {
  const [count, setCount] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleClick() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/hello');
      if (!res.ok) throw new Error(`API 回應錯誤（${res.status}）`);
      const data = await res.json();
      setMessage(data.message);
      setCount(data.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : '呼叫 API 失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8 bg-gradient-to-br from-amber-200 via-orange-400 to-rose-600">
      <div className="flex flex-col items-center gap-1">
        <h1
          className="text-4xl md:text-5xl font-extrabold text-white tracking-wide"
          style={{
            textShadow: '0 2px 6px rgba(0,0,0,0.25), 0 0 24px rgba(255,255,255,0.5)',
          }}
        >
          按鈕計數器
        </h1>
        <p className="text-white/90 text-sm font-medium">
          每按一次，呼叫 /api/hello 並累加次數
        </p>
      </div>

      <div className="flex flex-col items-center gap-6 w-full max-w-sm bg-white/95 backdrop-blur rounded-3xl p-8 shadow-2xl">
        <div className="flex flex-col items-center gap-2">
          <span className="text-6xl font-mono font-bold text-gray-800 tabular-nums">
            {count ?? '—'}
          </span>
          <span className="text-sm text-gray-500">目前累積次數</span>
        </div>

        {message && (
          <p className="text-center text-gray-700 font-semibold">{message}</p>
        )}
        {error && <p className="text-center text-red-500 text-sm">{error}</p>}

        <button
          onClick={handleClick}
          disabled={loading}
          className="w-full px-8 py-3 rounded-full bg-orange-500 disabled:bg-gray-300 text-white font-bold shadow-lg hover:bg-orange-600 hover:scale-105 active:scale-95 transition-transform"
        >
          {loading ? '呼叫中...' : '打一次 API'}
        </button>
      </div>
    </main>
  );
}
