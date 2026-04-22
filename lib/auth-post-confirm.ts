import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { resolvePendingInviteSlugForUser } from '@/lib/pending-invite';
import { protocol, rootDomain } from '@/lib/utils';
import { getTenantToday } from '@/lib/day-utils';

export const ONBOARDING_PATH = '/admin/onboarding';

export function tenantSubdomainUrl(slug: string, pathname: string) {
  return `${protocol}://${slug}.${rootDomain}${pathname}`;
}

export async function membershipSlugsForUser(
  service: ReturnType<typeof createSupabaseServiceClient>,
  userId: string
): Promise<string[]> {
  const { data: rows } = await service
    .from('memberships')
    .select('tenants(slug)')
    .eq('user_id', userId);

  return (rows ?? [])
    .map((r) => (r.tenants as unknown as { slug: string } | null)?.slug)
    .filter((s): s is string => Boolean(s));
}

export async function resolveTenantRedirect(
  userId: string,
  slugHint: string | null
): Promise<{ slug: string; pathname: string } | null> {
  const service = createSupabaseServiceClient();
  const slugs = await membershipSlugsForUser(service, userId);

  const trimmed = slugHint?.trim();
  if (slugs.length > 0) {
    const slug =
      trimmed && slugs.includes(trimmed) ? trimmed : (slugs[0] ?? null);
    if (!slug) return null;

    const { data: tenant } = await service
      .from('tenants')
      .select('id, onboarding_completed, timezone')
      .eq('slug', slug)
      .maybeSingle();

    if (!tenant?.id) {
      return { slug, pathname: '/' };
    }

    const { data: mem } = await service
      .from('memberships')
      .select('role')
      .eq('user_id', userId)
      .eq('tenant_id', tenant.id)
      .maybeSingle();

    const row = tenant as { onboarding_completed?: boolean | null; timezone?: string | null };
    const onboardingDone = row.onboarding_completed === true;
    const isEditor = mem?.role === 'editor';
    const today = getTenantToday(row.timezone ?? 'UTC');
    const pathname = isEditor
      ? (onboardingDone ? '/' : ONBOARDING_PATH)
      : `/day/${today}`;

    return { slug, pathname };
  }

  const pendingSlug = await resolvePendingInviteSlugForUser(service, userId, slugHint);
  if (!pendingSlug) return null;
  return { slug: pendingSlug, pathname: '/' };
}
