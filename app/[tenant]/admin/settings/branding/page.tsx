import { getTranslations } from 'next-intl/server'
import { requireTenantEditor } from '@/lib/guards'
import { getTenantFromHeaders } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { SettingsForm } from '../settings-form'

export default async function BrandingSettingsPage() {
  await requireTenantEditor()
  const tenant = await getTenantFromHeaders()
  const t = await getTranslations('Tenant.settings')

  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('tenants')
    .select(
      'theme_palette, accent_color, logo_url, latitude, longitude, email_from_name, email_reply_to'
    )
    .eq('id', tenant.id)
    .single()

  const row = data as {
    theme_palette?: string | null
    accent_color?: string | null
    logo_url?: string | null
    latitude?: number | null
    longitude?: number | null
    email_from_name?: string | null
    email_reply_to?: string | null
  } | null

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold">{t('tabBranding')}</h1>
      <SettingsForm
        tenantId={tenant.id}
        tenantName={tenant.name}
        initialPaletteId={row?.theme_palette ?? null}
        initialAccentColor={row?.accent_color ?? null}
        initialLogoUrl={row?.logo_url ?? null}
        initialLatitude={row?.latitude ?? null}
        initialLongitude={row?.longitude ?? null}
        initialEmailFromName={row?.email_from_name ?? null}
        initialEmailReplyTo={row?.email_reply_to ?? null}
      />
    </div>
  )
}
