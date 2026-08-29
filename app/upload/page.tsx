'use client';

import { useEffect, useState } from 'react';

type UploadedBlob = { url: string; pathname: string; contentType?: string; size?: number; uploadedAt?: string };

function formatSize(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<UploadedBlob | null>(null);
  const [copied, setCopied] = useState(false);

  const [gallery, setGallery] = useState<UploadedBlob[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);

  async function loadGallery() {
    setGalleryLoading(true);
    try {
      const res = await fetch('/api/upload');
      const data = await res.json();
      if (res.ok) setGallery(data);
    } catch {
      // 靜默失敗即可，不影響上傳功能
    } finally {
      setGalleryLoading(false);
    }
  }

  useEffect(() => {
    loadGallery();
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError('');
    setResult(null);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '上傳失敗');
      setResult(data);
      await loadGallery();
    } catch (err) {
      setError(err instanceof Error ? err.message : '上傳失敗');
    } finally {
      setUploading(false);
    }
  }

  async function handleCopy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center gap-8 p-8 bg-gradient-to-br from-orange-200 via-amber-400 to-orange-700">
      <div className="flex flex-col items-center gap-1 mt-4">
        <h1
          className="text-4xl md:text-5xl font-extrabold text-white tracking-wide"
          style={{ textShadow: '0 2px 6px rgba(0,0,0,0.25), 0 0 24px rgba(255,255,255,0.5)' }}
        >
          圖片上傳
        </h1>
        <p className="text-white text-sm font-semibold" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.45)' }}>
          上傳到 Vercel Blob，取得圖片網址
        </p>
      </div>

      <div className="flex flex-col items-center gap-5 w-full max-w-sm bg-white/95 backdrop-blur rounded-3xl p-6 sm:p-8 shadow-2xl">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="w-full text-sm text-gray-600 file:mr-3 file:px-4 file:py-2 file:rounded-full file:border-0 file:bg-orange-100 file:text-orange-700 file:text-sm file:font-semibold hover:file:bg-orange-200"
        />

        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="預覽"
            className="w-full max-h-64 object-contain rounded-2xl border border-gray-200"
          />
        )}

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full px-8 py-3 rounded-full bg-orange-600 disabled:bg-gray-300 text-white font-bold shadow-lg hover:bg-orange-700 hover:scale-105 active:scale-95 transition-transform"
        >
          {uploading ? '上傳中...' : '上傳圖片'}
        </button>

        {error && <p className="text-center text-red-500 text-sm">{error}</p>}

        {result && (
          <div className="flex flex-col items-center gap-2 border-t border-gray-100 pt-4 w-full">
            <p className="text-xs font-semibold text-emerald-600">上傳成功！</p>
            <p className="text-xs text-gray-500 break-all text-center">{result.url}</p>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="px-4 py-1.5 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold hover:bg-orange-200"
              >
                {copied ? '已複製 ✓' : '複製網址'}
              </button>
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-1.5 rounded-full bg-orange-600 text-white text-xs font-semibold hover:bg-orange-700"
              >
                開啟圖片
              </a>
            </div>
          </div>
        )}
      </div>

      <div className="w-full max-w-3xl bg-white/95 backdrop-blur rounded-3xl p-6 shadow-2xl">
        <p className="text-sm font-bold text-gray-700 mb-3">
          已上傳的圖片{galleryLoading && '（讀取中...）'}
        </p>
        {!galleryLoading && gallery.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-6">目前還沒有上傳過任何圖片</p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {gallery.map((blob) => (
            <a
              key={blob.pathname}
              href={blob.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col gap-1"
            >
              <div className="aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={blob.url}
                  alt={blob.pathname}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <p className="text-[11px] text-gray-500 truncate">{blob.pathname}</p>
              <p className="text-[10px] text-gray-400">{formatSize(blob.size)}</p>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
