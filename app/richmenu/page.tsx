'use client';

import { useEffect, useRef, useState } from 'react';
import {
  TEMPLATES,
  sizesForCategory,
  getTemplate,
  type Region,
} from '@/app/lib/richmenuTemplates';

const DEFAULT_LABELS = ['我要預約', '價目表', '地址導航', 'Google評論', 'AI客服諮詢', 'FB/IG'];
const STYLE_OPTIONS = ['日系手繪', '簡約線條', '可愛療癒', '科技感', '奢華質感', '復古懷舊'];
const MAX_LOGO_BYTES = 4 * 1024 * 1024; // 4MB

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function defaultLabelFor(index: number) {
  return DEFAULT_LABELS[index] ?? `選單 ${index + 1}`;
}

function buildLabels(count: number, prev: string[]) {
  return Array.from({ length: count }, (_, i) => prev[i] ?? defaultLabelFor(i));
}

function RegionLayout({
  regions,
  ratio,
  renderCell,
}: {
  regions: Region[];
  ratio: number;
  renderCell: (region: Region, index: number) => React.ReactNode;
}) {
  return (
    <div className="relative w-full rounded-xl overflow-hidden" style={{ aspectRatio: ratio }}>
      {regions.map((r, i) => (
        <div
          key={i}
          className="absolute box-border p-[3px]"
          style={{
            left: `${r.x * 100}%`,
            top: `${r.y * 100}%`,
            width: `${r.w * 100}%`,
            height: `${r.h * 100}%`,
          }}
        >
          {renderCell(r, i)}
        </div>
      ))}
    </div>
  );
}

