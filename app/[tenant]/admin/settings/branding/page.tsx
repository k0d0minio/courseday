import { getTranslations } from 'next-intl/server';
import { requireTenantEditor } from '@/lib/guards';
import { getTenantFromHeaders } from '@/lib/tenant';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { SettingsForm } from '../settings-form';

export default async function BrandingSettingsPage() {
  await requireTenantEditor();
  const tenant = await getTenantFromHeaders();
  const t = await getTranslations('Tenant.settings');

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('tenants')
    .select('accent_color, logo_url, latitude, longitude')
    .eq('id', tenant.id)
    .single();

  const row = data as {
    accent_color?: string | null;
    logo_url?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold mb-6">{t('tabBranding')}</h1>
      <SettingsForm
        tenantId={tenant.id}
        initialAccentColor={row?.accent_color ?? null}
        initialLogoUrl={row?.logo_url ?? null}
        initialLatitude={row?.latitude ?? null}
        initialLongitude={row?.longitude ?? null}
      />
    </div>
  );
}
