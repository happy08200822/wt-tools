'use client';

import { useEffect, useRef, useState } from 'react';
import SignaturePad from 'signature_pad';
import { ATM_TRANSFER_LIMIT } from '@/app/lib/paymentConfig';

type SignInfo = {
  fileName: string;
  fileUrl: string;
  customerName: string;
  status: 'pending' | 'signed';
  signedAt?: string;
  signedFileUrl?: string;
  paymentAmount?: number;
  paymentChoice?: 'transfer' | 'atm' | 'card';
};

// 公司固定收款帳戶，跟金額無關的部分寫死在這裡，帳戶真的換了再改這裡就好。
// 畫面顯示保留「-」比較好讀，但複製帳號要用純數字，貼到不同銀行的網銀系統才不會因為
// 帳號欄位只吃數字、把「-」也算進字數而截斷或直接被拒絕
const BANK_ACCOUNT_NUMBER_DISPLAY = '2068-01-8000262-2';
const BANK_ACCOUNT_NUMBER_RAW = BANK_ACCOUNT_NUMBER_DISPLAY.replace(/-/g, '');
const BANK_TRANSFER_INFO = `[匯款帳號]
台新國際商業銀行

銀行代號：812
機構代碼：0687
銀行帳號：${BANK_ACCOUNT_NUMBER_DISPLAY}
機構名稱：建北分行
帳戶名：預約科技行銷股份有限公司`;

const NEXT_STEPS = [
  { title: '已收到您的合約', desc: '感謝您完成簽署，我們已經收到您簽名的合約囉！' },
  { title: '公司用印', desc: '我們會盡快為您完成公司用印。' },
  { title: '合約回傳', desc: '用印完成後，會將蓋好章的合約回傳給您留存，請留意後續通知。' },
];

// 只截取畫布上實際有簽名筆跡的最小範圍，四周空白全部裁掉。
// 簽名畫布現在是全螢幕直向的（手機直立時上下幾乎佔滿螢幕），但老闆在合約上框的簽名區塊通常是扁的
// （貼在乙方旁邊的一行空白）。如果直接把整塊直向畫布等比例塞進扁框裡，畫面會被壓得只剩中間一小條。
// 裁成只剩簽名筆跡本身之後，圖片的長寬比會自然反映簽名實際的形狀（人簽名通常是橫向書寫），
// 不管畫布本身是直的還是橫的，塞進框裡都會清楚飽滿。
function cropToInk(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = sourceCanvas.getContext('2d');
  if (!ctx) return sourceCanvas;

  const { width, height } = sourceCanvas;
  const { data } = ctx.getImageData(0, 0, width, height);

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) return sourceCanvas; // 沒偵測到墨跡，保底用原圖，理論上不會發生

  const inkWidth = maxX - minX + 1;
  const inkHeight = maxY - minY + 1;
  const padding = Math.max(8, Math.round(Math.max(inkWidth, inkHeight) * 0.08));

  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(width - 1, maxX + padding);
  maxY = Math.min(height - 1, maxY + padding);

  const cropped = document.createElement('canvas');
  cropped.width = maxX - minX + 1;
  cropped.height = maxY - minY + 1;
  const croppedCtx = cropped.getContext('2d');
  if (!croppedCtx) return sourceCanvas;
  croppedCtx.drawImage(sourceCanvas, minX, minY, cropped.width, cropped.height, 0, 0, cropped.width, cropped.height);
  return cropped;
}

// 把簽署日期時間（可能含中文）疊在簽名筆跡的右下角，合成同一張圖再送到後端。
// pdf-lib 的標準字型畫不出中文，所以文字要在瀏覽器這邊用 canvas 畫成圖片，
// 後端就完全不用處理中文文字，只要把這張圖貼到 PDF 上就好。
// 背景保持透明，因為這張圖現在會直接貼在合約原本頁面的空白處，不透明底會蓋出一塊色塊。
function buildAttestationImage(signatureCanvas: HTMLCanvasElement): string {
  const source = cropToInk(signatureCanvas);

  const composite = document.createElement('canvas');
  composite.width = source.width;
  composite.height = source.height;

  const ctx = composite.getContext('2d')!;
  ctx.drawImage(source, 0, 0);

  const timestamp = new Date().toLocaleString('zh-TW', { hour12: false }).replace(/\//g, '-');
  // 字級跟裁切後的圖片大小成比例，簽名裁得小時字也跟著縮小，避免蓋過筆跡
  const fontSize = Math.min(Math.max(source.height * 0.09, 14), 32);
  ctx.fillStyle = 'rgba(30, 41, 59, 0.65)';
  ctx.font = `${fontSize}px sans-serif`;
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'right';
  const margin = fontSize * 0.3;
  ctx.fillText(timestamp, composite.width - margin, composite.height - margin);

  return composite.toDataURL('image/png');
}

// 把一份 PDF 的每一頁自己渲染成圖片（用 pdfjs-dist），不用瀏覽器內建的 PDF 檢視器，
// 因為工具列、縮圖側欄在手機上又雜又不穩定。讀合約頁跟「查看已簽署合約」彈窗共用這個函式。
async function renderPdfPagesToImages(fileUrl: string): Promise<string[]> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const res = await fetch(fileUrl);
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
  return images;
}

