'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import {
  Block,
  BLOCK_TYPE_LABEL,
  BUTTON_STYLE_LABEL,
  ButtonStyle,
  TEMPLATES,
  createBlock,
  buildFlexBubble,
  validateBlocks,
  lightenColor,
} from './blocks';

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

type StatusMessage = { text: string; type: 'error' | 'warning' } | null;

const ACCENT_COLORS = ['#00C800', '#06B6D4', '#F97316', '#8B5CF6', '#EF4444', '#334155'];

export default function LineCardPage() {
  const [liffLoaded, setLiffLoaded] = useState(false);
  const [liffReady, setLiffReady] = useState(false);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<StatusMessage>(null);

  const [templateId, setTemplateId] = useState(TEMPLATES[0].id);
  const [accentColor, setAccentColor] = useState(ACCENT_COLORS[0]);
  const [blocks, setBlocks] = useState<Block[]>(() => TEMPLATES[0].blocks());

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

  function applyTemplate(id: string) {
    const tpl = TEMPLATES.find((t) => t.id === id);
    if (!tpl) return;
    setTemplateId(id);
    setBlocks(tpl.blocks());
    setStatus(null);
  }

  function updateBlock(id: string, updater: (block: Block) => Block) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? updater(b) : b)));
  }

  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  function addBlock(type: Block['type']) {
    setBlocks((prev) => [...prev, createBlock(type)]);
  }

  function moveBlock(id: string, direction: -1 | 1) {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      const target = idx + direction;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  async function handleSend() {
    setStatus(null);

    if (!liffReady) {
      setStatus({ text: 'LIFF 尚未準備好，請稍候再試', type: 'warning' });
      return;
    }
    if (!window.liff.isApiAvailable('shareTargetPicker')) {
      setStatus({ text: '此環境不支援發送功能，請透過 LINE App 開啟此頁面', type: 'error' });
      return;
    }

    const validationError = validateBlocks(blocks);
    if (validationError) {
      setStatus({ text: validationError, type: 'error' });
      return;
    }

    const bubble = buildFlexBubble(blocks, accentColor);
    const header = blocks.find((b) => b.type === 'header');
    const altText = header && header.type === 'header' ? header.title : '卡片訊息';

    setSending(true);
    try {
      const result = await window.liff.shareTargetPicker([
        { type: 'flex', altText: altText || '卡片訊息', contents: bubble },
      ]);
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
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800">LINE 卡片發送器</h1>
          <p className="text-sm text-gray-500">選擇模板、自由編輯內容，即時預覽後直接發送</p>
        </div>

        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
          {/* 左側：模板選擇 + 區塊編輯器 */}
          <div className="flex flex-col gap-5">
            <section className="bg-white rounded-2xl shadow p-5">
              <p className="text-sm font-bold text-gray-700 mb-3">選擇模板</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => applyTemplate(tpl.id)}
                    className={`text-left rounded-xl border-2 px-3 py-2 transition-colors ${
                      templateId === tpl.id
                        ? 'border-[--accent] bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={templateId === tpl.id ? ({ '--accent': accentColor } as React.CSSProperties) : undefined}
                  >
                    <p className="text-sm font-bold text-gray-800">{tpl.label}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{tpl.description}</p>
                  </button>
                ))}
              </div>

              <p className="text-sm font-bold text-gray-700 mt-4 mb-2">主色</p>
              <div className="flex gap-2">
                {ACCENT_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setAccentColor(c)}
                    className={`h-7 w-7 rounded-full border-2 ${
                      accentColor === c ? 'border-gray-700 scale-110' : 'border-white'
                    } transition-transform shadow`}
                    style={{ backgroundColor: c }}
                    aria-label={c}
                  />
                ))}
              </div>
            </section>

            <section className="bg-white rounded-2xl shadow p-5 flex flex-col gap-3">
              <p className="text-sm font-bold text-gray-700">卡片內容區塊</p>

              {blocks.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-6">還沒有任何區塊，請從下方新增</p>
              )}

              {blocks.map((block, idx) => (
                <BlockEditor
                  key={block.id}
                  block={block}
                  isFirst={idx === 0}
                  isLast={idx === blocks.length - 1}
                  onChange={(updater) => updateBlock(block.id, updater)}
                  onRemove={() => removeBlock(block.id)}
                  onMove={(dir) => moveBlock(block.id, dir)}
                />
              ))}

              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                {(Object.keys(BLOCK_TYPE_LABEL) as Block['type'][]).map((type) => (
                  <button
                    key={type}
                    onClick={() => addBlock(type)}
                    className="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                    ＋ {BLOCK_TYPE_LABEL[type]}
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* 右側：即時預覽 + 發送 */}
          <div className="lg:sticky lg:top-6 flex flex-col gap-4">
            <section className="bg-gray-100 rounded-2xl shadow p-5 flex flex-col items-center">
              <p className="text-sm font-bold text-gray-700 self-start mb-3">預覽</p>
              <CardPreview blocks={blocks} accentColor={accentColor} />
            </section>

            {status && (
              <div
                className={`rounded-xl px-4 py-3 text-sm font-semibold text-center ${
                  status.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {status.text}
              </div>
            )}

            <button
              onClick={handleSend}
              disabled={sending || !liffReady}
              className="w-full px-8 py-3 rounded-full bg-[#00C800] disabled:bg-gray-300 text-white font-bold shadow-lg hover:brightness-95 transition-all"
            >
              {sending ? '發送中...' : liffReady ? '選擇聊天室發送' : '準備中...'}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}

function BlockEditor({
  block,
  isFirst,
  isLast,
  onChange,
  onRemove,
  onMove,
}: {
  block: Block;
  isFirst: boolean;
  isLast: boolean;
  onChange: (updater: (block: Block) => Block) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-gray-500">{BLOCK_TYPE_LABEL[block.type]}</p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onMove(-1)}
            disabled={isFirst}
            className="text-xs text-gray-400 disabled:opacity-30 hover:text-gray-600 px-1.5"
          >
            ↑
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={isLast}
            className="text-xs text-gray-400 disabled:opacity-30 hover:text-gray-600 px-1.5"
          >
            ↓
          </button>
          <button onClick={onRemove} className="text-xs text-red-400 hover:text-red-600 px-1.5">
            刪除
          </button>
        </div>
      </div>

      {block.type === 'header' && (
        <input
          value={block.title}
          onChange={(e) => onChange((b) => (b.type === 'header' ? { ...b, title: e.target.value } : b))}
          placeholder="標題文字"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-900 bg-white placeholder:text-gray-400"
        />
      )}

      {block.type === 'hero' && <HeroEditor block={block} onChange={onChange} />}

      {block.type === 'text' && (
        <textarea
          value={block.text}
          onChange={(e) => onChange((b) => (b.type === 'text' ? { ...b, text: e.target.value } : b))}
          placeholder="文字內容"
          rows={3}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 resize-none text-gray-900 bg-white placeholder:text-gray-400"
        />
      )}

      {block.type === 'infoRows' && (
        <div className="flex flex-col gap-1.5">
          {block.rows.map((row, i) => (
            <div key={i} className="flex gap-1.5">
              <input
                value={row.label}
                onChange={(e) =>
                  onChange((b) => {
                    if (b.type !== 'infoRows') return b;
                    const rows = [...b.rows];
                    rows[i] = { ...rows[i], label: e.target.value };
                    return { ...b, rows };
                  })
                }
                placeholder="項目"
                className="w-24 text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-900 bg-white placeholder:text-gray-400"
              />
              <input
                value={row.value}
                onChange={(e) =>
                  onChange((b) => {
                    if (b.type !== 'infoRows') return b;
                    const rows = [...b.rows];
                    rows[i] = { ...rows[i], value: e.target.value };
                    return { ...b, rows };
                  })
                }
                placeholder="內容"
                className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-900 bg-white placeholder:text-gray-400"
              />
              <button
                onClick={() =>
                  onChange((b) => (b.type === 'infoRows' ? { ...b, rows: b.rows.filter((_, j) => j !== i) } : b))
                }
                className="text-xs text-gray-300 hover:text-red-500 px-1"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              onChange((b) =>
                b.type === 'infoRows' ? { ...b, rows: [...b.rows, { label: '', value: '' }] } : b
              )
            }
            className="text-xs text-gray-400 hover:text-gray-600 self-start"
          >
            ＋ 新增一列
          </button>
        </div>
      )}

      {block.type === 'itemList' && (
        <div className="flex flex-col gap-1.5">
          {block.items.map((item, i) => (
            <div key={i} className="flex gap-1.5">
              <input
                value={item.name}
                onChange={(e) =>
                  onChange((b) => {
                    if (b.type !== 'itemList') return b;
                    const items = [...b.items];
                    items[i] = { ...items[i], name: e.target.value };
                    return { ...b, items };
                  })
                }
                placeholder="項目名稱"
                className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-900 bg-white placeholder:text-gray-400"
              />
              <input
                value={item.price}
                onChange={(e) =>
                  onChange((b) => {
                    if (b.type !== 'itemList') return b;
                    const items = [...b.items];
                    items[i] = { ...items[i], price: e.target.value };
                    return { ...b, items };
                  })
                }
                placeholder="金額"
                inputMode="numeric"
                className="w-20 text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-900 bg-white placeholder:text-gray-400"
              />
              <button
                onClick={() =>
                  onChange((b) => (b.type === 'itemList' ? { ...b, items: b.items.filter((_, j) => j !== i) } : b))
                }
                className="text-xs text-gray-300 hover:text-red-500 px-1"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              onChange((b) =>
                b.type === 'itemList' ? { ...b, items: [...b.items, { name: '', price: '0' }] } : b
              )
            }
            className="text-xs text-gray-400 hover:text-gray-600 self-start"
          >
            ＋ 新增項目
          </button>
        </div>
      )}

      {block.type === 'slotList' && (
        <div className="flex flex-col gap-1.5">
          {block.slots.map((slot, i) => (
            <div key={i} className="flex gap-1.5">
              <input
                value={slot}
                onChange={(e) =>
                  onChange((b) => {
                    if (b.type !== 'slotList') return b;
                    const slots = [...b.slots];
                    slots[i] = e.target.value;
                    return { ...b, slots };
                  })
                }
                placeholder="例：8/30（五）14:00"
                className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-900 bg-white placeholder:text-gray-400"
              />
              <button
                onClick={() =>
                  onChange((b) => (b.type === 'slotList' ? { ...b, slots: b.slots.filter((_, j) => j !== i) } : b))
                }
                className="text-xs text-gray-300 hover:text-red-500 px-1"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={() => onChange((b) => (b.type === 'slotList' ? { ...b, slots: [...b.slots, ''] } : b))}
            className="text-xs text-gray-400 hover:text-gray-600 self-start"
          >
            ＋ 新增時段
          </button>
        </div>
      )}

      {block.type === 'buttons' && (
        <div className="flex flex-col gap-1.5">
          {block.buttons.map((btn, i) => (
            <div key={i} className="flex flex-col gap-1 rounded-lg border border-gray-100 p-2">
              <div className="flex gap-1.5">
                <input
                  value={btn.label}
                  onChange={(e) =>
                    onChange((b) => {
                      if (b.type !== 'buttons') return b;
                      const buttons = [...b.buttons];
                      buttons[i] = { ...buttons[i], label: e.target.value };
                      return { ...b, buttons };
                    })
                  }
                  placeholder="按鈕文字"
                  className="w-24 text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-900 bg-white placeholder:text-gray-400"
                />
                <input
                  value={btn.url}
                  onChange={(e) =>
                    onChange((b) => {
                      if (b.type !== 'buttons') return b;
                      const buttons = [...b.buttons];
                      buttons[i] = { ...buttons[i], url: e.target.value };
                      return { ...b, buttons };
                    })
                  }
                  placeholder="https://"
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-900 bg-white placeholder:text-gray-400"
                />
                <button
                  onClick={() =>
                    onChange((b) =>
                      b.type === 'buttons' ? { ...b, buttons: b.buttons.filter((_, j) => j !== i) } : b
                    )
                  }
                  className="text-xs text-gray-300 hover:text-red-500 px-1"
                >
                  ✕
                </button>
              </div>
              <div className="flex gap-1">
                {(Object.keys(BUTTON_STYLE_LABEL) as ButtonStyle[]).map((style) => (
                  <button
                    key={style}
                    onClick={() =>
                      onChange((b) => {
                        if (b.type !== 'buttons') return b;
                        const buttons = [...b.buttons];
                        buttons[i] = { ...buttons[i], style };
                        return { ...b, buttons };
                      })
                    }
                    className={`text-[11px] px-2 py-0.5 rounded-full transition-colors ${
                      btn.style === style ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {BUTTON_STYLE_LABEL[style]}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {block.buttons.length < 2 && (
            <button
              onClick={() =>
                onChange((b) =>
                  b.type === 'buttons'
                    ? { ...b, buttons: [...b.buttons, { type: 'uri', label: '', url: 'https://', style: 'primary' }] }
                    : b
                )
              }
              className="text-xs text-gray-400 hover:text-gray-600 self-start"
            >
              ＋ 新增按鈕（最多 2 個）
            </button>
          )}
        </div>
      )}

      {block.type === 'footer' && (
        <input
          value={block.text}
          onChange={(e) => onChange((b) => (b.type === 'footer' ? { ...b, text: e.target.value } : b))}
          placeholder="公司/品牌名稱"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-900 bg-white placeholder:text-gray-400"
        />
      )}
    </div>
  );
}

function HeroEditor({
  block,
  onChange,
}: {
  block: Extract<Block, { type: 'hero' }>;
  onChange: (updater: (block: Block) => Block) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '上傳失敗');
      onChange((b) => (b.type === 'hero' ? { ...b, imageUrl: data.url } : b));
    } catch (err) {
      setError(err instanceof Error ? err.message : '上傳失敗');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <input
        value={block.imageUrl}
        onChange={(e) => onChange((b) => (b.type === 'hero' ? { ...b, imageUrl: e.target.value } : b))}
        placeholder="貼上圖片網址，或用下方上傳"
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-900 bg-white placeholder:text-gray-400"
      />
      <input
        type="file"
        accept="image/*"
        onChange={handleUpload}
        disabled={uploading}
        className="text-xs text-gray-500 file:mr-2 file:px-3 file:py-1 file:rounded-full file:border-0 file:bg-gray-100 file:text-gray-600 file:text-xs"
      />
      {uploading && <p className="text-xs text-gray-400">上傳中...</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function CardPreview({ blocks, accentColor }: { blocks: Block[]; accentColor: string }) {
  const header = blocks.find((b) => b.type === 'header');
  const hero = blocks.find((b) => b.type === 'hero' && b.imageUrl.trim());

  return (
    <div className="w-full max-w-[300px] bg-white rounded-2xl shadow-lg overflow-hidden">
      {hero && hero.type === 'hero' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={hero.imageUrl} alt="" className="w-full aspect-[20/13] object-cover" />
      )}
      {header && header.type === 'header' && (
        <div
          className="px-4 py-3 text-center"
          style={{ background: `linear-gradient(135deg, ${accentColor}, ${lightenColor(accentColor, 0.35)})` }}
        >
          <p className="text-white font-bold text-sm break-words">{header.title || ' '}</p>
        </div>
      )}
      <div className="p-4 flex flex-col gap-3">
        {blocks
          .filter((b) => b.type !== 'header' && b.type !== 'hero')
          .map((block) => (
            <PreviewBlock key={block.id} block={block} accentColor={accentColor} />
          ))}
      </div>
    </div>
  );
}

function PreviewBlock({ block, accentColor }: { block: Block; accentColor: string }) {
  switch (block.type) {
    case 'text':
      if (!block.text.trim()) return null;
      return <p className="text-sm text-gray-700 whitespace-pre-wrap">{block.text}</p>;

    case 'infoRows': {
      const rows = block.rows.filter((r) => r.label.trim() || r.value.trim());
      if (rows.length === 0) return null;
      return (
        <div className="bg-gray-50 rounded-lg p-3 flex flex-col gap-1.5">
          {rows.map((r, i) => (
            <div key={i} className="flex justify-between gap-2 text-sm">
              <span className="text-gray-500">{r.label}</span>
              <span className="font-bold text-gray-800 text-right">{r.value}</span>
            </div>
          ))}
        </div>
      );
    }

    case 'itemList': {
      const items = block.items.filter((i) => i.name.trim());
      if (items.length === 0) return null;
      const total = items.reduce((sum, i) => sum + (Number(i.price) || 0), 0);
      return (
        <div className="bg-gray-50 rounded-lg p-3 flex flex-col gap-1.5">
          {items.map((i, idx) => (
            <div key={idx} className="flex justify-between text-sm text-gray-700">
              <span>{i.name}</span>
              <span>${(Number(i.price) || 0).toLocaleString()}</span>
            </div>
          ))}
          <div className="border-t border-gray-200 mt-1 pt-1.5 flex justify-between text-sm font-bold">
            <span>總計</span>
            <span style={{ color: accentColor }}>${total.toLocaleString()}</span>
          </div>
        </div>
      );
    }

    case 'slotList': {
      const slots = block.slots.filter((s) => s.trim());
      if (slots.length === 0) return null;
      return (
        <div className="flex flex-col gap-1.5">
          {slots.map((s, i) => (
            <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700">
              🕒 {s}
            </div>
          ))}
        </div>
      );
    }

    case 'buttons': {
      const buttons = block.buttons.filter((b) => b.label.trim());
      if (buttons.length === 0) return null;
      return (
        <div className={`flex gap-2 ${buttons.length > 1 ? 'flex-row' : 'flex-col'}`}>
          {buttons.map((b, i) => {
            const style: React.CSSProperties =
              b.style === 'link'
                ? { color: accentColor, background: 'transparent', fontWeight: 700 }
                : b.style === 'secondary'
                  ? { backgroundColor: lightenColor(accentColor, 0.85), color: '#333333' }
                  : { backgroundColor: accentColor, color: '#FFFFFF' };
            return (
              <div key={i} className="flex-1 text-center text-sm font-bold rounded-lg px-3 py-2" style={style}>
                {b.label}
              </div>
            );
          })}
        </div>
      );
    }

    case 'footer':
      if (!block.text.trim()) return null;
      return (
        <div className="border-t border-gray-100 pt-2 mt-1">
          <p className="text-center text-[11px] text-gray-400">{block.text}</p>
        </div>
      );

    default:
      return null;
  }
}
