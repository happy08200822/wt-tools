'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';

const LIFF_ID = '2005817629-5BePAHi6';

declare global {
  interface Window {
    liff: {
      init: (config: { liffId: string }) => Promise<void>;
      isLoggedIn: () => boolean;
      login: () => void;
      isApiAvailable: (api: string) => boolean;
      shareTargetPicker: (messages: unknown[]) => Promise<unknown>;
      closeWindow: () => void;
    };
  }
}

type StatusMessage = { text: string; type: 'error' | 'warning' | 'success' } | null;

type SavedTemplate = { _id: string; name: string; body: string };

// 抓出文字裡的 {變數}，依出現順序去重
function extractVariables(body: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  const regex = /\{([^{}]+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(body))) {
    const v = m[1].trim();
    if (v && !seen.has(v)) {
      seen.add(v);
      found.push(v);
    }
  }
  return found;
}

// 把文字拆成一段段，變數片段標記是否已填寫，用來畫出「還沒填的空格」提示
type Segment = { text: string; isVar: boolean; filled: boolean };

function splitIntoSegments(body: string, values: Record<string, string>): Segment[] {
  const segments: Segment[] = [];
  const regex = /\{([^{}]+)\}/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(body))) {
    if (m.index > lastIndex) {
      segments.push({ text: body.slice(lastIndex, m.index), isVar: false, filled: false });
    }
    const varName = m[1].trim();
    const val = values[varName] ?? '';
    segments.push({ text: val || `{${varName}}`, isVar: true, filled: val !== '' });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < body.length) {
    segments.push({ text: body.slice(lastIndex), isVar: false, filled: false });
  }
  return segments;
}

function buildFinalText(body: string, values: Record<string, string>): string {
  return body.replace(/\{([^{}]+)\}/g, (_, v: string) => {
    const val = values[v.trim()];
    return val || `{${v.trim()}}`;
  });
}

