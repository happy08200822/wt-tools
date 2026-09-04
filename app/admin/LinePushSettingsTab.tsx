'use client';

import { useEffect, useState } from 'react';

type LineTargetType = 'user' | 'group' | 'room';

type LineTarget = {
  targetId: string;
  type: LineTargetType;
  displayName: string;
  lastEventAt: string;
};

type ActiveTarget = {
  targetId: string;
  type: LineTargetType;
  displayName: string;
};

const TYPE_LABEL: Record<LineTargetType, string> = {
  user: '個人',
  group: '群組',
  room: '多人聊天室',
};

export default function LinePushSettingsTab() {
  const [targets, setTargets] = useState<LineTarget[]>([]);
  const [active, setActive] = useState<ActiveTarget | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/line-targets');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '讀取失敗');
      setTargets(data.targets);
      setActive(data.active);
    } catch (err) {
      setError(err instanceof Error ? err.message : '讀取失敗');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSelect(target: LineTarget) {
    setSavingId(target.targetId);
    setError('');
    try {
      const res = await fetch('/api/admin/line-targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: target.targetId, type: target.type, displayName: target.displayName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '設定失敗');
      setTargets(data.targets);
      setActive(data.active);
    } catch (err) {
      setError(err instanceof Error ? err.message : '設定失敗');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="w-full max-w-4xl flex flex-col gap-4">
      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-xs leading-relaxed text-indigo-700">
        💡 這裡設定「合約簽署完成」「客戶選付款方式」這兩則 LINE 通知要推播給誰。
        <br />
        取得新對象的 ID：把官方帳號拉進群組（或私訊官方帳號），在裡面隨便傳一句話，
        官方帳號會自動回覆這個對象的 ID，同時這個對象也會出現在下面的清單裡，選一下就能切換。
      </div>

      <div className="rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-semibold text-slate-500">目前推播對象</p>
        {active ? (
          <p className="mt-1 text-sm text-slate-800">
            <span className="mr-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
              {TYPE_LABEL[active.type]}
            </span>
            {active.displayName || active.targetId}
          </p>
        ) : (
          <p className="mt-1 text-sm text-slate-400">尚未設定，暫時會推播給建立合約請求的老闆帳號</p>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="rounded-xl border border-slate-200">
        <p className="border-b border-slate-100 px-4 py-3 text-xs font-semibold text-slate-500">
          曾經互動過的 LINE 對象{loading && '（讀取中...）'}
        </p>
        {!loading && targets.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-slate-400">
            還沒有任何紀錄，先把官方帳號拉進群組或私訊它一次
          </p>
        )}
        <div className="divide-y divide-slate-100">
          {targets.map((t) => {
            const isActive = active?.targetId === t.targetId;
            return (
              <div key={t.targetId} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
                      {TYPE_LABEL[t.type]}
                    </span>
                    <span className="truncate">{t.displayName || '（沒有名稱）'}</span>
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-slate-400">{t.targetId}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelect(t)}
                  disabled={isActive || savingId === t.targetId}
                  className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${
                    isActive
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  } disabled:cursor-not-allowed`}
                >
                  {isActive ? '使用中' : savingId === t.targetId ? '設定中...' : '設為推播對象'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
