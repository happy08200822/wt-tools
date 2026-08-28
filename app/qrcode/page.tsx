'use client';

import { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

type Mode = 'url' | 'wifi';
type Encryption = 'WPA' | 'WEP' | 'nopass';

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB
const QR_RESOLUTION = 800; // 實際輸出解析度（列印大尺寸也不會模糊）
const QR_DISPLAY_SIZE = 220; // 頁面上預覽顯示大小

const CAPTION_PRESETS = ['掃我加入 LINE', '掃我連 WiFi', '掃我看菜單', '掃我追蹤 IG'];

const ACCENT_COLORS = [
  { id: 'slate', hex: '#1e293b' },
  { id: 'emerald', hex: '#059669' },
  { id: 'rose', hex: '#e11d48' },
  { id: 'amber', hex: '#d97706' },
  { id: 'indigo', hex: '#4338ca' },
  { id: 'sky', hex: '#0284c7' },
];

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function escapeWifiField(s: string) {
  return s.replace(/([\\;,:"])/g, '\\$1');
}

function buildWifiValue(ssid: string, password: string, encryption: Encryption, hidden: boolean) {
  const parts = [
    'WIFI:',
    `T:${encryption};`,
    `S:${escapeWifiField(ssid)};`,
    encryption === 'nopass' ? '' : `P:${escapeWifiField(password)};`,
    `H:${hidden ? 'true' : 'false'};`,
    ';',
  ];
  return parts.join('');
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export default function QrCodePage() {
  const [mode, setMode] = useState<Mode>('url');

  const [urlInput, setUrlInput] = useState('');

  const [ssid, setSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [encryption, setEncryption] = useState<Encryption>('WPA');
  const [hidden, setHidden] = useState(false);

  const [logo, setLogo] = useState<string | null>(null);
  const [logoError, setLogoError] = useState('');

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [accent, setAccent] = useState(ACCENT_COLORS[0].hex);

  const [value, setValue] = useState('');
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  function handleGenerate() {
    if (mode === 'url') {
      const trimmed = urlInput.trim();
      if (!trimmed) return;
      setValue(trimmed);
    } else {
      if (!ssid.trim()) return;
      setValue(buildWifiValue(ssid.trim(), wifiPassword, encryption, hidden));
    }
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
      setLogoError('檔案太大，請上傳 2MB 以下的圖片');
      return;
    }
    setLogo(await fileToDataUrl(file));
  }

  function handleDownload() {
    const qrCanvas = canvasWrapperRef.current?.querySelector('canvas');
    if (!qrCanvas) return;

    const outerPad = 50;
    const qrFramePad = 28;
    const topBarHeight = 14;
    const titleHeight = title.trim() ? 100 : 0;
    const subtitleHeight = subtitle.trim() ? 60 : 0;
    const qrBoxSize = QR_RESOLUTION + qrFramePad * 2;
    const width = qrBoxSize + outerPad * 2;
    const height = topBarHeight + outerPad * 2 + titleHeight + qrBoxSize + subtitleHeight;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 卡片底色 + 陰影
    ctx.save();
    ctx.shadowColor = 'rgba(15, 23, 42, 0.15)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = '#ffffff';
    roundRectPath(ctx, 0, 0, width, height, 28);
    ctx.fill();
    ctx.restore();

    // 頂部色條
    ctx.save();
    roundRectPath(ctx, 0, 0, width, height, 28);
    ctx.clip();
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, width, topBarHeight);
    ctx.restore();

    let y = topBarHeight + outerPad;

    if (title.trim()) {
      ctx.fillStyle = accent;
      ctx.font = 'bold 52px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(title.trim(), width / 2, y);
      y += titleHeight;
    }

    // QR 外框
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    roundRectPath(ctx, outerPad, y, qrBoxSize, qrBoxSize, 20);
    ctx.stroke();
    ctx.drawImage(qrCanvas, outerPad + qrFramePad, y + qrFramePad, QR_RESOLUTION, QR_RESOLUTION);
    y += qrBoxSize;

    if (subtitle.trim()) {
      ctx.fillStyle = '#64748b';
      ctx.font = '34px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(subtitle.trim(), width / 2, y + 14);
    }

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = 'qrcode-card.png';
    link.click();
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8 bg-gradient-to-br from-slate-200 via-slate-400 to-slate-700">
      <div className="flex flex-col items-center gap-1">
        <h1
          className="text-4xl md:text-5xl font-extrabold text-white tracking-wide"
          style={{
            textShadow: '0 2px 6px rgba(0,0,0,0.25), 0 0 24px rgba(255,255,255,0.5)',
          }}
        >
          QR Code 產生器
        </h1>
        <p
          className="text-white text-sm font-semibold"
          style={{ textShadow: '0 1px 4px rgba(0,0,0,0.45)' }}
        >
          網址或 WiFi 分享，加上文字說明，一鍵生成可列印的卡片
        </p>
      </div>

      <div
        className={`flex flex-col lg:flex-row gap-6 w-full items-start justify-center ${
          value ? 'max-w-3xl' : 'max-w-sm'
        }`}
      >
        <div className="flex flex-col gap-5 w-full lg:w-[380px] bg-white/95 backdrop-blur rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="flex gap-2 w-full bg-gray-100 rounded-full p-1">
            {(['url', 'wifi'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                  mode === m ? 'bg-slate-800 text-white' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {m === 'url' ? '網址' : 'WiFi 分享'}
              </button>
            ))}
          </div>

          {mode === 'url' ? (
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              placeholder="https://example.com"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-black text-sm outline-none focus:ring-2 focus:ring-slate-400"
            />
          ) : (
            <div className="flex flex-col gap-2 w-full">
              <input
                value={ssid}
                onChange={(e) => setSsid(e.target.value)}
                placeholder="WiFi 名稱 (SSID)"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black text-sm outline-none focus:ring-2 focus:ring-slate-400"
              />
              <select
                value={encryption}
                onChange={(e) => setEncryption(e.target.value as Encryption)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black text-sm outline-none focus:ring-2 focus:ring-slate-400 bg-white"
              >
                <option value="WPA">WPA/WPA2</option>
                <option value="WEP">WEP</option>
                <option value="nopass">無密碼</option>
              </select>
              {encryption !== 'nopass' && (
                <input
                  type="text"
                  value={wifiPassword}
                  onChange={(e) => setWifiPassword(e.target.value)}
                  placeholder="WiFi 密碼"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black text-sm outline-none focus:ring-2 focus:ring-slate-400"
                />
              )}
              <label className="flex items-center gap-2 text-xs text-gray-600">
                <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} />
                隱藏網路（SSID 未廣播）
              </label>
            </div>
          )}

          <div className="flex flex-col gap-1 w-full">
            <p className="text-xs font-semibold text-gray-600">中間加 Logo（選填）</p>
            {logo ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logo} alt="Logo 預覽" className="h-10 w-10 object-contain rounded border border-gray-200 p-1" />
                <button
                  type="button"
                  onClick={() => setLogo(null)}
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
                className="text-xs text-gray-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-full file:border-0 file:bg-slate-100 file:text-slate-700 file:text-xs file:font-semibold hover:file:bg-slate-200"
              />
            )}
            {logoError && <p className="text-xs text-red-500">{logoError}</p>}
          </div>

          <div className="flex flex-col gap-2 w-full border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-600">主題色</p>
            <div className="flex gap-2">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setAccent(c.hex)}
                  aria-label={c.id}
                  className={`h-7 w-7 rounded-full border-2 transition-transform ${
                    accent === c.hex ? 'scale-110 border-slate-800' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 w-full border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-600">卡片文字說明（選填）</p>
            <div className="flex flex-wrap gap-1.5">
              {CAPTION_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTitle(preset)}
                  className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold hover:bg-slate-200"
                >
                  {preset}
                </button>
              ))}
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="標題，例如：掃我加入 LINE"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black text-sm outline-none focus:ring-2 focus:ring-slate-400"
            />
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="副標（選填），例如：即享會員優惠"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-black text-sm outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={mode === 'url' ? !urlInput.trim() : !ssid.trim()}
            className="w-full px-8 py-3 rounded-full bg-slate-800 disabled:bg-gray-300 text-white font-bold shadow-lg hover:bg-slate-900 hover:scale-105 active:scale-95 transition-transform"
          >
            生成 QR Code
          </button>
        </div>

        {value && (
          <div className="flex flex-col items-center w-full lg:w-[320px] bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="h-3.5 w-full" style={{ backgroundColor: accent }} />
            <div className="flex flex-col items-center gap-4 p-6">
              {title.trim() && (
                <p className="text-lg font-extrabold text-center" style={{ color: accent }}>
                  {title.trim()}
                </p>
              )}
              <div
                ref={canvasWrapperRef}
                className="p-3.5 bg-white rounded-2xl border-2"
                style={{ borderColor: accent }}
              >
                <QRCodeCanvas
                  value={value}
                  size={QR_RESOLUTION}
                  style={{ width: QR_DISPLAY_SIZE, height: QR_DISPLAY_SIZE }}
                  fgColor={accent}
                  level={logo ? 'H' : 'M'}
                  includeMargin
                  imageSettings={
                    logo
                      ? {
                          src: logo,
                          height: QR_RESOLUTION * 0.2,
                          width: QR_RESOLUTION * 0.2,
                          excavate: true,
                        }
                      : undefined
                  }
                />
              </div>
              {subtitle.trim() && (
                <p className="text-sm text-slate-500 text-center">{subtitle.trim()}</p>
              )}
              <button
                onClick={handleDownload}
                className="mt-1 px-6 py-2 rounded-full text-white font-semibold text-sm shadow hover:opacity-90 transition-opacity"
                style={{ backgroundColor: accent }}
              >
                下載 PNG（{QR_RESOLUTION}px）
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
