'use client';

import { useState } from 'react';

export default function ImageModal({ src, onClose }: { src: string; onClose: () => void }) {
  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState(1);

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-hidden">
      <button
        onClick={onClose}
        className="absolute z-10 top-4 right-4 text-white text-2xl leading-none w-9 h-9 rounded-full bg-white/10 hover:bg-white/20"
      >
        ✕
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute z-10 bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur rounded-full px-3 py-2"
      >
        <button onClick={() => setRotation((r) => r - 90)} className="text-white text-lg w-8 h-8 hover:bg-white/10 rounded-full">
          ↺
        </button>
        <button onClick={() => setRotation((r) => r + 90)} className="text-white text-lg w-8 h-8 hover:bg-white/10 rounded-full">
          ↻
        </button>
        <div className="w-px h-5 bg-white/20 mx-1" />
        <button
          onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
          className="text-white text-lg w-8 h-8 hover:bg-white/10 rounded-full"
        >
          －
        </button>
        <button
          onClick={() => {
            setScale(1);
            setRotation(0);
          }}
          className="text-white text-xs px-2 h-8 hover:bg-white/10 rounded-full"
        >
          重置
        </button>
        <button
          onClick={() => setScale((s) => Math.min(4, s + 0.25))}
          className="text-white text-lg w-8 h-8 hover:bg-white/10 rounded-full"
        >
          ＋
        </button>
      </div>

      <div className="w-full h-full flex items-center justify-center overflow-auto">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="收據照片"
          onClick={(e) => e.stopPropagation()}
          style={{ transform: `rotate(${rotation}deg) scale(${scale})` }}
          className="max-w-full max-h-full rounded-lg shadow-2xl transition-transform"
        />
      </div>
    </div>
  );
}