// 鎖住背景頁面捲動：用 position: fixed 把 body 固定住，這比單純 overflow:hidden 在 iOS Safari
// 上更可靠。overscroll-behavior: none 是因為 LINE／IG 之類的內建瀏覽器常常是靠「頁面拉到底
// 還往下拉（overscroll/彈性回彈）」這個訊號判斷要不要把整個瀏覽器關掉，明確關掉這個回彈行為
// 可以減少被誤判成「使用者要滑掉」的機率。
// blockAllTouchMove 只給簽名彈窗用（整個彈窗都是簽名區，沒有東西需要捲動，可以全擋當最後一道防線）；
// 合約檢視彈窗裡面要能正常捲動看多頁合約，不能整個擋掉，改靠內層的 overscroll-contain 處理。
function useLockBodyScroll(blockAllTouchMove: boolean) {
  useEffect(() => {
    const scrollY = window.scrollY;
    const body = document.body;
    const html = document.documentElement;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      bodyOverscroll: body.style.overscrollBehavior,
      htmlOverscroll: html.style.overscrollBehavior,
    };
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    body.style.overscrollBehavior = 'none';
    html.style.overscrollBehavior = 'none';

    const blockTouchMove = (e: TouchEvent) => e.preventDefault();
    if (blockAllTouchMove) {
      document.addEventListener('touchmove', blockTouchMove, { passive: false });
    }

    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      body.style.overscrollBehavior = prev.bodyOverscroll;
      html.style.overscrollBehavior = prev.htmlOverscroll;
      if (blockAllTouchMove) {
        document.removeEventListener('touchmove', blockTouchMove);
      }
      window.scrollTo(0, scrollY);
    };
  }, [blockAllTouchMove]);
}

// 簽名用全螢幕彈窗，跟合約內容頁完全分開。
// 這樣不管手指怎麼滑（包含滑出簽名畫布以外的地方）都不會牽動到背景的合約捲動，
// 因為彈窗開著的時候背景本身就被鎖死、滑不動。
function SignatureModal({
  onCancel,
  onConfirm,
  submitting,
  submitError,
}: {
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
  submitting: boolean;
  submitError: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [hasSignature, setHasSignature] = useState(false);

  useLockBodyScroll(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setupCanvas = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      canvas.getContext('2d')?.scale(ratio, ratio);
      padRef.current?.clear();
    };

    const pad = new SignaturePad(canvas, { minWidth: 1.2, maxWidth: 2.8, penColor: '#1e293b' });
    padRef.current = pad;
    pad.addEventListener('endStroke', () => setHasSignature(!pad.isEmpty()));

    setupCanvas();
    const handleResize = () => setupCanvas();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      pad.off();
    };
  }, []);

  function handleClear() {
    padRef.current?.clear();
    setHasSignature(false);
  }

  function handleConfirm() {
    if (!padRef.current || padRef.current.isEmpty() || !canvasRef.current) return;
    onConfirm(buildAttestationImage(canvasRef.current));
  }

  return (
    <div className="fixed inset-0 z-50 flex touch-none flex-col bg-white">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
        <p className="text-sm font-bold text-slate-800">請在下方簽名</p>
        <button type="button" onClick={onCancel} className="text-sm text-slate-400 hover:text-slate-600">
          取消
        </button>
      </div>

      <canvas ref={canvasRef} className="w-full flex-1 touch-none" />

      <div className="flex shrink-0 flex-col gap-2 border-t border-slate-100 px-4 py-3">
        {submitError && <p className="text-center text-sm text-red-500">{submitError}</p>}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleClear}
            className="shrink-0 text-sm text-slate-400 underline hover:text-slate-600"
          >
            清除重簽
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!hasSignature || submitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-indigo-600 px-6 py-3 font-bold text-white shadow-lg transition-colors hover:bg-indigo-700 disabled:bg-gray-300"
          >
            {submitting && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            {submitting ? '送出中...' : '確認簽署'}
          </button>
        </div>
      </div>
    </div>
  );
}

