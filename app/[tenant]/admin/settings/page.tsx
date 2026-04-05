import { requireTenantEditor } from '@/lib/guards';
import { getTenantFromHeaders } from '@/lib/tenant';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { SettingsClient } from './client';

export default async function SettingsPage() {
  await requireTenantEditor();
  const tenant = await getTenantFromHeaders();

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('tenants')
    .select('accent_color, logo_url')
    .eq('id', tenant.id)
    .single();

  const accentColor = (data as { accent_color?: string | null } | null)?.accent_color ?? null;
  const logoUrl = (data as { logo_url?: string | null } | null)?.logo_url ?? null;

  return (
    <SettingsClient
      tenantId={tenant.id}
      initialAccentColor={accentColor}
      initialLogoUrl={logoUrl}
    />
  );
}
