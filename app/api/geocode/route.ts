import { NextRequest, NextResponse } from 'next/server';

// Server-side proxy so OPENWEATHER_API_KEY never reaches the client bundle.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q');
  if (!q || q.trim().length < 2) {
    return NextResponse.json([]);
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;
  const openWeatherUrl =
    `https://api.openweathermap.org/geo/1.0/direct` +
    `?q=${encodeURIComponent(q.trim())}&limit=5&appid=${apiKey}`;
  const openMeteoUrl =
    `https://geocoding-api.open-meteo.com/v1/search` +
    `?name=${encodeURIComponent(q.trim())}&count=5&language=en&format=json`;

  try {
    if (apiKey) {
      const res = await fetch(openWeatherUrl, {
        // Cache for 60 s — same query returns same cities
        next: { revalidate: 60 },
      });
      if (!res.ok) {
        return NextResponse.json({ error: 'Geocoding service error.' }, { status: 502 });
      }
      const data: unknown = await res.json();
      if (!Array.isArray(data)) {
        return NextResponse.json({ error: 'Unexpected geocoding response.' }, { status: 502 });
      }

      const normalized = data
        .filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object')
        .map((item) => {
          const row: {
            name: string;
            lat: number;
            lon: number;
            country: string;
            state?: string;
          } = {
            name: String(item.name ?? ''),
            lat: Number(item.lat),
            lon: Number(item.lon),
            country: String(item.country ?? ''),
          };
          if (item.state != null && String(item.state) !== '') {
            row.state = String(item.state);
          }
          return row;
        })
        .filter((r) => r.name.length > 0 && Number.isFinite(r.lat) && Number.isFinite(r.lon));

      return NextResponse.json(normalized);
    }

    const res = await fetch(openMeteoUrl, {
      // Cache for 60 s — same query returns same cities
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'Geocoding service error.' }, { status: 502 });
    }
    const data: unknown = await res.json();
    if (
      typeof data !== 'object' ||
      data === null ||
      !('results' in data) ||
      !Array.isArray((data as { results?: unknown }).results)
    ) {
      return NextResponse.json({ error: 'Unexpected geocoding response.' }, { status: 502 });
    }
    const results = (data as { results: unknown[] }).results;

    const normalized = results
      .filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object')
      .map((item) => {
        const row: {
          name: string;
          lat: number;
          lon: number;
          country: string;
          state?: string;
        } = {
          name: String(item.name ?? ''),
          lat: Number(item.latitude),
          lon: Number(item.longitude),
          country: String(item.country_code ?? item.country ?? ''),
        };
        if (item.admin1 != null && String(item.admin1) !== '') {
          row.state = String(item.admin1);
        }
        return row;
      })
      .filter((r) => r.name.length > 0 && Number.isFinite(r.lat) && Number.isFinite(r.lon));

    return NextResponse.json(normalized);
  } catch {
    return NextResponse.json({ error: 'Failed to reach geocoding service.' }, { status: 500 });
  }
}
