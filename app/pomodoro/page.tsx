'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Mode = 'work' | 'shortBreak' | 'longBreak';

const MODE_LABEL: Record<Mode, string> = {
  work: '專注',
  shortBreak: '短休息',
  longBreak: '長休息',
};

const MODE_ACCENT: Record<Mode, string> = {
  work: '#0284C7',
  shortBreak: '#10B981',
  longBreak: '#6366F1',
};

const MODE_BG: Record<Mode, string> = {
  work: 'from-sky-200 via-sky-400 to-blue-600',
  shortBreak: 'from-emerald-200 via-emerald-400 to-teal-600',
  longBreak: 'from-indigo-200 via-indigo-400 to-violet-600',
};

type SoundId =
  | 'single'
  | 'dingDong'
  | 'triple'
  | 'rising'
  | 'bell'
  | 'urgent'
  | 'chime'
  | 'alarm'
  | 'digital'
  | 'gentle';

const SOUND_OPTIONS: { id: SoundId; label: string }[] = [
  { id: 'single', label: '單聲嗶' },
  { id: 'dingDong', label: '兩段式叮咚' },
  { id: 'triple', label: '三聲連續嗶' },
  { id: 'rising', label: '上升音階' },
  { id: 'bell', label: '柔和鈴聲' },
  { id: 'urgent', label: '緊急連續嗶' },
  { id: 'chime', label: '清脆琶音' },
  { id: 'alarm', label: '警報聲' },
  { id: 'digital', label: '電子方波嗶' },
  { id: 'gentle', label: '輕柔漸弱音' },
];

function getAudioContextClass() {
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext
  );
}

