import { NextResponse } from 'next/server';
import { getTenantFromHeaders } from '@/lib/tenant';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const tenant = await getTenantFromHeaders();
    const supabase = await createSupabaseServerClient();

    const { data } = await supabase
      .from('tenants')
      .select('name, accent_color, logo_url')
      .eq('id', tenant.id)
      .single();

    const name = (data?.name as string | null) ?? 'Courseday';
    const accentColor = (data?.accent_color as string | null) ?? '#e5e7eb';

    const manifest = {
      name: `${name} · Courseday`,
      short_name: name,
      description: 'Daily operations and team communication for golf venues.',
      start_url: '/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#ffffff',
      theme_color: accentColor,
      icons: [
        {
          src: '/pwa/icon',
          sizes: 'any',
          type: 'image/svg+xml',
          purpose: 'any',
        },
        {
          src: '/pwa/icon',
          sizes: 'any',
          type: 'image/svg+xml',
          purpose: 'maskable',
        },
      ],
    };

    return NextResponse.json(manifest, {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch {
    return NextResponse.json(
      {
        name: 'Courseday',
        short_name: 'Courseday',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#e5e7eb',
        icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
      },
      { headers: { 'Content-Type': 'application/manifest+json' } }
    );
  }
}
