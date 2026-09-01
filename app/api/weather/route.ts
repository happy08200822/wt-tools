import { NextResponse } from 'next/server';

const CURRENT_FIELDS = [
  'temperature_2m',
  'relative_humidity_2m',
  'apparent_temperature',
  'precipitation',
  'weather_code',
  'wind_speed_10m',
  'wind_direction_10m',
].join(',');

const DAILY_FIELDS = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_probability_max',
].join(',');

const HOURLY_FIELDS = [
  'temperature_2m',
  'weather_code',
  'precipitation_probability',
].join(',');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latParam = searchParams.get('lat');
  const lonParam = searchParams.get('lon');
  const latitude = latParam === null ? NaN : Number(latParam);
  const longitude = lonParam === null ? NaN : Number(lonParam);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json(
      { error: '請提供有效的 lat 與 lon 參數' },
      { status: 400 }
    );
  }

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('current', CURRENT_FIELDS);
  url.searchParams.set('daily', DAILY_FIELDS);
  url.searchParams.set('hourly', HOURLY_FIELDS);
  url.searchParams.set('timezone', 'Asia/Taipei');
  url.searchParams.set('forecast_days', '5');

  try {
    const res = await fetch(url.toString(), { cache: 'no-store' });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Open-Meteo API 錯誤：${res.status} ${errText}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '取得天氣資料失敗，請稍後再試' },
      { status: 500 }
    );
  }
}