function scheduleTone(
  ctx: AudioContext,
  startTime: number,
  freq: number,
  duration: number,
  peakGain = 0.2,
  waveform: OscillatorType = 'sine'
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = waveform;
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

function playSound(soundId: SoundId) {
  try {
    const ctx = new (getAudioContextClass())();
    const now = ctx.currentTime;

    switch (soundId) {
      case 'single':
        scheduleTone(ctx, now, 880, 0.3);
        break;
      case 'dingDong':
        scheduleTone(ctx, now, 988, 0.25);
        scheduleTone(ctx, now + 0.28, 740, 0.35);
        break;
      case 'triple':
        scheduleTone(ctx, now, 880, 0.15);
        scheduleTone(ctx, now + 0.2, 880, 0.15);
        scheduleTone(ctx, now + 0.4, 880, 0.15);
        break;
      case 'rising':
        scheduleTone(ctx, now, 523.25, 0.15);
        scheduleTone(ctx, now + 0.15, 659.25, 0.15);
        scheduleTone(ctx, now + 0.3, 783.99, 0.25);
        break;
      case 'bell':
        scheduleTone(ctx, now, 660, 0.9, 0.15);
        scheduleTone(ctx, now, 990, 0.7, 0.08);
        break;
      case 'urgent':
        scheduleTone(ctx, now, 1046.5, 0.1, 0.22, 'square');
        scheduleTone(ctx, now + 0.13, 1046.5, 0.1, 0.22, 'square');
        scheduleTone(ctx, now + 0.26, 1046.5, 0.1, 0.22, 'square');
        scheduleTone(ctx, now + 0.39, 1046.5, 0.15, 0.22, 'square');
        break;
      case 'chime':
        scheduleTone(ctx, now, 523.25, 0.2, 0.18, 'triangle');
        scheduleTone(ctx, now + 0.12, 659.25, 0.2, 0.18, 'triangle');
        scheduleTone(ctx, now + 0.24, 783.99, 0.2, 0.18, 'triangle');
        scheduleTone(ctx, now + 0.36, 1046.5, 0.35, 0.18, 'triangle');
        break;
      case 'alarm':
        scheduleTone(ctx, now, 700, 0.18, 0.22, 'square');
        scheduleTone(ctx, now + 0.2, 900, 0.18, 0.22, 'square');
        scheduleTone(ctx, now + 0.4, 700, 0.18, 0.22, 'square');
        scheduleTone(ctx, now + 0.6, 900, 0.18, 0.22, 'square');
        break;
      case 'digital':
        scheduleTone(ctx, now, 1200, 0.08, 0.2, 'square');
        scheduleTone(ctx, now + 0.12, 1200, 0.08, 0.2, 'square');
        break;
      case 'gentle':
        scheduleTone(ctx, now, 440, 1.1, 0.12, 'sine');
        break;
    }

    setTimeout(() => ctx.close(), 1500);
  } catch {
    // ignore environments without Web Audio support
  }
}

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function PomodoroPage() {
  const [workMin, setWorkMin] = useState(25);
  const [shortMin, setShortMin] = useState(5);
  const [longMin, setLongMin] = useState(15);

  const [mode, setMode] = useState<Mode>('work');
  const [secondsLeft, setSecondsLeft] = useState(workMin * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [soundId, setSoundId] = useState<SoundId>('single');
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);
  const [pendingNextMode, setPendingNextMode] = useState<Mode | null>(null);
  const [flashActive, setFlashActive] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('pomodoro-sound');
      if (saved && SOUND_OPTIONS.some((o) => o.id === saved)) {
        setSoundId(saved as SoundId);
      }
    } catch {
      // ignore unavailable storage
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('pomodoro-sound', soundId);
    } catch {
      // ignore unavailable storage
    }
  }, [soundId]);

  const durationsRef = useRef({ workMin, shortMin, longMin });
  durationsRef.current = { workMin, shortMin, longMin };

  const durationFor = (m: Mode) => {
    const d = durationsRef.current;
    if (m === 'work') return d.workMin;
    if (m === 'shortBreak') return d.shortMin;
    return d.longMin;
  };

  const totalSeconds = durationFor(mode) * 60;

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  useEffect(() => {
    if (secondsLeft !== 0 || !isRunning) return;

    // 時間到：暫停倒數，跳出確認視窗，提示音持續播放直到使用者按下確認
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 1600);
    setIsRunning(false);

    if (mode === 'work') {
      const nextCount = completedPomodoros + 1;
      const nextMode: Mode = nextCount % 4 === 0 ? 'longBreak' : 'shortBreak';
      setCompletedPomodoros(nextCount);
      setPendingNextMode(nextMode);
    } else {
      setPendingNextMode('work');
    }
    setShowTimeUpModal(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, isRunning]);

  useEffect(() => {
    if (!showTimeUpModal) return;
    playSound(soundId);
    const id = setInterval(() => playSound(soundId), 1800);
    return () => clearInterval(id);
  }, [showTimeUpModal, soundId]);

  function handleConfirmTimeUp() {
    const next = pendingNextMode ?? 'work';
    setShowTimeUpModal(false);
    setPendingNextMode(null);
    setMode(next);
    setSecondsLeft(durationFor(next) * 60);
    setIsRunning(true);
  }

  useEffect(() => {
    document.title = `${formatTime(secondsLeft)} - ${MODE_LABEL[mode]} | 番茄鐘`;
    return () => {
      document.title = 'WT-tools';
    };
  }, [secondsLeft, mode]);

  function handleModeChange(next: Mode) {
    setIsRunning(false);
    setMode(next);
    setSecondsLeft(durationFor(next) * 60);
  }

  function handleReset() {
    setIsRunning(false);
    setSecondsLeft(totalSeconds);
  }

  function handleDurationChange(next: Mode, minutes: number) {
    const clamped = Math.min(120, Math.max(1, minutes || 1));
    if (next === 'work') setWorkMin(clamped);
    if (next === 'shortBreak') setShortMin(clamped);
    if (next === 'longBreak') setLongMin(clamped);
    if (mode === next && !isRunning) setSecondsLeft(clamped * 60);
  }

  const remainingFraction = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;
  const ringDeg = remainingFraction * 360;
  const accent = MODE_ACCENT[mode];

  const ringStyle = useMemo(
    () => ({
      background: `conic-gradient(from -90deg, ${accent} 0deg ${ringDeg}deg, rgba(255,255,255,0.3) ${ringDeg}deg 360deg)`,
    }),
    [accent, ringDeg]
  );

  return (
    <main
      className={`relative min-h-screen flex flex-col items-center gap-8 p-8 bg-gradient-to-br ${MODE_BG[mode]} transition-colors duration-700`}
    >
      {flashActive && (
        <>
          <div className="fixed inset-0 z-40 pointer-events-none bg-white animate-ping" />
          <div className="fixed inset-0 z-40 pointer-events-none bg-white/60 animate-pulse" />
        </>
      )}

      {showTimeUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 bg-white rounded-3xl px-8 py-10 shadow-2xl max-w-xs w-[90%] text-center animate-bounce">
            <span className="text-6xl">⏰</span>
            <h2 className="text-2xl font-extrabold text-gray-800">
              {mode === 'work' ? '專注時間到！' : '休息時間到！'}
            </h2>
            <p className="text-gray-500 text-sm">
              按下確認即可停止提示音，並開始
              {mode === 'work'
                ? pendingNextMode === 'longBreak'
                  ? '長休息'
                  : '短休息'
                : '下一段專注時間'}
            </p>
            <button
              onClick={handleConfirmTimeUp}
              className="mt-2 px-8 py-3 rounded-full bg-emerald-500 text-white font-bold text-lg shadow-lg hover:bg-emerald-600 hover:scale-105 active:scale-95 transition-transform"
            >
              確認
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-1 mt-4">
        <h1
          className="text-4xl md:text-5xl font-extrabold text-white tracking-wide"
          style={{
            textShadow:
              '0 2px 6px rgba(0,0,0,0.25), 0 0 24px rgba(255,255,255,0.5)',
          }}
        >
          番茄鐘
        </h1>
        <p className="text-white/90 text-sm font-medium">
          專注工作，然後好好休息
        </p>
      </div>

      <div className="flex gap-2 bg-white/20 backdrop-blur rounded-full p-1">
        {(['work', 'shortBreak', 'longBreak'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => handleModeChange(m)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              mode === m
                ? 'bg-white text-gray-800 shadow'
                : 'text-white hover:bg-white/20'
            }`}
          >
            {MODE_LABEL[m]}
          </button>
        ))}
      </div>

      <div
        className={`relative w-72 h-72 rounded-full shadow-2xl transition-transform duration-300 ${
          flashActive ? 'animate-bounce scale-105' : ''
        }`}
        style={ringStyle}
      >
        <div className="absolute inset-4 rounded-full bg-white/95 flex flex-col items-center justify-center shadow-inner">
          <span className="text-5xl font-mono font-bold text-gray-800 tabular-nums">
            {formatTime(secondsLeft)}
          </span>
          <span className="text-sm font-semibold mt-1" style={{ color: accent }}>
            {MODE_LABEL[mode]}中
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => setIsRunning((r) => !r)}
          className="px-8 py-3 rounded-full bg-white text-gray-800 font-bold shadow-lg hover:scale-105 active:scale-95 transition-transform"
        >
          {isRunning ? '暫停' : secondsLeft === totalSeconds ? '開始' : '繼續'}
        </button>
        <button
          onClick={handleReset}
          className="px-6 py-3 rounded-full bg-white/20 text-white font-semibold border border-white/40 hover:bg-white/30 transition-colors"
        >
          重設
        </button>
      </div>

      <p className="text-white/90 text-sm font-medium">
        已完成 {completedPomodoros} 個番茄鐘
      </p>

      <div className="flex flex-col gap-3 w-full max-w-sm bg-white/90 backdrop-blur rounded-2xl p-5 shadow-xl">
        <p className="font-semibold text-gray-700 text-sm">時間設定（分鐘）</p>
        <div className="grid grid-cols-3 gap-3">
          <label className="flex flex-col gap-1 text-xs text-gray-600 font-medium">
            專注
            <input
              type="number"
              min={1}
              max={120}
              value={workMin}
              disabled={isRunning}
              onChange={(e) =>
                handleDurationChange('work', parseInt(e.target.value, 10))
              }
              className="border border-gray-300 rounded-lg px-2 py-1 text-black text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-50"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-600 font-medium">
            短休息
            <input
              type="number"
              min={1}
              max={120}
              value={shortMin}
              disabled={isRunning}
              onChange={(e) =>
                handleDurationChange('shortBreak', parseInt(e.target.value, 10))
              }
              className="border border-gray-300 rounded-lg px-2 py-1 text-black text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-50"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-600 font-medium">
            長休息
            <input
              type="number"
              min={1}
              max={120}
              value={longMin}
              disabled={isRunning}
              onChange={(e) =>
                handleDurationChange('longBreak', parseInt(e.target.value, 10))
              }
              className="border border-gray-300 rounded-lg px-2 py-1 text-black text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-50"
            />
          </label>
        </div>

        <div className="flex flex-col gap-1 border-t border-gray-100 pt-3">
          <p className="font-semibold text-gray-700 text-sm">提示音</p>
          <div className="flex items-center gap-2">
            <select
              value={soundId}
              onChange={(e) => setSoundId(e.target.value as SoundId)}
              className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-black text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            >
              {SOUND_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => playSound(soundId)}
              className="px-3 py-1.5 rounded-lg bg-sky-100 text-sky-700 text-sm font-semibold hover:bg-sky-200 transition-colors"
            >
              試聽
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