// 查看合約用的懸浮視窗，取代原本開新分頁用瀏覽器內建 PDF 檢視器的做法（手機上不穩定）。
// 跟簽名彈窗共用同一套背景鎖定，但內容區塊本身要能正常上下捲動看多頁合約。
function ContractViewerModal({ title, fileUrl, onClose }: { title: string; fileUrl: string; onClose: () => void }) {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useLockBodyScroll(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const imgs = await renderPdfPagesToImages(fileUrl);
        setImages(imgs);
      } catch {
        setError('無法預覽這份合約，請改用下方連結另外開啟');
      } finally {
        setLoading(false);
      }
    })();
  }, [fileUrl]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-100">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <p className="text-sm font-bold text-slate-800">{title}</p>
        <button type="button" onClick={onClose} className="text-sm text-slate-400 hover:text-slate-600">
          關閉 ✕
        </button>
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain p-4">
        {loading && <p className="py-10 text-center text-sm text-slate-400">合約讀取中...</p>}
        {error && (
          <div className="mx-auto flex max-w-md flex-col items-center gap-2 rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-red-500">{error}</p>
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-indigo-600 underline"
            >
              另開合約檔案
            </a>
          </div>
        )}
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          {images.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt={`合約第 ${i + 1} 頁`} className="w-full rounded-2xl bg-white shadow-sm" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SignClient({ id }: { id: string }) {
  const [info, setInfo] = useState<SignInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [showContractModal, setShowContractModal] = useState(false);

  const [paymentChoice, setPaymentChoice] = useState<'transfer' | 'atm' | 'card' | null>(null);
  const [choosingPayment, setChoosingPayment] = useState(false);
  const [paymentChoiceError, setPaymentChoiceError] = useState('');
  const [copiedField, setCopiedField] = useState<'account' | 'full' | null>(null);

  // 合約每一頁自己渲染成圖片直接嵌在頁面裡
  const [pdfPageImages, setPdfPageImages] = useState<string[]>([]);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/sign-requests/${id}/sign`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '讀取失敗');
        setInfo(data);
        if (data.paymentChoice) setPaymentChoice(data.paymentChoice);
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
        const images = await renderPdfPagesToImages(info.fileUrl);
        setPdfPageImages(images);
      } catch {
        setPdfError('無法預覽這份合約內容，可以先另開檔案確認內容後再回來簽名');
      } finally {
        setPdfLoading(false);
      }
    })();
  }, [info]);

  async function handleConfirmSignature(signatureDataUrl: string) {
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch(`/api/sign-requests/${id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureDataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '送出失敗');
      setInfo((prev) => (prev ? { ...prev, ...data } : prev));
      setIsSignModalOpen(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '送出失敗');
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePaymentChoice(choice: 'transfer' | 'atm' | 'card') {
    setChoosingPayment(true);
    setPaymentChoiceError('');
    try {
      const res = await fetch(`/api/sign-requests/${id}/payment-choice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choice }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '送出失敗');
      setPaymentChoice(choice);
    } catch (err) {
      setPaymentChoiceError(err instanceof Error ? err.message : '送出失敗');
    } finally {
      setChoosingPayment(false);
    }
  }

  async function handleCopy(field: 'account' | 'full', text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 環境不支援剪貼簿也不擋主要流程
    }
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
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
    const amount = info.paymentAmount;
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-100 p-4 py-8 sm:p-8">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center gap-3 text-center">
          <span className="text-4xl">✅</span>
          <h1 className="text-xl font-bold text-slate-800">已完成簽署</h1>
          <p className="text-sm text-slate-600">已收到您的合約，謝謝您！我們會盡快完成用印，再把合約回傳給您唷 🙏</p>
          {info.signedAt && (
            <p className="text-sm text-slate-500">
              簽署時間：{new Date(info.signedAt).toLocaleString('zh-TW')}
            </p>
          )}
          {info.signedFileUrl && (
            <button
              type="button"
              onClick={() => setShowContractModal(true)}
              className="mt-2 text-sm font-semibold text-indigo-600 underline"
            >
              查看已簽署的合約
            </button>
          )}
        </div>

        {typeof amount === 'number' && (
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-6 flex flex-col gap-3">
            {!paymentChoice ? (
              <>
                <p className="text-center text-sm font-bold text-slate-800">請問您想使用哪一種付款方式？</p>
                {paymentChoiceError && <p className="text-center text-sm text-red-500">{paymentChoiceError}</p>}
                <div className="flex gap-3">
                  {amount >= ATM_TRANSFER_LIMIT ? (
                    <button
                      type="button"
                      onClick={() => handlePaymentChoice('transfer')}
                      disabled={choosingPayment}
                      className="flex-1 rounded-2xl border-2 border-slate-200 py-4 text-center text-sm font-bold text-slate-700 transition-colors hover:border-indigo-400 hover:bg-indigo-50 disabled:opacity-50"
                    >
                      <span className="block text-xl">🏦</span>我要匯款
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handlePaymentChoice('atm')}
                      disabled={choosingPayment}
                      className="flex-1 rounded-2xl border-2 border-slate-200 py-4 text-center text-sm font-bold text-slate-700 transition-colors hover:border-indigo-400 hover:bg-indigo-50 disabled:opacity-50"
                    >
                      <span className="block text-xl">🏧</span>ATM 虛擬帳號
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handlePaymentChoice('card')}
                    disabled={choosingPayment}
                    className="flex-1 rounded-2xl border-2 border-slate-200 py-4 text-center text-sm font-bold text-slate-700 transition-colors hover:border-indigo-400 hover:bg-indigo-50 disabled:opacity-50"
                  >
                    <span className="block text-xl">💳</span>我要刷卡
                  </button>
                </div>
              </>
            ) : paymentChoice === 'transfer' ? (
              <>
                <p className="text-sm font-bold text-slate-800">
                  ezPretty 預計與您收取 ${amount.toLocaleString()}，再麻煩匯款後，提供匯款後五碼呦🙆
                </p>
                <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 font-sans text-xs text-slate-600">
                  {BANK_TRANSFER_INFO}
                </pre>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy('account', BANK_ACCOUNT_NUMBER_RAW)}
                      className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700"
                    >
                      {copiedField === 'account' ? '已複製 ✓' : '複製帳號'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy('full', BANK_TRANSFER_INFO)}
                      className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700"
                    >
                      {copiedField === 'full' ? '已複製 ✓' : '複製完整資訊'}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPaymentChoice(null)}
                    className="shrink-0 text-xs text-slate-400 underline hover:text-slate-600"
                  >
                    選錯了？重新選擇
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-slate-800">已收到您的付款方式！</p>
                <p className="text-sm text-slate-600">
                  {paymentChoice === 'atm'
                    ? '我們會盡快為您提供 ATM 虛擬帳號，請留意後續通知。'
                    : '我們會盡快為您開通信用卡付款連結，請留意後續通知。'}
                </p>
                <button
                  type="button"
                  onClick={() => setPaymentChoice(null)}
                  className="self-center text-xs text-slate-400 underline hover:text-slate-600"
                >
                  選錯了？重新選擇
                </button>
              </>
            )}
          </div>
        )}

        <div className="w-full max-w-md">
          <p className="text-xs font-bold tracking-[0.2em] text-indigo-600 uppercase">What&apos;s Next</p>
          <h2 className="mt-1 mb-3 text-lg font-extrabold text-slate-900">簽約後的流程</h2>
          <div className="flex flex-col gap-3">
            {NEXT_STEPS.map((step, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-[0_8px_20px_-12px_rgba(15,23,42,0.15)]"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">{step.title}</p>
                  <p className="mt-0.5 text-[13px] text-slate-500">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {showContractModal && info.signedFileUrl && (
          <ContractViewerModal
            title="已簽署的合約"
            fileUrl={info.signedFileUrl}
            onClose={() => setShowContractModal(false)}
          />
        )}
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

      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-4 sm:p-6 flex flex-col gap-2">
        <p className="text-center text-sm text-slate-600">確認合約內容後，點下方按鈕開始簽名</p>
        <button
          type="button"
          onClick={() => setIsSignModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-indigo-600 text-white font-bold shadow-lg hover:bg-indigo-700 transition-colors"
        >
          ✍️ 開始簽名
        </button>
      </div>

      {isSignModalOpen && (
        <SignatureModal
          onCancel={() => setIsSignModalOpen(false)}
          onConfirm={handleConfirmSignature}
          submitting={submitting}
          submitError={submitError}
        />
      )}
    </main>
  );
}
