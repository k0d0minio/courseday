import { NextResponse } from 'next/server'
import { getTenantFromHeaders } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getTenantPalette } from '@/lib/theme/palettes'

export async function GET() {
  let tenant
  try {
    tenant = await getTenantFromHeaders()
  } catch {
    return new NextResponse(null, { status: 404 })
  }

  try {
    const supabase = await createSupabaseServerClient()

    const { data } = await supabase
      .from('tenants')
      .select('name, theme_palette, accent_color, logo_url')
      .eq('id', tenant.id)
      .single()

    const name = (data?.name as string | null) ?? tenant.slug
    const palette = getTenantPalette(
      (data?.theme_palette as string | null) ?? null,
      (data?.accent_color as string | null) ?? null
    )

    const manifest = {
      name,
      short_name: name,
      description: 'Daily operations and team communication for golf venues.',
      start_url: '/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#ffffff',
      theme_color: palette.legacyAccentHex,
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
    }

    return NextResponse.json(manifest, {
      headers: {
        'Content-Type': 'application/manifest+json',
        // no-cache: always revalidate — manifest is tiny and must reflect
        // branding changes (name, theme_color) without delay.
        'Cache-Control': 'no-cache',
      },
    })
  } catch {
    return new NextResponse(null, { status: 404 })
  }
}
