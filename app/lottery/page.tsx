'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const SPIN_DURATION_MS = 4000;
const EXTRA_SPINS = 5;
const LIGHT_COUNT = 24;
const WHEEL_SIZE = 320;
const RING_INSET = 12;
const HUB_RADIUS = 48;
const PILL_MAX = 12; // 這個人數以內用白色膠囊顯示名字
const RADIAL_MAX = 36; // 這個人數以內用放射狀細字，再多就只畫切片＋跑馬燈

const SEGMENT_COLORS = ['#BAE6FD', '#7DD3FC', '#38BDF8', '#E0F2FE'];

function getSegmentColor(index: number, total: number) {
  const color = SEGMENT_COLORS[index % SEGMENT_COLORS.length];
  // 最後一格跟第一格相鄰，同色時換一個
  if (total > 1 && index === total - 1 && color === SEGMENT_COLORS[0]) {
    return SEGMENT_COLORS[2];
  }
  return color;
}

function easeOutQuart(t: number) {
  return 1 - Math.pow(1 - t, 4);
}

export default function LotteryPage() {
  const [namesInput, setNamesInput] = useState('小明\n小華\n小美\n阿強');
  const rotationRef = useRef(0);
  const wheelRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const [pointerName, setPointerName] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [drawnNames, setDrawnNames] = useState<string[]>([]);
  const [allowRepeat, setAllowRepeat] = useState(false);

  const allNames = useMemo(
    () =>
      namesInput
        .split('\n')
        .map((n) => n.trim())
        .filter((n) => n.length > 0),
    [namesInput]
  );

  const pool = useMemo(
    () =>
      allowRepeat
        ? allNames
        : allNames.filter((n) => !drawnNames.includes(n)),
    [allNames, drawnNames, allowRepeat]
  );

  const segmentAngle = pool.length > 0 ? 360 / pool.length : 0;
  const labelMode: 'pill' | 'radial' | 'ticker' =
    pool.length <= PILL_MAX
      ? 'pill'
      : pool.length <= RADIAL_MAX
        ? 'radial'
        : 'ticker';

  // 指針在正上方；轉盤順時針轉了 rotation 度，指針指到的是轉盤上 -rotation 那個角度
  function nameAtPointer(rotation: number) {
    if (pool.length === 0) return null;
    const angleOnWheel = ((-rotation % 360) + 360) % 360;
    const index = Math.floor(angleOnWheel / segmentAngle) % pool.length;
    return pool[index];
  }

  useEffect(() => {
    if (!spinning) setPointerName(nameAtPointer(rotationRef.current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, spinning]);

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    },
    []
  );

  const wheelBackground = useMemo(() => {
    if (pool.length === 0) return '#e0f2fe';
    const stops = pool.map((_, i) => {
      const start = i * segmentAngle;
      const end = start + segmentAngle;
      return `${getSegmentColor(i, pool.length)} ${start}deg ${end}deg`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }, [pool, segmentAngle]);

  const lightAngles = useMemo(
    () =>
      Array.from({ length: LIGHT_COUNT }, (_, i) => (360 * i) / LIGHT_COUNT),
    []
  );

  function handleSpin() {
    if (spinning || pool.length < 1) return;

    const winnerIndex = Math.floor(Math.random() * pool.length);
    const winnerName = pool[winnerIndex];
    const thetaCenter = winnerIndex * segmentAngle + segmentAngle / 2;

    const startRotation = rotationRef.current;
    const currentMod = ((startRotation % 360) + 360) % 360;
    const desiredMod = (360 - thetaCenter) % 360;
    let diff = desiredMod - currentMod;
    if (diff <= 0) diff += 360;

    const endRotation = startRotation + diff + 360 * EXTRA_SPINS;

    setWinner(null);
    setSpinning(true);

    const startTime = performance.now();
    let lastName: string | null = null;

    const step = (now: number) => {
      const t = Math.min((now - startTime) / SPIN_DURATION_MS, 1);
      const current =
        startRotation + (endRotation - startRotation) * easeOutQuart(t);
      rotationRef.current = current;
      if (wheelRef.current) {
        wheelRef.current.style.transform = `rotate(${current}deg)`;
      }
      const name = nameAtPointer(current);
      if (name !== lastName) {
        lastName = name;
        setPointerName(name);
      }

      if (t < 1) {
        frameRef.current = requestAnimationFrame(step);
        return;
      }
      frameRef.current = null;
      setWinner(winnerName);
      setDrawnNames((prev) => [...prev, winnerName]);
      setSpinning(false);
    };
    frameRef.current = requestAnimationFrame(step);
  }

  function handleReset() {
    setDrawnNames([]);
    setWinner(null);
  }

  return (
    <main className="min-h-screen flex flex-col items-center gap-8 p-8 bg-gradient-to-br from-sky-200 via-sky-400 to-blue-600">
      <div className="flex flex-col items-center gap-1 mt-4">
        <h1
          className="text-4xl md:text-5xl font-extrabold text-white tracking-wide"
          style={{
            textShadow:
              '0 2px 6px rgba(0,0,0,0.25), 0 0 24px rgba(255,255,255,0.5)',
          }}
        >
          幸運大轉盤
        </h1>
        <p className="text-sky-50/90 text-sm font-medium">
          輸入名單，轉出今天的幸運兒！
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-10 items-center md:items-start w-full max-w-4xl">
        <div className="flex flex-col gap-3 w-full md:w-72 bg-white/90 backdrop-blur rounded-2xl p-5 shadow-xl">
          <label className="font-semibold text-sky-900" htmlFor="names">
            參加名單（一行一個名字）
          </label>
          <textarea
            id="names"
            className="border border-sky-200 rounded-lg p-3 h-64 resize-none font-mono text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-400"
            value={namesInput}
            onChange={(e) => setNamesInput(e.target.value)}
            disabled={spinning}
          />
          <p className="text-sm text-sky-700">
            目前共 {allNames.length} 人，尚未抽出 {pool.length} 人
          </p>

          <label className="flex items-center justify-between gap-3 border-t border-sky-100 pt-3 cursor-pointer select-none">
            <span className="text-sm font-medium text-sky-900">
              允許重複抽中
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={allowRepeat}
              onClick={() => setAllowRepeat((v) => !v)}
              disabled={spinning}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-40 ${
                allowRepeat ? 'bg-sky-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  allowRepeat ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </label>
          <p className="text-xs text-sky-600 -mt-2">
            {allowRepeat
              ? '同一人有機會被連續抽中'
              : '抽中後會從轉盤移除，不會重複抽到'}
          </p>

          {drawnNames.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-sky-100 pt-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sky-900 text-sm">
                  已抽出名單
                </p>
                <button
                  onClick={handleReset}
                  disabled={spinning}
                  className="text-xs font-semibold text-sky-600 hover:text-sky-800 disabled:opacity-40"
                >
                  重設本輪
                </button>
              </div>
              <ol className="flex flex-col gap-1 text-sm text-sky-800 list-decimal list-inside">
                {drawnNames.map((name, i) => (
                  <li key={`${name}-${i}`}>{name}</li>
                ))}
              </ol>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-6">
          {labelMode === 'ticker' && (
            <div className="w-64 text-center bg-white/95 text-sky-800 font-bold text-lg px-5 py-2 rounded-full shadow-lg truncate">
              {/* 抽中的人會被移出轉盤，停下後顯示得獎者，不顯示隔壁的人 */}
              {(!spinning && winner) || pointerName || '—'}
            </div>
          )}

          <div className="relative" style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}>
            {/* outer ring */}
            <div className="absolute inset-0 rounded-full bg-sky-700 shadow-2xl" />

            {/* decorative lights (static) */}
            <div className="absolute inset-0 rounded-full pointer-events-none z-10">
              {lightAngles.map((angle) => (
                <div
                  key={angle}
                  className="absolute left-1/2 top-1/2"
                  style={{ transform: `rotate(${angle}deg)` }}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full bg-white shadow"
                    style={{ transform: `translate(-50%, -${WHEEL_SIZE / 2 - 6}px)` }}
                  />
                </div>
              ))}
            </div>

            {/* rotating wheel */}
            <div
              ref={wheelRef}
              className="absolute rounded-full overflow-hidden shadow-inner"
              style={{
                inset: RING_INSET,
                background: wheelBackground,
                transform: `rotate(${rotationRef.current}deg)`,
              }}
            >
              {labelMode !== 'ticker' &&
                pool.map((name, i) => {
                  // 角度從正上方順時針算；CSS rotate(0) 是朝右，所以要減 90 度
                  const angle = i * segmentAngle + segmentAngle / 2 - 90;
                  if (labelMode === 'pill') {
                    return (
                      <div
                        key={`${name}-${i}`}
                        className="absolute left-1/2 top-1/2 origin-left"
                        style={{ transform: `rotate(${angle}deg) translateX(100px)` }}
                      >
                        <span className="-translate-x-1/2 -translate-y-1/2 absolute bg-white text-sky-700 text-xs font-bold px-2 py-1 rounded-full shadow whitespace-nowrap max-w-24 truncate">
                          {name}
                        </span>
                      </div>
                    );
                  }
                  const outer = WHEEL_SIZE / 2 - RING_INSET - 8;
                  const inner = HUB_RADIUS + 10;
                  return (
                    <div
                      key={`${name}-${i}`}
                      className="absolute left-1/2 top-1/2 origin-left"
                      style={{ transform: `rotate(${angle}deg)` }}
                    >
                      <span
                        className="absolute -translate-y-1/2 text-right text-sky-900 text-[11px] font-semibold leading-none whitespace-nowrap overflow-hidden text-ellipsis"
                        style={{ left: inner, width: outer - inner }}
                      >
                        {name}
                      </span>
                    </div>
                  );
                })}
            </div>

            {/* pointer (static) */}
            <div
              className="absolute left-1/2 top-1/2 z-20"
              style={{
                transform: `translate(-50%, -${HUB_RADIUS + 18}px)`,
                width: 0,
                height: 0,
                borderLeft: '10px solid transparent',
                borderRight: '10px solid transparent',
                borderBottom: '18px solid white',
                filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.35))',
              }}
            />

            {/* center hub / spin button (static) */}
            <button
              onClick={handleSpin}
              disabled={spinning || pool.length < 1}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 rounded-full bg-gradient-to-br from-white to-sky-100 border-4 border-sky-200 shadow-lg flex flex-col items-center justify-center text-sky-700 font-extrabold leading-tight hover:scale-105 active:scale-95 disabled:opacity-60 disabled:hover:scale-100 transition-transform"
              style={{ width: HUB_RADIUS * 2, height: HUB_RADIUS * 2 }}
            >
              <span>{spinning ? '轉動' : '開始'}</span>
              <span>{spinning ? '中...' : '抽獎'}</span>
            </button>
          </div>

          {allNames.length === 0 && (
            <p className="text-sm text-red-100 bg-red-500/80 px-3 py-1 rounded-full">
              請先輸入名單
            </p>
          )}

          {allNames.length > 0 && pool.length === 0 && (
            <p className="text-sm text-white bg-sky-700/80 px-3 py-1 rounded-full">
              所有人都抽完囉！可按「重設本輪」再抽一次
            </p>
          )}

          {winner && (
            <p className="text-2xl font-bold text-white bg-sky-600/80 px-5 py-2 rounded-full shadow-lg">
              🎉 恭喜 {winner}！
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