export default function RichMenuPage() {
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id);
  const template = getTemplate(templateId);
  const sizeOptions = sizesForCategory(template.category);

  const [sizeId, setSizeId] = useState(sizeOptions[0].id);
  const [labels, setLabels] = useState<string[]>(buildLabels(template.regions.length, []));

  const [storeType, setStoreType] = useState('');
  const [style, setStyle] = useState(STYLE_OPTIONS[0]);
  const [colorPreference, setColorPreference] = useState('');
  const [extraNotes, setExtraNotes] = useState('');
  const [logoFile, setLogoFile] = useState<{ base64: string; mimeType: string; previewUrl: string } | null>(
    null
  );
  const [logoError, setLogoError] = useState('');

  const [loading, setLoading] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageDims, setImageDims] = useState<{ width: number; height: number } | null>(null);
  const [usage, setUsage] = useState<{
    model: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    costUsd: number;
  } | null>(null);
  const [error, setError] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [accessCode, setAccessCode] = useState('');
  const [editInstruction, setEditInstruction] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editHistory, setEditHistory] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('richmenu-access-code');
      if (saved) setAccessCode(saved);
    } catch {
      // ignore unavailable storage
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('richmenu-access-code', accessCode);
    } catch {
      // ignore unavailable storage
    }
  }, [accessCode]);

  useEffect(() => {
    if (!loading && !editLoading) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    setElapsedSec(0);
    timerRef.current = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, editLoading]);

  function selectTemplate(id: string) {
    const next = getTemplate(id);
    setTemplateId(id);
    setLabels((prev) => buildLabels(next.regions.length, prev));
    const nextSizes = sizesForCategory(next.category);
    if (!nextSizes.some((s) => s.id === sizeId)) {
      setSizeId(nextSizes[0].id);
    }
  }

  function updateLabel(index: number, value: string) {
    setLabels((prev) => prev.map((l, i) => (i === index ? value : l)));
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setLogoError('');
    if (!file.type.startsWith('image/')) {
      setLogoError('請上傳圖片檔案');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError('檔案太大，請上傳 4MB 以下的圖片');
      return;
    }
    const base64 = await fileToBase64(file);
    setLogoFile({ base64, mimeType: file.type, previewUrl: URL.createObjectURL(file) });
  }

  function removeLogo() {
    if (logoFile) URL.revokeObjectURL(logoFile.previewUrl);
    setLogoFile(null);
  }

  async function handleGenerate() {
    setLoading(true);
    setError('');
    setImageDataUrl(null);
    setImageDims(null);
    setUsage(null);
    setEditHistory([]);
    try {
      const res = await fetch('/api/richmenu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          labels,
          templateId,
          size: sizeId,
          storeType,
          style,
          colorPreference,
          extraNotes,
          logo: logoFile ? { base64: logoFile.base64, mimeType: logoFile.mimeType } : null,
          accessCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '生成失敗，請稍後再試');
      setImageDataUrl(data.imageDataUrl);
      setImageDims({ width: data.width, height: data.height });
      if (data.usage) setUsage(data.usage);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  }

  async function handleEdit() {
    if (!imageDataUrl || !imageDims || !editInstruction.trim()) return;
    setEditLoading(true);
    setError('');
    try {
      const base64 = imageDataUrl.split(',')[1] ?? '';
      const res = await fetch('/api/richmenu/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: 'image/png',
          instruction: editInstruction.trim(),
          width: imageDims.width,
          height: imageDims.height,
          accessCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '修改失敗，請稍後再試');
      setImageDataUrl(data.imageDataUrl);
      setImageDims({ width: data.width, height: data.height });
      if (data.usage) setUsage(data.usage);
      setEditHistory((prev) => [...prev, editInstruction.trim()]);
      setEditInstruction('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '修改失敗，請稍後再試');
    } finally {
      setEditLoading(false);
    }
  }

  const largeTemplates = TEMPLATES.filter((t) => t.category === 'large');
  const smallTemplates = TEMPLATES.filter((t) => t.category === 'small');
  const currentRatio = sizeOptions.find((s) => s.id === sizeId)
    ? sizeOptions.find((s) => s.id === sizeId)!.width / sizeOptions.find((s) => s.id === sizeId)!.height
    : template.category === 'large'
      ? 2500 / 1686
      : 2500 / 843;

  return (
    <main className="min-h-screen flex flex-col items-center gap-8 p-8 bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600">
      <div className="flex flex-col items-center gap-1 mt-4">
        <h1
          className="text-4xl md:text-5xl font-extrabold text-white tracking-wide"
          style={{
            textShadow: '0 2px 6px rgba(0,0,0,0.25), 0 0 24px rgba(255,255,255,0.5)',
          }}
        >
          LINE 圖文選單生成器
        </h1>
        <p
          className="text-white text-sm font-semibold"
          style={{ textShadow: '0 1px 4px rgba(0,0,0,0.45)' }}
        >
          選擇 LINE 官方版型與格內文字，用 Gemini 生成官方帳號選單圖
        </p>
      </div>

      <div className="flex flex-col gap-5 w-full max-w-2xl bg-white/95 backdrop-blur rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col gap-2 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
            密碼
            <input
              type="password"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="請跟暐庭索取密碼"
              className="border border-gray-300 rounded-lg px-3 py-2 text-black text-sm outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
            />
          </label>
          <p className="text-[11px] text-amber-700 leading-relaxed">
            💡 每次生成圖片都會呼叫 AI 服務，會產生實際費用，所以需要密碼才能使用，方便管理花費歸屬。密碼請跟暐庭索取，輸入後會存在你這台裝置的瀏覽器裡，之後不用每次重打。
          </p>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-100 pt-4">
          <div>
            <p className="text-sm font-bold text-gray-700">
              大（{sizesForCategory('large').map((s) => `${s.width}×${s.height}`).join('、')}）
            </p>
            <p className="text-[11px] text-gray-400 mb-2">適合顯示版面較大或項目較多的圖文選單</p>
            <div className="grid grid-cols-4 gap-3">
              {largeTemplates.map((t) => (
                <TemplateThumb
                  key={t.id}
                  template={t}
                  selected={t.id === templateId}
                  onClick={() => selectTemplate(t.id)}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-bold text-gray-700 mt-2">
              小（{sizesForCategory('small').map((s) => `${s.width}×${s.height}`).join('、')}）
            </p>
            <p className="text-[11px] text-gray-400 mb-2">適合顯示版面較小或項目較少的圖文選單</p>
            <div className="grid grid-cols-4 gap-3">
              {smallTemplates.map((t) => (
                <TemplateThumb
                  key={t.id}
                  template={t}
                  selected={t.id === templateId}
                  onClick={() => selectTemplate(t.id)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-500">輸出解析度</p>
          <select
            value={sizeId}
            onChange={(e) => setSizeId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-black text-sm outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
          >
            {sizeOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.width} × {opt.height}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-500">品牌風格設定</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
              店家類型
              <input
                value={storeType}
                onChange={(e) => setStoreType(e.target.value)}
                placeholder="例如：美髮店、咖啡廳、健身房"
                className="border border-gray-300 rounded-lg px-3 py-2 text-black text-sm outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
              主色調偏好（選填）
              <input
                value={colorPreference}
                onChange={(e) => setColorPreference(e.target.value)}
                placeholder="例如：粉色系、大地色系"
                className="border border-gray-300 rounded-lg px-3 py-2 text-black text-sm outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </label>
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold text-gray-600">風格選擇</p>
            <div className="flex flex-wrap gap-2">
              {STYLE_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStyle(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    style === s
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-emerald-400'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
            補充描述（選填）
            <textarea
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
              rows={2}
              placeholder="例如：希望圖示帶點手繪感、避免使用尖銳線條..."
              className="border border-gray-300 rounded-lg px-3 py-2 text-black text-sm resize-none outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </label>

          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold text-gray-600">
              上傳 Logo（選填，作為風格參考，不會直接畫進圖片）
            </p>
            {logoFile ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoFile.previewUrl}
                  alt="Logo 預覽"
                  className="h-14 w-14 object-contain rounded-lg border border-gray-200 bg-white p-1"
                />
                <button
                  type="button"
                  onClick={removeLogo}
                  className="text-xs font-semibold text-red-500 hover:text-red-600"
                >
                  移除
                </button>
              </div>
            ) : (
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="text-xs text-gray-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-full file:border-0 file:bg-emerald-100 file:text-emerald-700 file:text-xs file:font-semibold hover:file:bg-emerald-200"
              />
            )}
            {logoError && <p className="text-xs text-red-500">{logoError}</p>}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-500">
            格內文字（依照 {template.label} 版型顯示）
          </p>
          <RegionLayout
            regions={template.regions}
            ratio={currentRatio}
            renderCell={(_, i) => (
              <input
                value={labels[i] ?? ''}
                onChange={(e) => updateLabel(i, e.target.value)}
                className="w-full h-full border border-gray-300 rounded-md px-2 text-black text-xs sm:text-sm text-center outline-none focus:ring-2 focus:ring-emerald-400 bg-emerald-50/60"
                placeholder={`第 ${i + 1} 格`}
              />
            )}
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-emerald-600 disabled:bg-emerald-500/80 disabled:cursor-not-allowed text-white font-bold shadow-lg hover:bg-emerald-700 hover:scale-105 active:scale-95 transition-transform"
        >
          {loading && (
            <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
          )}
          {loading ? `生成中，請稍候...（已等待 ${elapsedSec} 秒）` : '生成圖文選單'}
        </button>
        {loading && (
          <p className="text-center text-[11px] text-gray-400 -mt-2">
            圖片生成通常需要 10~30 秒，請耐心等候，不是當機
          </p>
        )}

        {error && <p className="text-center text-red-500 text-sm">{error}</p>}
      </div>

      {imageDataUrl && (
        <div className="flex flex-col items-center gap-3 w-full max-w-3xl bg-white/95 backdrop-blur rounded-3xl p-4 sm:p-6 shadow-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageDataUrl}
            alt="LINE Rich Menu 圖文選單"
            className="w-full rounded-2xl border border-gray-200"
          />
          {imageDims && (
            <p className="text-xs text-gray-500">
              輸出尺寸：{imageDims.width} × {imageDims.height}px
            </p>
          )}
          {usage && (
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
              <span>模型：{usage.model}</span>
              <span>輸入 {usage.inputTokens.toLocaleString()} tokens</span>
              <span>輸出 {usage.outputTokens.toLocaleString()} tokens</span>
              <span>
                預估花費：${usage.costUsd.toFixed(4)} USD（約 NT${(usage.costUsd * 31.5).toFixed(1)}）
              </span>
            </div>
          )}
          <a
            href={imageDataUrl}
            download="line-richmenu.png"
            className="px-6 py-2 rounded-full bg-emerald-600 text-white font-semibold text-sm shadow hover:bg-emerald-700 transition-colors"
          >
            下載圖片
          </a>

          <div className="w-full border-t border-gray-100 pt-4 flex flex-col gap-2">
            <p className="text-xs font-semibold text-gray-500">
              不滿意某個地方？用文字描述要怎麼改
            </p>
            {editHistory.length > 0 && (
              <ul className="text-[11px] text-gray-400 list-disc list-inside space-y-0.5">
                {editHistory.map((h, i) => (
                  <li key={i}>已套用：{h}</li>
                ))}
              </ul>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={editInstruction}
                onChange={(e) => setEditInstruction(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !editLoading) handleEdit();
                }}
                placeholder="例如：把價目表那格的亂碼文字去掉，改成清楚的中文字"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-black text-sm outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <button
                onClick={handleEdit}
                disabled={editLoading || !editInstruction.trim()}
                className="flex items-center justify-center gap-2 px-5 py-2 rounded-full bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold text-sm shadow hover:bg-emerald-700 transition-colors whitespace-nowrap"
              >
                {editLoading && (
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                )}
                {editLoading ? `修改中...（${elapsedSec}秒）` : '套用修改'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function TemplateThumb({
  template,
  selected,
  onClick,
}: {
  template: (typeof TEMPLATES)[number];
  selected: boolean;
  onClick: () => void;
}) {
  const ratio = template.category === 'large' ? 2500 / 1686 : 2500 / 843;
  return (
    <button
      type="button"
      onClick={onClick}
      title={template.label}
      className={`flex flex-col gap-1 rounded-lg border-2 p-1.5 transition-colors ${
        selected ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-emerald-300'
      }`}
    >
      <div className="relative w-full rounded overflow-hidden bg-gray-100" style={{ aspectRatio: ratio }}>
        {template.regions.map((r, i) => (
          <div
            key={i}
            className="absolute bg-gray-300 border border-white rounded-[2px]"
            style={{
              left: `${r.x * 100}%`,
              top: `${r.y * 100}%`,
              width: `${r.w * 100}%`,
              height: `${r.h * 100}%`,
            }}
          />
        ))}
      </div>
      <span className="text-[10px] leading-tight text-gray-500">{template.label}</span>
    </button>
  );
}
