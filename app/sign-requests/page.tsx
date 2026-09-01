'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import CopyLinkButton from '@/app/components/CopyLinkButton';

type SignHistoryEntry = {
  signedAt: string;
  signatureImageUrl: string;
  signedFileUrl: string;
  signedFileSize: number;
  voidedAt: string;
};

type SignRequestItem = {
  _id: string;
  customerName: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  status: 'pending' | 'signed';
  signedAt?: string;
  signedFileUrl?: string;
  signHistory?: SignHistoryEntry[];
  createdAt: string;
};

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  pending: { label: '待簽署', className: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200' },
  signed: { label: '已簽署', className: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200' },
};

const ACTION_TONE: Record<string, string> = {
  slate: 'text-slate-600 border-slate-200 hover:bg-slate-50',
  emerald: 'text-emerald-700 border-emerald-200 hover:bg-emerald-50',
  amber: 'text-amber-700 border-amber-200 hover:bg-amber-50',
  red: 'text-red-600 border-red-200 hover:bg-red-50',
};

function ActionButton({
  href,
  onClick,
  tone = 'slate',
  disabled,
  children,
}: {
  href?: string;
  onClick?: () => void;
  tone?: keyof typeof ACTION_TONE;
  disabled?: boolean;
  children: ReactNode;
}) {
  const className = `inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none ${ACTION_TONE[tone]}`;
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  );
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function signUrl(id: string) {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/sign/${id}`;
}

export default function SignRequestsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<SignRequestItem | null>(null);

  const [list, setList] = useState<SignRequestItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 合約最後一頁預覽圖，讓老闆拖曳畫出要放簽名的框
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // pdfjs 的 PageViewport，用來把拖曳的像素座標換算成 PDF 座標，型別直接用 any 避免拉入額外型別依賴
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewportRef = useRef<any>(null);
  const [previewReady, setPreviewReady] = useState(false);
  const [previewError, setPreviewError] = useState('');
  // 目前拖曳中即時顯示的框（canvas 像素座標），放開滑鼠後歸零，改由 committedRectPx 顯示
  const [dragRectPx, setDragRectPx] = useState<{ left: number; top: number; width: number; height: number } | null>(
    null
  );
  // 上一次成功拖曳畫出、已確定的框（canvas 像素座標，純粹用來畫框）
  const [committedRectPx, setCommittedRectPx] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  // 拖曳結束後換算出的簽名框（PDF point，左下角原點），送出表單時用這個
  const [signatureBox, setSignatureBox] = useState<{ x: number; y: number; width: number; height: number } | null>(
    null
  );

  async function renderLastPagePreview(f: File) {
    setPreviewError('');
    setPreviewReady(false);
    setSignatureBox(null);
    setDragRectPx(null);
    setCommittedRectPx(null);
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

      const buffer = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      const page = await pdf.getPage(pdf.numPages);

      const containerWidth = previewContainerRef.current?.clientWidth || 560;
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = containerWidth / baseViewport.width;
      const viewport = page.getViewport({ scale });

      const canvas = previewCanvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      viewportRef.current = viewport;
      setPreviewReady(true);
    } catch {
      setPreviewError('無法預覽這份 PDF，仍可直接送出（簽名會加在合約最後新增的一頁）');
    }
  }

  function getCanvasPoint(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = previewCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePreviewMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!previewCanvasRef.current || !viewportRef.current) return;
    const p = getCanvasPoint(e);
    dragStartRef.current = p;
    setDragRectPx({ left: p.x, top: p.y, width: 0, height: 0 });
  }

  function handlePreviewMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const start = dragStartRef.current;
    if (!start) return;
    const p = getCanvasPoint(e);
    setDragRectPx({
      left: Math.min(start.x, p.x),
      top: Math.min(start.y, p.y),
      width: Math.abs(p.x - start.x),
      height: Math.abs(p.y - start.y),
    });
  }

  function handlePreviewMouseUp(e: React.MouseEvent<HTMLCanvasElement>) {
    const start = dragStartRef.current;
    const viewport = viewportRef.current;
    dragStartRef.current = null;
    if (!start || !viewport) return;

    const p = getCanvasPoint(e);
    const widthPx = Math.abs(p.x - start.x);
    const heightPx = Math.abs(p.y - start.y);
    setDragRectPx(null);
    if (widthPx < 12 || heightPx < 12) {
      // 拖曳範圍太小，視為誤觸，不更新框，維持原本已確定的框（如果有的話）
      return;
    }

    setCommittedRectPx({
      left: Math.min(start.x, p.x),
      top: Math.min(start.y, p.y),
      width: widthPx,
      height: heightPx,
    });

    const [pdfX1, pdfY1] = viewport.convertToPdfPoint(start.x, start.y);
    const [pdfX2, pdfY2] = viewport.convertToPdfPoint(p.x, p.y);
    setSignatureBox({
      x: Math.min(pdfX1, pdfX2),
      y: Math.min(pdfY1, pdfY2),
      width: Math.abs(pdfX2 - pdfX1),
      height: Math.abs(pdfY2 - pdfY1),
    });
  }

  function handlePreviewMouseLeave() {
    // 拖曳中途滑出畫布就取消這次拖曳，畫面恢復顯示原本已確定的框（如果有的話）
    dragStartRef.current = null;
    setDragRectPx(null);
  }

  async function loadList() {
    setListLoading(true);
    try {
      const res = await fetch('/api/sign-requests');
      const data = await res.json();
      if (res.ok) setList(data);
    } catch {
      // ignore
    } finally {
      setListLoading(false);
    }
  }

  async function handleReset(id: string) {
    if (!confirm('確定要作廢這份已簽署的合約嗎？舊版簽名會留底在歷史紀錄裡，客戶會用同一個連結重新簽一次。'))
      return;
    setResettingId(id);
    try {
      const res = await fetch(`/api/sign-requests/${id}/reset`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '作廢失敗');
      }
      await loadList();
    } catch (err) {
      alert(err instanceof Error ? err.message : '作廢失敗');
    } finally {
      setResettingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('確定要刪除這筆簽約請求嗎？合約檔案、簽名紀錄都會一併刪除，且無法復原。')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/sign-requests/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '刪除失敗');
      }
      await loadList();
    } catch (err) {
      alert(err instanceof Error ? err.message : '刪除失敗');
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    loadList();
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError('');
    setFile(f);
    renderLastPagePreview(f);
  }

  async function handleSubmit() {
    if (!file) return;
    setUploading(true);
    setError('');
    setCreated(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('customerName', customerName);
      if (signatureBox) {
        formData.append('signatureX', String(signatureBox.x));
        formData.append('signatureY', String(signatureBox.y));
        formData.append('signatureWidth', String(signatureBox.width));
        formData.append('signatureHeight', String(signatureBox.height));
      }
      const res = await fetch('/api/sign-requests', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '建立失敗');
      setCreated(data);
      setFile(null);
      setCustomerName('');
      setPreviewReady(false);
      setSignatureBox(null);
      setDragRectPx(null);
      setCommittedRectPx(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : '建立失敗');
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-gradient-to-br from-indigo-200 to-sky-200 opacity-40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-40 -right-32 h-96 w-96 rounded-full bg-gradient-to-br from-emerald-200 to-teal-200 opacity-30 blur-3xl"
      />

      <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-12 sm:px-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="inline-block rounded-full bg-indigo-100 px-4 py-1 text-xs font-bold tracking-wide text-indigo-600">
            電子簽署
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">合約簽署連結</h1>
          <p className="max-w-md text-sm text-slate-500">
            上傳合約 PDF，產生簽署連結傳給客戶，客戶手指簽名即完成
          </p>
        </div>

        <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4">
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="客戶標籤（選填，方便你在列表辨識，例如：王小姐）"
              maxLength={100}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-400"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="w-full text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
            />
            <p className="text-[11px] text-slate-400">僅支援 PDF，上限 4MB</p>

            {file && (
              <div ref={previewContainerRef} className="flex w-full flex-col gap-2">
                <p className="text-xs font-semibold text-slate-500">
                  {previewError
                    ? previewError
                    : previewReady
                      ? '在合約最後一頁拖曳畫出一個框（例如乙方旁邊的空白處），客戶簽名會自動縮放對齊貼進這個框'
                      : '合約預覽讀取中...'}
                </p>
                {!previewError && (
                  <div className="relative w-full overflow-auto rounded-xl border border-slate-200">
                    <canvas
                      ref={previewCanvasRef}
                      onMouseDown={handlePreviewMouseDown}
                      onMouseMove={handlePreviewMouseMove}
                      onMouseUp={handlePreviewMouseUp}
                      onMouseLeave={handlePreviewMouseLeave}
                      className="block cursor-crosshair select-none"
                    />
                    {(dragRectPx ?? committedRectPx) && (
                      <div
                        className="pointer-events-none absolute border-2 border-indigo-600 bg-indigo-600/10"
                        style={{
                          left: (dragRectPx ?? committedRectPx)!.left,
                          top: (dragRectPx ?? committedRectPx)!.top,
                          width: (dragRectPx ?? committedRectPx)!.width,
                          height: (dragRectPx ?? committedRectPx)!.height,
                        }}
                      />
                    )}
                  </div>
                )}
                {signatureBox && (
                  <p className="text-[11px] text-emerald-600">已框選簽名位置，客戶簽名後會自動縮放貼進這個框</p>
                )}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!file || uploading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-indigo-600 px-8 py-3 font-bold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:bg-slate-300"
            >
              {uploading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}
              {uploading ? '建立中...' : '產生簽署連結'}
            </button>

            {error && <p className="text-center text-sm text-red-500">{error}</p>}

            {created && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
                <p className="truncate text-xs text-indigo-700">{signUrl(created._id)}</p>
                <CopyLinkButton url={signUrl(created._id)} />
              </div>
            )}
          </div>
        </div>

        <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="mb-3 text-sm font-bold text-slate-700">
            簽約請求列表{listLoading && '（讀取中...）'}
          </p>
          {!listLoading && list.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-400">還沒有建立過任何簽約請求</p>
          )}
          <div className="flex flex-col gap-3">
            {list.map((item) => (
              <div
                key={item._id}
                className="rounded-2xl border border-slate-200 p-4 transition-colors hover:border-slate-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {item.customerName || item.fileName}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-400">{item.fileName}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {formatSize(item.fileSize)} ・ {new Date(item.createdAt).toLocaleString('zh-TW')}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_LABEL[item.status].className}`}
                  >
                    {STATUS_LABEL[item.status].label}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                  <p className="flex-1 truncate text-[11px] text-indigo-600">{signUrl(item._id)}</p>
                  <CopyLinkButton url={signUrl(item._id)} />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <ActionButton href={item.fileUrl}>查看原始合約</ActionButton>
                  {item.status === 'signed' && item.signedFileUrl && (
                    <>
                      <ActionButton href={item.signedFileUrl} tone="emerald">
                        查看已簽署版
                      </ActionButton>
                      <ActionButton
                        onClick={() => handleReset(item._id)}
                        disabled={resettingId === item._id}
                        tone="amber"
                      >
                        {resettingId === item._id ? '處理中...' : '作廢重簽'}
                      </ActionButton>
                    </>
                  )}
                  {!!item.signHistory?.length && (
                    <ActionButton
                      onClick={() => setExpandedHistoryId((cur) => (cur === item._id ? null : item._id))}
                    >
                      歷史版本（{item.signHistory.length}）
                    </ActionButton>
                  )}
                  <ActionButton onClick={() => handleDelete(item._id)} disabled={deletingId === item._id} tone="red">
                    {deletingId === item._id ? '刪除中...' : '刪除'}
                  </ActionButton>
                </div>

                {expandedHistoryId === item._id && !!item.signHistory?.length && (
                  <div className="mt-3 flex flex-col gap-1.5 rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                    {item.signHistory
                      .slice()
                      .reverse()
                      .map((h, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="text-slate-500">
                            簽於 {new Date(h.signedAt).toLocaleString('zh-TW')}・作廢於{' '}
                            {new Date(h.voidedAt).toLocaleString('zh-TW')}
                          </span>
                          <a
                            href={h.signedFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 font-semibold text-indigo-500 hover:text-indigo-700 underline"
                          >
                            查看
                          </a>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
