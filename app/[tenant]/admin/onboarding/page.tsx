import { redirect } from 'next/navigation';
import { requireTenantEditor } from '@/lib/guards';
import { getTenantFromHeaders } from '@/lib/tenant';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { OnboardingWizard } from './onboarding-wizard';

export default async function OnboardingPage() {
  const { user } = await requireTenantEditor();
  const tenant = await getTenantFromHeaders();

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('tenants')
    .select('onboarding_completed, theme_palette, accent_color, logo_url')
    .eq('id', tenant.id)
    .single();

  const row = data as {
    onboarding_completed?: boolean | null;
    theme_palette?: string | null;
    accent_color?: string | null;
    logo_url?: string | null;
  } | null;

  if (row?.onboarding_completed) {
    redirect('/');
  }

  return (
    <OnboardingWizard
      tenantId={tenant.id}
      currentUserId={user.id}
      initialPaletteId={row?.theme_palette ?? null}
      initialAccentColor={row?.accent_color ?? null}
      initialLogoUrl={row?.logo_url ?? null}
    />
  );
}
