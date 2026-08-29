'use client';

import { useEffect, useRef, useState } from 'react';

type Finding = { clause: string; issue: string; severity: 'low' | 'medium' | 'high'; suggestion: string };
type ContractReview = {
  _id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  riskLevel: 'low' | 'medium' | 'high';
  summary: string;
  findings?: Finding[];
  createdAt: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
};

const RISK_LABEL: Record<string, { label: string; className: string }> = {
  low: { label: '低風險', className: 'bg-emerald-100 text-emerald-700' },
  medium: { label: '中風險', className: 'bg-amber-100 text-amber-700' },
  high: { label: '高風險', className: 'bg-red-100 text-red-700' },
};

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function ContractsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ContractReview | null>(null);

  const [history, setHistory] = useState<ContractReview[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!uploading) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    setElapsedSec(0);
    timerRef.current = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [uploading]);

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/contracts');
      const data = await res.json();
      if (res.ok) setHistory(data);
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError('');
    setResult(null);
    setFile(f);
  }

  async function handleSubmit() {
    if (!file) return;
    setUploading(true);
    setError('');
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/contracts', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '審查失敗');
      setResult(data);
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : '審查失敗');
    } finally {
      setUploading(false);
    }
  }

  async function viewHistoryItem(id: string) {
    setError('');
    try {
      const res = await fetch(`/api/contracts/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '讀取失敗');
      setResult(data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : '讀取失敗');
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center gap-6 p-8 bg-gradient-to-br from-slate-300 via-slate-500 to-slate-800">
      <div className="flex flex-col items-center gap-1 mt-4">
        <h1
          className="text-4xl md:text-5xl font-extrabold text-white tracking-wide"
          style={{ textShadow: '0 2px 6px rgba(0,0,0,0.25), 0 0 24px rgba(255,255,255,0.5)' }}
        >
          AI 合約審查器
        </h1>
        <p className="text-white text-sm font-semibold" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.45)' }}>
          上傳 PDF 或文字檔，AI 幫你找出合約裡的風險條款
        </p>
      </div>

      <div className="w-full max-w-2xl bg-white/95 backdrop-blur rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-4">
        <input
          type="file"
          accept="application/pdf,text/plain"
          onChange={handleFileChange}
          className="w-full text-sm text-gray-600 file:mr-3 file:px-4 file:py-2 file:rounded-full file:border-0 file:bg-slate-100 file:text-slate-700 file:text-sm file:font-semibold hover:file:bg-slate-200"
        />
        <p className="text-[11px] text-gray-400">支援 PDF、純文字檔，上限 4MB</p>

        <button
          onClick={handleSubmit}
          disabled={!file || uploading}
          className="w-full flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-slate-800 disabled:bg-gray-300 text-white font-bold shadow-lg hover:bg-slate-900 transition-colors"
        >
          {uploading && (
            <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
          )}
          {uploading ? `審查中...（已等待 ${elapsedSec} 秒）` : '開始審查'}
        </button>
        {uploading && (
          <p className="text-center text-[11px] text-gray-400 -mt-2">
            AI 逐條分析合約內容，通常需要 20~60 秒，請耐心等候
          </p>
        )}

        {error && <p className="text-center text-red-500 text-sm">{error}</p>}
      </div>

      {result && (
        <div className="w-full max-w-2xl bg-white/95 backdrop-blur rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-800 truncate">{result.fileName}</p>
              <a
                href={result.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate-500 hover:text-slate-700 underline"
              >
                查看原始檔案
              </a>
            </div>
            <span
              className={`shrink-0 text-xs font-bold px-3 py-1 rounded-full ${RISK_LABEL[result.riskLevel].className}`}
            >
              {RISK_LABEL[result.riskLevel].label}
            </span>
          </div>

          <p className="text-sm text-gray-700 leading-relaxed border-t border-gray-100 pt-3">{result.summary}</p>

          {result.findings && result.findings.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-gray-100 pt-3">
              <p className="text-xs font-semibold text-gray-500">發現的問題（{result.findings.length}）</p>
              {result.findings.map((f, i) => (
                <div key={i} className="rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-gray-800">{f.clause}</p>
                    <span
                      className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${RISK_LABEL[f.severity].className}`}
                    >
                      {RISK_LABEL[f.severity].label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    <span className="font-semibold text-gray-500">問題：</span>
                    {f.issue}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    <span className="font-semibold text-gray-500">建議：</span>
                    {f.suggestion}
                  </p>
                </div>
              ))}
            </div>
          )}

          {typeof result.costUsd === 'number' && (
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
              <span>輸入 {(result.inputTokens ?? 0).toLocaleString()} tokens</span>
              <span>輸出 {(result.outputTokens ?? 0).toLocaleString()} tokens</span>
              <span>
                預估花費：${result.costUsd.toFixed(4)} USD（約 NT${(result.costUsd * 31.5).toFixed(1)}）
              </span>
            </div>
          )}
        </div>
      )}

      <div className="w-full max-w-2xl bg-white/95 backdrop-blur rounded-3xl p-6 shadow-2xl">
        <p className="text-sm font-bold text-gray-700 mb-3">
          歷史審查紀錄{historyLoading && '（讀取中...）'}
        </p>
        {!historyLoading && history.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-6">還沒有審查過任何合約</p>
        )}
        <div className="flex flex-col gap-2">
          {history.map((h) => (
            <button
              key={h._id}
              onClick={() => viewHistoryItem(h._id)}
              className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3 py-2.5 text-left hover:border-slate-400 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{h.fileName}</p>
                <p className="text-[11px] text-gray-400">
                  {formatSize(h.fileSize)} ・ {new Date(h.createdAt).toLocaleString('zh-TW')}
                  {typeof h.costUsd === 'number' && ` ・ $${h.costUsd.toFixed(4)}`}
                </p>
              </div>
              <span
                className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full ${RISK_LABEL[h.riskLevel].className}`}
              >
                {RISK_LABEL[h.riskLevel].label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
