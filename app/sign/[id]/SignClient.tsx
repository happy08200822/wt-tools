'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import SignaturePad from 'signature_pad';

type SignInfo = {
  fileName: string;
  fileUrl: string;
  customerName: string;
  status: 'pending' | 'signed';
  signedAt?: string;
  signedFileUrl?: string;
};

// 把簽署日期時間（可能含中文）疊在簽名筆跡的右下角，合成同一張圖再送到後端。
// pdf-lib 的標準字型畫不出中文，所以文字要在瀏覽器這邊用 canvas 畫成圖片，
// 後端就完全不用處理中文文字，只要把這張圖貼到 PDF 上就好。
// 背景保持透明，因為這張圖現在會直接貼在合約原本頁面的空白處，不透明底會蓋出一塊色塊。
function buildAttestationImage(signatureCanvas: HTMLCanvasElement): string {
  const ratio = Math.max(window.devicePixelRatio || 1, 1);

  const composite = document.createElement('canvas');
  composite.width = signatureCanvas.width;
  composite.height = signatureCanvas.height;

  const ctx = composite.getContext('2d')!;
  ctx.drawImage(signatureCanvas, 0, 0);

  const timestamp = new Date().toLocaleString('zh-TW', { hour12: false }).replace(/\//g, '-');
  ctx.fillStyle = 'rgba(30, 41, 59, 0.65)';
  ctx.font = `${11 * ratio}px sans-serif`;
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'right';
  const margin = 4 * ratio;
  ctx.fillText(timestamp, composite.width - margin, composite.height - margin);

  return composite.toDataURL('image/png');
}

export default function SignClient({ id }: { id: string }) {
  const [info, setInfo] = useState<SignInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [hasSignature, setHasSignature] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // 合約每一頁自己渲染成圖片直接嵌在頁面裡（用 pdfjs-dist），
  // 不用瀏覽器內建的 PDF 檢視器，因為工具列、縮圖側欄在手機上又雜又不穩定
  const [pdfPageImages, setPdfPageImages] = useState<string[]>([]);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const padRef = useRef<SignaturePad | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/sign-requests/${id}/sign`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '讀取失敗');
        setInfo(data);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : '讀取失敗');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!info || info.status !== 'pending') return;
    (async () => {
      setPdfLoading(true);
      setPdfError('');
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

        const res = await fetch(info.fileUrl);
        if (!res.ok) throw new Error('無法讀取合約檔案');
        const buffer = await res.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

        const containerWidth = Math.min(window.innerWidth - 32, 640);
        // 手機螢幕的實際像素密度通常是 2~3 倍，只照 CSS 寬度渲染會讓圖片顯示時被放大、變模糊，
        // 渲染解析度要乘上 devicePixelRatio 才會清晰（上限 3 避免超大合約在手機上太吃記憶體）
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 3);
        const images: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = (containerWidth / baseViewport.width) * pixelRatio;
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          await page.render({ canvas, canvasContext: ctx, viewport }).promise;
          images.push(canvas.toDataURL('image/png'));
        }
        setPdfPageImages(images);
      } catch {
        setPdfError('無法預覽這份合約內容，可以先另開檔案確認內容後再回來簽名');
      } finally {
        setPdfLoading(false);
      }
    })();
  }, [info]);

  const setupCanvas = useCallback((canvas: HTMLCanvasElement) => {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    canvas.getContext('2d')?.scale(ratio, ratio);
    padRef.current?.clear();
  }, []);

  useEffect(() => {
    if (!info || info.status !== 'pending') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pad = new SignaturePad(canvas, { minWidth: 1.2, maxWidth: 2.8, penColor: '#1e293b' });
    padRef.current = pad;
    pad.addEventListener('endStroke', () => setHasSignature(!pad.isEmpty()));

    setupCanvas(canvas);
    const handleResize = () => setupCanvas(canvas);
    window.addEventListener('resize', handleResize);

    // 光靠 CSS 的 touch-action: none 在部分手機瀏覽器攔不住由上往下畫觸發的頁面捲動，
    // 額外掛一個非 passive 的 touchmove 監聽器強制擋掉（signature_pad 官方文件建議的作法）
    const preventScrollWhileSigning = (e: TouchEvent) => {
      if (e.target === canvas) e.preventDefault();
    };
    document.body.addEventListener('touchmove', preventScrollWhileSigning, { passive: false });

    return () => {
      window.removeEventListener('resize', handleResize);
      document.body.removeEventListener('touchmove', preventScrollWhileSigning);
      pad.off();
    };
  }, [info, setupCanvas]);

  function handleClear() {
    padRef.current?.clear();
    setHasSignature(false);
  }

  async function handleSubmit() {
    if (!padRef.current || padRef.current.isEmpty()) {
      setSubmitError('請先簽名');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const signatureDataUrl = buildAttestationImage(canvasRef.current!);
      const res = await fetch(`/api/sign-requests/${id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureDataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '送出失敗');
      setInfo((prev) => (prev ? { ...prev, ...data } : prev));
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '送出失敗');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-slate-400 text-sm">讀取中...</p>
      </main>
    );
  }

  if (loadError || !info) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-red-500 text-sm">{loadError || '找不到這份合約'}</p>
      </main>
    );
  }

  if (info.status === 'signed') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-100 p-8 text-center">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center gap-3">
          <span className="text-4xl">✅</span>
          <h1 className="text-xl font-bold text-slate-800">已完成簽署</h1>
          {info.signedAt && (
            <p className="text-sm text-slate-500">
              簽署時間：{new Date(info.signedAt).toLocaleString('zh-TW')}
            </p>
          )}
          {info.signedFileUrl && (
            <a
              href={info.signedFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 text-sm font-semibold text-indigo-600 underline"
            >
              查看已簽署的合約
            </a>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center gap-4 bg-slate-100 p-4 sm:p-8">
      <div className="w-full max-w-2xl flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-bold text-slate-800">請閱讀合約並簽名</h1>
        <p className="text-sm text-slate-500">{info.fileName}</p>
      </div>

      <div className="w-full max-w-2xl flex flex-col gap-3">
        {pdfLoading && (
          <div className="bg-white rounded-2xl shadow-lg py-16 text-center">
            <p className="text-sm text-slate-400">合約讀取中...</p>
          </div>
        )}
        {pdfError && (
          <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center gap-2 text-center">
            <p className="text-sm text-red-500">{pdfError}</p>
            <a
              href={info.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-indigo-600 underline"
            >
              另開合約檔案
            </a>
          </div>
        )}
        {pdfPageImages.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={src} alt={`合約第 ${i + 1} 頁`} className="w-full rounded-2xl shadow-lg bg-white" />
        ))}
      </div>

      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-4 sm:p-6 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold text-slate-500">請在下方用手指簽名</p>
          <canvas
            ref={canvasRef}
            className="w-full rounded-xl border-2 border-dashed border-slate-300 touch-none"
            style={{ height: 180 }}
          />
          <button
            type="button"
            onClick={handleClear}
            className="self-end text-xs text-slate-400 hover:text-slate-600 underline"
          >
            清除重簽
          </button>
        </div>

        {submitError && <p className="text-center text-red-500 text-sm">{submitError}</p>}

        <button
          onClick={handleSubmit}
          disabled={submitting || !hasSignature}
          className="w-full flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-indigo-600 disabled:bg-gray-300 text-white font-bold shadow-lg hover:bg-indigo-700 transition-colors"
        >
          {submitting && (
            <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
          )}
          {submitting ? '送出中...' : '確認簽署'}
        </button>
      </div>
    </main>
  );
}
