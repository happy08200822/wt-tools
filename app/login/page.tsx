'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

type Mode = 'login' | 'register';

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';

  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'line' | null>(null);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      if (mode === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '註冊失敗');
      }

      const result = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error('帳號或密碼錯誤');
      }

      window.location.href = next;
    } catch (err) {
      setError(err instanceof Error ? err.message : '發生錯誤，請稍後再試');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-slate-200 via-indigo-300 to-indigo-600">
      <div className="w-full max-w-sm bg-white/95 backdrop-blur rounded-3xl p-8 shadow-2xl flex flex-col gap-5">
        <div className="flex flex-col items-center gap-1">
          <span className="text-3xl">🧰</span>
          <h1 className="text-2xl font-extrabold text-slate-800">WT 的小工具箱</h1>
          <p className="text-xs text-slate-400">登入後即可使用所有工具</p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              setOauthLoading('google');
              signIn('google', { callbackUrl: next });
            }}
            disabled={oauthLoading !== null}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors"
          >
            {oauthLoading === 'google' ? '前往 Google...' : '用 Google 帳號繼續'}
          </button>
          <button
            type="button"
            onClick={() => {
              setOauthLoading('line');
              signIn('line', { callbackUrl: next });
            }}
            disabled={oauthLoading !== null}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[#06C755] text-sm font-semibold text-white hover:bg-[#05b04b] disabled:opacity-60 transition-colors"
          >
            {oauthLoading === 'line' ? '前往 LINE...' : '用 LINE 帳號繼續'}
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-400">
          <div className="flex-1 h-px bg-gray-200" />
          或使用 Email
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <div className="flex gap-2 bg-gray-100 rounded-full p-1">
          {(['login', 'register'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError('');
              }}
              className={`flex-1 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                mode === m ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {m === 'login' ? '登入' : '註冊'}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {mode === 'register' && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="姓名"
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-black text-sm outline-none focus:ring-2 focus:ring-indigo-400"
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email"
            className="border border-gray-300 rounded-lg px-3 py-2.5 text-black text-sm outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="密碼（至少 6 個字元）"
            className="border border-gray-300 rounded-lg px-3 py-2.5 text-black text-sm outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {error && <p className="text-center text-red-500 text-sm">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={
            loading ||
            !email.trim() ||
            !password ||
            (mode === 'register' && !name.trim())
          }
          className="w-full px-6 py-2.5 rounded-full bg-indigo-600 disabled:bg-gray-300 text-white font-bold shadow hover:bg-indigo-700 transition-colors"
        >
          {loading ? '處理中...' : mode === 'login' ? '登入' : '註冊並登入'}
        </button>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
