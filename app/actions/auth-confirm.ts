'use server';

import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import {
  membershipSlugsForUser,
  resolveTenantRedirect,
  tenantSubdomainUrl,
} from '@/lib/auth-post-confirm';
import { protocol, rootDomain } from '@/lib/utils';

export type PostConfirmResult =
  | { ok: true; redirectUrl: string }
  | { ok: false; error: 'no_session' | 'no_tenant' };

async function resolvePostConfirmRedirect(
  userId: string,
  slugHint: string | null,
  flow: string | null
): Promise<PostConfirmResult> {
  const trimmed = slugHint?.trim() ?? null;

  if (flow === 'invite' && trimmed) {
    const service = createSupabaseServiceClient();
    const slugs = await membershipSlugsForUser(service, userId);
    if (slugs.includes(trimmed)) {
      return {
        ok: true,
        redirectUrl: tenantSubdomainUrl(trimmed, '/auth/join'),
      };
    }
  }

  const tenantRedirect = await resolveTenantRedirect(userId, slugHint);
  if (!tenantRedirect) {
    const service = createSupabaseServiceClient();
    const { data: superadminRow } = await service
      .from('superadmins')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (superadminRow) {
      return { ok: true, redirectUrl: `${protocol}://${rootDomain}/admin` };
    }

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

  return resolvePostConfirmRedirect(user.id, slugHint, flow);
}

/**
 * Same redirect resolver, but authenticates by provided access token.
 * Avoids race where fresh client-side session cookies are not visible yet.
 */
export async function finalizeEmailAuthRedirectWithToken(
  accessToken: string,
  slugHint: string | null,
  flow: string | null
): Promise<PostConfirmResult> {
  const token = accessToken.trim();
  if (!token) {
    return { ok: false, error: 'no_session' };
  }

  const tokenClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const {
    data: { user },
  } = await tokenClient.auth.getUser(token);

  if (!user) {
    return { ok: false, error: 'no_session' };
  }

  return resolvePostConfirmRedirect(user.id, slugHint, flow);
}
