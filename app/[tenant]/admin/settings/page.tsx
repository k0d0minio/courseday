import { requireTenantEditor } from '@/lib/guards';
import { getTenantFromHeaders } from '@/lib/tenant';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { SettingsClient } from './client';

export default async function SettingsPage() {
  const { user } = await requireTenantEditor();
  const tenant = await getTenantFromHeaders();

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
    <SettingsClient
      tenantId={tenant.id}
      currentUserId={user.id}
      initialAccentColor={row?.accent_color ?? null}
      initialLogoUrl={row?.logo_url ?? null}
      initialLatitude={row?.latitude ?? null}
      initialLongitude={row?.longitude ?? null}
    />
  );
}
