'use server';

import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from '@/lib/supabase-server';
import {
  membershipSlugsForUser,
  resolveTenantRedirect,
  tenantSubdomainUrl,
} from '@/lib/auth-post-confirm';

export type PostConfirmResult =
  | { ok: true; redirectUrl: string }
  | { ok: false; error: 'no_session' | 'no_tenant' };

/**
 * After PKCE code exchange or implicit hash session is stored in cookies (browser),
 * compute where to send the user (tenant join, onboarding, or home).
 */
export async function finalizeEmailAuthRedirect(
  slugHint: string | null,
  flow: string | null
): Promise<PostConfirmResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: 'no_session' };
  }

  const trimmed = slugHint?.trim() ?? null;

  if (flow === 'invite' && trimmed) {
    const service = createSupabaseServiceClient();
    const slugs = await membershipSlugsForUser(service, user.id);
    if (slugs.includes(trimmed)) {
      return {
        ok: true,
        redirectUrl: tenantSubdomainUrl(trimmed, '/auth/join'),
      };
    }
  }

  const tenantRedirect = await resolveTenantRedirect(user.id, slugHint);
  if (!tenantRedirect) {
    return { ok: false, error: 'no_tenant' };
  }

  return {
    ok: true,
    redirectUrl: tenantSubdomainUrl(
      tenantRedirect.slug,
      tenantRedirect.pathname
    ),
  };
}
