import { ImageResponse } from 'next/og'
import { createSupabaseServiceClient } from '@/lib/supabase-server'
import { getTenantPalette } from '@/lib/theme/palettes'

export const alt = 'Tenant preview'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params

  const supabase = createSupabaseServiceClient()
  const { data } = await supabase
    .from('tenants')
    .select('name, theme_palette, accent_color, logo_url')
    .eq('slug', slug)
    .single()

  const palette = getTenantPalette(data?.theme_palette ?? null, data?.accent_color ?? null)
  const bg = palette.legacyAccentHex
  const name = (data?.name ?? slug) as string
  const logoUrl = data?.logo_url as string | null | undefined

  if (logoUrl) {
    return new ImageResponse(
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          background: bg,
          padding: '80px',
          gap: '64px',
        }}
      >
        <img
          src={logoUrl}
          alt=""
          style={{
            width: '180px',
            height: '180px',
            objectFit: 'contain',
            flexShrink: 0,
          }}
        />
        <span
          style={{
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '80px',
            fontFamily: 'sans-serif',
            lineHeight: 1.1,
            letterSpacing: '-2px',
          }}
        >
          {name}
        </span>
      </div>,
      size
    )
  }

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: bg,
      }}
    >
      <span
        style={{
          color: '#ffffff',
          fontWeight: 700,
          fontSize: '96px',
          fontFamily: 'sans-serif',
          lineHeight: 1.1,
          letterSpacing: '-3px',
          textAlign: 'center',
          padding: '0 80px',
        }}
      >
        {name}
      </span>
    </div>,
    size
  )
}
