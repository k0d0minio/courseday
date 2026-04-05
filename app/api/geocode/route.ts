import { NextRequest, NextResponse } from 'next/server';

// Server-side proxy so OPENWEATHER_API_KEY never reaches the client bundle.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q');
  if (!q || q.trim().length < 2) {
    return NextResponse.json([]);
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Geocoding not configured.' }, { status: 503 });
  }

  const url =
    `https://api.openweathermap.org/geo/1.0/direct` +
    `?q=${encodeURIComponent(q.trim())}&limit=5&appid=${apiKey}`;

  try {
    const res = await fetch(url, {
      // Cache for 60 s — same query returns the same cities
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'Geocoding service error.' }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to reach geocoding service.' }, { status: 500 });
  }
}
