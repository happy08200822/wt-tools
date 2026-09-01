'use client';

import { useEffect, useState } from 'react';
import { getWeatherInfo } from '@/app/lib/weatherCodes';

type Region = {
  name: string;
  lat: number;
  lon: number;
};

const TAIWAN_REGIONS: Region[] = [
  { name: '台北市', lat: 25.033, lon: 121.5654 },
  { name: '新北市', lat: 25.0169, lon: 121.4627 },
  { name: '桃園市', lat: 24.9936, lon: 121.301 },
  { name: '台中市', lat: 24.1477, lon: 120.6736 },
  { name: '台南市', lat: 22.9998, lon: 120.2269 },
  { name: '高雄市', lat: 22.6273, lon: 120.3014 },
  { name: '基隆市', lat: 25.1276, lon: 121.7392 },
  { name: '新竹市', lat: 24.8138, lon: 120.9675 },
  { name: '新竹縣', lat: 24.8388, lon: 121.0178 },
  { name: '苗栗縣', lat: 24.5602, lon: 120.8214 },
  { name: '彰化縣', lat: 24.0518, lon: 120.5161 },
  { name: '南投縣', lat: 23.9609, lon: 120.9718 },
  { name: '雲林縣', lat: 23.7092, lon: 120.4313 },
  { name: '嘉義市', lat: 23.4801, lon: 120.4491 },
  { name: '嘉義縣', lat: 23.4518, lon: 120.2555 },
  { name: '屏東縣', lat: 22.5519, lon: 120.5487 },
  { name: '宜蘭縣', lat: 24.7021, lon: 121.7377 },
  { name: '花蓮縣', lat: 23.9871, lon: 121.6015 },
  { name: '台東縣', lat: 22.7583, lon: 121.1444 },
  { name: '澎湖縣', lat: 23.5711, lon: 119.5793 },
  { name: '金門縣', lat: 24.4324, lon: 118.3171 },
  { name: '連江縣', lat: 26.1608, lon: 119.9508 },
];

type CurrentWeather = {
  temperature_2m: number;
  relative_humidity_2m: number;
  apparent_temperature: number;
  precipitation: number;
  weather_code: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
};

type DailyWeather = {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_probability_max: number[];
};

type HourlyWeather = {
  time: string[];
  temperature_2m: number[];
  weather_code: number[];
  precipitation_probability: number[];
};

type WeatherResponse = {
  current: CurrentWeather;
  daily: DailyWeather;
  hourly: HourlyWeather;
};

const WEEKDAY_LABELS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
const DEFAULT_REGION =
  TAIWAN_REGIONS.find((r) => r.name === '台中市') ?? TAIWAN_REGIONS[0];

function formatWeekday(dateStr: string, index: number) {
  if (index === 0) return '今天';
  if (index === 1) return '明天';
  const date = new Date(dateStr);
  return WEEKDAY_LABELS[date.getDay()];
}

function formatHour(isoTime: string) {
  return `${isoTime.slice(11, 13)}:00`;
}

export default function WeatherPage() {
  const [selectedRegion, setSelectedRegion] = useState<Region>(DEFAULT_REGION);
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function fetchWeather() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(
          `/api/weather?lat=${selectedRegion.lat}&lon=${selectedRegion.lon}`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `API 回應錯誤（${res.status}）`);
        if (!cancelled) setWeather(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '取得天氣資料失敗，請稍後再試');
          setWeather(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchWeather();
    return () => {
      cancelled = true;
    };
  }, [selectedRegion]);

  const currentInfo = weather ? getWeatherInfo(weather.current.weather_code) : null;

  return (
    <main className="min-h-screen flex flex-col items-center gap-8 p-8 bg-gradient-to-br from-sky-200 via-blue-300 to-indigo-500">
      <div className="flex flex-col items-center gap-1">
        <h1
          className="text-4xl md:text-5xl font-extrabold text-white tracking-wide"
          style={{
            textShadow: '0 2px 6px rgba(0,0,0,0.25), 0 0 24px rgba(255,255,255,0.5)',
          }}
        >
          台灣天氣預報
        </h1>
        <p className="text-white/90 text-sm font-medium">
          資料來源：Open-Meteo，選擇地區查看今日各時段天氣與未來 5 天預報
        </p>
      </div>

      <div className="w-full max-w-3xl bg-white/95 backdrop-blur rounded-3xl p-6 shadow-2xl flex flex-col gap-6">
        <div className="flex flex-wrap gap-2 justify-center">
          {TAIWAN_REGIONS.map((region) => (
            <button
              key={region.name}
              onClick={() => setSelectedRegion(region)}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                region.name === selectedRegion.name
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {region.name}
            </button>
          ))}
        </div>

        {loading && (
          <p className="text-center text-slate-500 py-8">天氣資料載入中...</p>
        )}

        {!loading && error && (
          <p className="text-center text-red-500 text-sm py-8">{error}</p>
        )}

        {!loading && !error && weather && currentInfo && (
          <>
            <div className="flex flex-col items-center gap-2 py-4 border-b border-slate-100">
              <span className="text-sm font-semibold text-slate-500">
                {selectedRegion.name}・現在天氣
              </span>
              <span className="text-6xl">{currentInfo.emoji}</span>
              <span className="text-5xl font-bold text-slate-800 tabular-nums">
                {Math.round(weather.current.temperature_2m)}°C
              </span>
              <span className="text-slate-500">{currentInfo.label}</span>
              <div className="flex gap-6 text-sm text-slate-500 mt-2">
                <span>體感 {Math.round(weather.current.apparent_temperature)}°C</span>
                <span>濕度 {weather.current.relative_humidity_2m}%</span>
                <span>風速 {weather.current.wind_speed_10m} km/h</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-500 px-1">
                今日各時段天氣
              </span>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {weather.hourly.time
                  .map((time, i) => ({ time, i }))
                  .filter(({ time }) => time.startsWith(weather.daily.time[0]))
                  .map(({ time, i }) => {
                    const hourInfo = getWeatherInfo(weather.hourly.weather_code[i]);
                    return (
                      <div
                        key={time}
                        className="flex flex-col items-center gap-1 rounded-2xl bg-slate-50 p-3 min-w-[64px] shrink-0"
                      >
                        <span className="text-xs font-semibold text-slate-500">
                          {formatHour(time)}
                        </span>
                        <span className="text-2xl">{hourInfo.emoji}</span>
                        <span className="text-sm font-bold text-slate-700 tabular-nums">
                          {Math.round(weather.hourly.temperature_2m[i])}°
                        </span>
                        <span className="text-xs text-slate-400">
                          {Math.round(weather.hourly.precipitation_probability[i])}%
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {weather.daily.time.map((dateStr, i) => {
                const dayInfo = getWeatherInfo(weather.daily.weather_code[i]);
                return (
                  <div
                    key={dateStr}
                    className="flex flex-col items-center gap-1 rounded-2xl bg-slate-50 p-3"
                  >
                    <span className="text-xs font-semibold text-slate-500">
                      {formatWeekday(dateStr, i)}
                    </span>
                    <span className="text-2xl">{dayInfo.emoji}</span>
                    <span className="text-xs text-slate-400">
                      {Math.round(weather.daily.precipitation_probability_max[i])}%
                    </span>
                    <span className="text-sm font-bold text-slate-700 tabular-nums">
                      {Math.round(weather.daily.temperature_2m_max[i])}°
                    </span>
                    <span className="text-xs text-slate-400 tabular-nums">
                      {Math.round(weather.daily.temperature_2m_min[i])}°
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
