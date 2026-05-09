import { ImageResponse } from 'next/og'
import { createSupabaseServiceClient } from '@/lib/supabase-server'
import { getTenantPalette } from '@/lib/theme/palettes'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default async function Icon({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params

  const supabase = createSupabaseServiceClient()
  const { data } = await supabase
    .from('tenants')
    .select('name, theme_palette, accent_color, logo_url')
    .eq('slug', slug)
    .single()

  const palette = getTenantPalette(data?.theme_palette ?? null, data?.accent_color ?? null)
  const bg = palette.legacyAccentHex
  const logoUrl = data?.logo_url as string | null | undefined

  if (logoUrl) {
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
        <img src={logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>,
      size
    )
  }

  const initial = (data?.name ?? 'C')[0]!.toUpperCase()

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: bg,
        color: '#ffffff',
        fontWeight: 700,
        fontSize: 16,
        fontFamily: 'sans-serif',
      }}
    >
      {initial}
    </div>,
    size
  )
}
