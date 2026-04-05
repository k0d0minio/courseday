'use server';

import { redis } from '@/lib/redis';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getTenantFromHeaders } from '@/lib/tenant';

const CACHE_TTL = 1800; // 30 minutes

export interface WeatherData {
  date: string;
  weatherCode: number;
  description: string;
  tempMax: number;
  tempMin: number;
  precipitationProbability: number;
  emoji: string;
}

export async function getWeatherForDay(date: string): Promise<WeatherData | null> {
  const tenant = await getTenantFromHeaders();

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('tenants')
    .select('latitude, longitude, timezone')
    .eq('id', tenant.id)
    .single();

  const row = data as {
    latitude?: number | null;
    longitude?: number | null;
    timezone?: string | null;
  } | null;

  if (!row?.latitude || !row?.longitude) return null;

  const cacheKey = `weather:${tenant.id}:${date}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as WeatherData;
  } catch {
    // Redis failure — proceed to fetch
  }

  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(row.latitude));
    url.searchParams.set('longitude', String(row.longitude));
    url.searchParams.set('daily', 'weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max');
    url.searchParams.set('timezone', row.timezone ?? 'UTC');
    url.searchParams.set('start_date', date);
    url.searchParams.set('end_date', date);

    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) return null;

    const json = await res.json();
    const daily = json?.daily;
    if (!daily?.time?.length) return null;

    const code: number = daily.weathercode?.[0] ?? 0;
    const weather: WeatherData = {
      date,
      weatherCode: code,
      description: codeToDescription(code),
      emoji: codeToEmoji(code),
      tempMax: Math.round(daily.temperature_2m_max?.[0] ?? 0),
      tempMin: Math.round(daily.temperature_2m_min?.[0] ?? 0),
      precipitationProbability: daily.precipitation_probability_max?.[0] ?? 0,
    };

    try {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(weather));
    } catch {
      // Redis write failure is non-fatal
    }

    return weather;
  } catch {
    return null;
  }
}

function codeToDescription(code: number): string {
  if (code === 0) return 'Clear sky';
  if (code <= 3) return 'Partly cloudy';
  if (code <= 48) return 'Foggy';
  if (code <= 57) return 'Drizzle';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Showers';
  if (code <= 86) return 'Snow showers';
  return 'Thunderstorm';
}

function codeToEmoji(code: number): string {
  if (code === 0) return '☀️';
  if (code <= 3) return '⛅';
  if (code <= 48) return '🌫️';
  if (code <= 57) return '🌦️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦️';
  if (code <= 86) return '🌨️';
  return '⛈️';
}
