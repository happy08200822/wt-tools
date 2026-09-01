export const WEATHER_CODE_MAP: Record<number, { label: string; emoji: string }> = {
  0: { label: '晴朗', emoji: '☀️' },
  1: { label: '大致晴朗', emoji: '🌤️' },
  2: { label: '多雲時晴', emoji: '⛅' },
  3: { label: '陰天', emoji: '☁️' },
  45: { label: '起霧', emoji: '🌫️' },
  48: { label: '霧淞', emoji: '🌫️' },
  51: { label: '毛毛雨（小）', emoji: '🌦️' },
  53: { label: '毛毛雨（中）', emoji: '🌦️' },
  55: { label: '毛毛雨（大）', emoji: '🌧️' },
  56: { label: '凍雨（小）', emoji: '🌧️' },
  57: { label: '凍雨（大）', emoji: '🌧️' },
  61: { label: '小雨', emoji: '🌦️' },
  63: { label: '中雨', emoji: '🌧️' },
  65: { label: '大雨', emoji: '🌧️' },
  66: { label: '凍雨（小）', emoji: '🌧️' },
  67: { label: '凍雨（大）', emoji: '🌧️' },
  71: { label: '小雪', emoji: '🌨️' },
  73: { label: '中雪', emoji: '🌨️' },
  75: { label: '大雪', emoji: '❄️' },
  77: { label: '雪粒', emoji: '❄️' },
  80: { label: '陣雨（小）', emoji: '🌦️' },
  81: { label: '陣雨（中）', emoji: '🌧️' },
  82: { label: '陣雨（劇烈）', emoji: '⛈️' },
  85: { label: '陣雪（小）', emoji: '🌨️' },
  86: { label: '陣雪（大）', emoji: '❄️' },
  95: { label: '雷雨', emoji: '⛈️' },
  96: { label: '雷雨挾冰雹（小）', emoji: '⛈️' },
  99: { label: '雷雨挾冰雹（大）', emoji: '⛈️' },
};

export function getWeatherInfo(code: number) {
  return WEATHER_CODE_MAP[code] ?? { label: '未知天氣', emoji: '❓' };
}
