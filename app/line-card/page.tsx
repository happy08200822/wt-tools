'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

declare global {
  interface Window {
    liff: {
      init: (config: { liffId: string }) => Promise<void>;
      isLoggedIn: () => boolean;
      login: () => void;
      isApiAvailable: (name: string) => boolean;
      shareTargetPicker: (messages: unknown[]) => Promise<unknown>;
      closeWindow: () => void;
    };
  }
}

const LIFF_ID = '2005817629-5BePAHi6';
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

type StatusType = 'error' | 'warning';

function defaultDateTimeLocal() {
  const now = new Date();
  now.setHours(now.getHours() + 1, 0, 0, 0);
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function formatDisplayTime(value: string) {
  if (!value) return '';
  const d = new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const w = WEEKDAYS[d.getDay()];
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}/${m}/${day} (${w}) ${h}:${min}`;
}

function buildCardJSON(formattedTimeText: string, salesVal: string) {
  return {
    type: 'bubble',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: '#00C800',
      paddingAll: '16px',
      contents: [
        {
          type: 'text',
          text: '🗓️ 線上展示預約成功',
          color: '#FFFFFF',
          weight: 'bold',
          size: 'lg',
          align: 'center',
        },
      ],
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'md',
      paddingAll: '18px',
      contents: [
        {
          type: 'text',
          text: '親愛的老闆您好，已為您安排線上展示',
          wrap: true,
          size: 'sm',
          color: '#333333',
        },
        {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#F7F8FA',
          cornerRadius: 'md',
          paddingAll: '12px',
          spacing: 'sm',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '📅 時間', size: 'sm', color: '#666666', flex: 2 },
                {
                  type: 'text',
                  text: formattedTimeText,
                  size: 'sm',
                  weight: 'bold',
                  color: '#111111',
                  flex: 5,
                  wrap: true,
                },
              ],
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '👤 業務', size: 'sm', color: '#666666', flex: 2 },
                {
                  type: 'text',
                  text: salesVal,
                  size: 'sm',
                  weight: 'bold',
                  color: '#111111',
                  flex: 5,
                },
              ],
            },
          ],
        },
        {
          type: 'text',
          text: '💻 建議設備：\n建議使用電腦或平板參與，畫面較大且字體清晰，能獲得最佳展示體驗唷！暐庭將於展示前 5 分鐘發送會議連結，在請留意訊息唷！',
          wrap: true,
          size: 'xs',
          color: '#444444',
        },
        {
          type: 'text',
          text: '💡 重要提醒：\n若您預計使用手機參與，請先下載 Google Meet App，以確保連結能順利開啟唷！',
          wrap: true,
          size: 'xs',
          color: '#444444',
        },
        {
          type: 'text',
          text: '⬇️下方按鈕點擊可直接下載唷⬇️',
          wrap: true,
          size: 'sm',
          color: '#444444',
        },
        {
          type: 'box',
          layout: 'horizontal',
          spacing: 'md',
          margin: 'md',
          contents: [
            {
              type: 'box',
              layout: 'vertical',
              flex: 1,
              contents: [
                {
                  type: 'button',
                  action: {
                    type: 'uri',
                    label: 'iOS 下載',
                    uri: 'https://apps.apple.com/tw/app/google-meet/id1096918571',
                  },
                  style: 'secondary',
                  height: 'sm',
                },
              ],
            },
            {
              type: 'box',
              layout: 'vertical',
              flex: 1,
              contents: [
                {
                  type: 'button',
                  action: {
                    type: 'uri',
                    label: '安卓下載',
                    uri: 'https://play.google.com/store/apps/details?id=com.google.android.apps.tachyon',
                  },
                  style: 'secondary',
                  height: 'sm',
                },
              ],
            },
          ],
        },
        { type: 'separator', margin: 'lg' },
        {
          type: 'text',
          text: 'ezPretty 預約科技',
          align: 'center',
          size: 'xs',
          color: '#AAAAAA',
          margin: 'md',
        },
      ],
    },
  };
}

export default function LineCardPage() {
  const [meetTime, setMeetTime] = useState('');
  const [salesName, setSalesName] = useState('暐庭');
  const [liffLoaded, setLiffLoaded] = useState(false);
  const [liffReady, setLiffReady] = useState(false);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ text: string; type: StatusType } | null>(null);

  useEffect(() => {
    setMeetTime(defaultDateTimeLocal());
  }, []);

  useEffect(() => {
    if (!liffLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        await window.liff.init({ liffId: LIFF_ID });
        if (!window.liff.isLoggedIn()) {
          window.liff.login();
          return;
        }
        if (!cancelled) setLiffReady(true);
      } catch (err) {
        if (!cancelled) {
          setStatus({
            text: `LIFF 初始化異常：${err instanceof Error ? err.message : String(err)}`,
            type: 'error',
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [liffLoaded]);

  const formattedTimeText = formatDisplayTime(meetTime);

  async function handleSend() {
    setStatus(null);

    if (!formattedTimeText) {
      setStatus({ text: '請選擇【預約展示時間】再進行發送！', type: 'error' });
      return;
    }

    const salesVal = salesName.trim();
    if (!salesVal) {
      setStatus({ text: '請填寫【業務名稱】再進行發送！', type: 'error' });
      return;
    }

    if (!liffReady) {
      setStatus({ text: '系統連線中，請稍候 2 秒再試一次。', type: 'warning' });
      return;
    }

    if (!window.liff.isApiAvailable('shareTargetPicker')) {
      setStatus({
        text: '目前環境不支援發送功能，請確認是在 LINE App 內開啟此連結。',
        type: 'error',
      });
      return;
    }

    setSending(true);
    try {
      const res = await window.liff.shareTargetPicker([
        {
          type: 'flex',
          altText: '🗓️ 線上展示預約成功通知',
          contents: buildCardJSON(formattedTimeText, salesVal),
        },
      ]);

      if (res) {
        window.liff.closeWindow();
      } else {
        setStatus({ text: '已取消發送。', type: 'warning' });
      }
    } catch (err) {
      setStatus({
        text: `發送失敗：${err instanceof Error ? err.message : JSON.stringify(err)}`,
        type: 'error',
      });
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
      <main className="min-h-screen flex items-center justify-center bg-gray-100 p-5">
        <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.08)] p-6">
          <h1 className="text-center text-[#00C800] text-xl font-bold mb-5">
            🗓️ 線上展示預約卡片發送器
          </h1>

          <div className="mb-4">
            <label className="block font-semibold text-sm text-gray-800 mb-1.5">
              📅 選擇展示日期與時間：
            </label>
            <input
              type="datetime-local"
              value={meetTime}
              onChange={(e) => setMeetTime(e.target.value)}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg text-[15px] text-black outline-none focus:border-[#00C800]"
            />
            <div className="mt-1.5 bg-gray-50 border border-dashed border-gray-300 rounded-lg px-3 py-2.5 text-[13px] text-gray-600">
              卡片顯示格式：{formattedTimeText || '請選擇時間'}
            </div>
          </div>

          <div className="mb-4">
            <label className="block font-semibold text-sm text-gray-800 mb-1.5">
              👤 業務/顧問名稱：
            </label>
            <input
              type="text"
              value={salesName}
              onChange={(e) => setSalesName(e.target.value)}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg text-[15px] text-black outline-none focus:border-[#00C800]"
            />
          </div>

          <button
            onClick={handleSend}
            disabled={sending}
            className="w-full bg-[#00C800] disabled:bg-gray-400 text-white font-bold py-3.5 rounded-[10px] shadow-[0_4px_8px_rgba(0,200,0,0.25)] disabled:shadow-none active:scale-[0.98] transition-transform mt-2"
          >
            {sending ? '正在開啟發送視窗...' : '發送約展卡片至群組/好友'}
          </button>

          {status && (
            <div
              className={`mt-3 p-2.5 rounded-md text-[13px] text-center border ${
                status.type === 'error'
                  ? 'bg-[#fff2f0] text-[#ff4d4f] border-[#ffccc7]'
                  : 'bg-[#fffbe6] text-[#faad14] border-[#ffe58f]'
              }`}
            >
              {status.text}
            </div>
          )}

          <p className="mt-4 text-xs text-gray-500 text-center leading-relaxed">
            💡 點擊發送後勾選對象即可傳送。
          </p>
        </div>
      </main>
    </>
  );
}