export default function TextTemplatePage() {
  const [liffLoaded, setLiffLoaded] = useState(false);
  const [liffReady, setLiffReady] = useState(false);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<StatusMessage>(null);

  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const [selectedId, setSelectedId] = useState<string>('');
  const [values, setValues] = useState<Record<string, string>>({});

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBody, setNewBody] = useState('');
  const [savingBusy, setSavingBusy] = useState(false);

  function loadTemplates() {
    setLoadingTemplates(true);
    fetch('/api/text-templates')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingTemplates(false));
  }

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (!liffLoaded) return;
    (async () => {
      try {
        await window.liff.init({ liffId: LIFF_ID });
        if (!window.liff.isLoggedIn()) {
          window.liff.login();
          return;
        }
        setLiffReady(true);
      } catch {
        setStatus({ text: 'LIFF 初始化失敗，請確認是否透過 LINE 開啟此頁面', type: 'error' });
      }
    })();
  }, [liffLoaded]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t._id === selectedId) ?? null,
    [templates, selectedId]
  );

  const variables = useMemo(
    () => (selectedTemplate ? extractVariables(selectedTemplate.body) : []),
    [selectedTemplate]
  );

  const segments = useMemo(
    () => (selectedTemplate ? splitIntoSegments(selectedTemplate.body, values) : []),
    [selectedTemplate, values]
  );

  const allFilled = variables.every((v) => (values[v] ?? '').trim() !== '');

  function selectTemplate(t: SavedTemplate) {
    setSelectedId(t._id);
    setValues({});
    setStatus(null);
  }

  async function handleSaveTemplate() {
    const name = newName.trim();
    const body = newBody.trim();
    if (!name || !body) return;
    setSavingBusy(true);
    try {
      const res = await fetch('/api/text-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '儲存失敗');
      setTemplates((prev) => [data, ...prev.filter((t) => t.name !== name)]);
      setNewName('');
      setNewBody('');
      setShowAddForm(false);
    } catch (err) {
      setStatus({ text: err instanceof Error ? err.message : '儲存失敗', type: 'error' });
    } finally {
      setSavingBusy(false);
    }
  }

  async function handleDeleteTemplate(id: string) {
    setTemplates((prev) => prev.filter((t) => t._id !== id));
    if (selectedId === id) {
      setSelectedId('');
      setValues({});
    }
    try {
      await fetch(`/api/text-templates/${id}`, { method: 'DELETE' });
    } catch {
      // ignore，畫面已經移除，下次重新整理若刪除失敗會再出現
    }
  }

  async function handleSend() {
    setStatus(null);
    if (!selectedTemplate) return;

    if (!liffReady) {
      setStatus({ text: 'LIFF 尚未準備好，請稍候再試', type: 'warning' });
      return;
    }
    if (!window.liff.isApiAvailable('shareTargetPicker')) {
      setStatus({ text: '此環境不支援發送功能，請透過 LINE App 開啟此頁面', type: 'error' });
      return;
    }
    if (!allFilled) {
      setStatus({ text: '還有空格沒填，請先補齊再發送', type: 'error' });
      return;
    }

    const finalText = buildFinalText(selectedTemplate.body, values);

    setSending(true);
    try {
      const result = await window.liff.shareTargetPicker([{ type: 'text', text: finalText }]);
      if (result) {
        window.liff.closeWindow();
      } else {
        setStatus({ text: '已取消發送', type: 'warning' });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus({ text: `發送失敗：${message}`, type: 'error' });
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Script
        src="https://static.line-scdn.net/liff/edge/2/sdk.js"
        strategy="afterInteractive"
        onLoad={() => setLiffLoaded(true)}
      />
      <main className="min-h-screen flex flex-col items-center gap-6 p-6 bg-gradient-to-br from-emerald-100 via-white to-emerald-50">
        <div className="flex flex-col items-center gap-1 mt-2">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800">常用文字發送</h1>
          <p className="text-sm text-gray-500">
            選文案、填空格、選聊天室發送，不用每次重打
            <Link href="/line-card" className="ml-2 text-emerald-600 underline">
              回卡片發送器
            </Link>
          </p>
        </div>

        <div className="w-full max-w-2xl flex flex-col gap-5">
          <section className="bg-white rounded-2xl shadow p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-700">我的常用文字</p>
              <button
                type="button"
                onClick={() => setShowAddForm((s) => !s)}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
              >
                {showAddForm ? '取消新增' : '+ 新增文案'}
              </button>
            </div>

            {showAddForm && (
              <div className="flex flex-col gap-2 bg-emerald-50 rounded-xl p-4 mb-3">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="文案名稱，例如：約展時間確認"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white placeholder:text-gray-400"
                />
                <textarea
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  placeholder={'哈囉老闆，我們約{時間}見面！\n用大括號 {變數} 標記發送前要填的地方'}
                  rows={4}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white placeholder:text-gray-400 resize-none"
                />
                <button
                  onClick={handleSaveTemplate}
                  disabled={savingBusy || !newName.trim() || !newBody.trim()}
                  className="self-end text-xs px-4 py-1.5 rounded-lg bg-gray-700 disabled:bg-gray-300 text-white font-semibold"
                >
                  {savingBusy ? '儲存中...' : '儲存'}
                </button>
              </div>
            )}

            {loadingTemplates && <p className="text-xs text-gray-400">讀取中...</p>}
            {!loadingTemplates && templates.length === 0 && (
              <p className="text-xs text-gray-400">還沒有常用文字，點上面「+ 新增文案」新增一則</p>
            )}
            <div className="flex flex-col gap-1.5">
              {templates.map((t) => (
                <div
                  key={t._id}
                  className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 ${
                    selectedId === t._id ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200'
                  }`}
                >
                  <button onClick={() => selectTemplate(t)} className="flex-1 text-left min-w-0">
                    <p className="text-sm font-semibold text-gray-700 truncate">{t.name}</p>
                    <p className="text-[11px] text-gray-400 truncate">{t.body}</p>
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(t._id)}
                    className="text-xs text-gray-300 hover:text-red-500 shrink-0"
                  >
                    刪除
                  </button>
                </div>
              ))}
            </div>
          </section>

          {selectedTemplate && (
            <section className="bg-white rounded-2xl shadow p-5 flex flex-col gap-4">
              <p className="text-sm font-bold text-gray-700">{selectedTemplate.name}</p>

              {variables.length > 0 && (
                <div className="flex flex-col gap-2">
                  {variables.map((v) => (
                    <label key={v} className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-gray-500">{v}</span>
                      <input
                        value={values[v] ?? ''}
                        onChange={(e) => setValues((prev) => ({ ...prev, [v]: e.target.value }))}
                        placeholder={`填入「${v}」`}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white placeholder:text-gray-400"
                      />
                    </label>
                  ))}
                </div>
              )}

              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[11px] font-semibold text-gray-400 mb-1.5">預覽</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {segments.map((seg, i) =>
                    seg.isVar ? (
                      <span
                        key={i}
                        className={
                          seg.filled
                            ? 'font-semibold text-emerald-700'
                            : 'bg-amber-200 text-amber-800 rounded px-1 font-semibold'
                        }
                      >
                        {seg.text}
                      </span>
                    ) : (
                      <span key={i}>{seg.text}</span>
                    )
                  )}
                </p>
              </div>

              {status && (
                <div
                  className={`rounded-xl px-4 py-3 text-sm font-semibold text-center ${
                    status.type === 'error'
                      ? 'bg-red-100 text-red-600'
                      : status.type === 'success'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {status.text}
                </div>
              )}

              <button
                onClick={handleSend}
                disabled={sending || !liffReady || !allFilled}
                className="w-full px-8 py-3 rounded-full bg-[#00C800] disabled:bg-gray-300 text-white font-bold shadow-lg hover:brightness-95 transition-all"
              >
                {sending
                  ? '發送中...'
                  : !allFilled
                    ? '請先填完空格'
                    : liffReady
                      ? '選擇聊天室發送'
                      : '準備中...'}
              </button>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
