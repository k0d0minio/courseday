'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase-server';
import { buildAuthConfirmRedirectUrl } from '@/lib/auth-email-redirect';
import { getTenantId } from '@/lib/tenant';
import { getUserRole } from '@/lib/membership';
import { protocol, rootDomain } from '@/lib/utils';
import { getPendingInviteTenantSlug, normaliseInviteEmail } from '@/lib/pending-invite';
import { authRateLimit } from '@/lib/rate-limit';
import { getTenantToday } from '@/lib/day-utils';

export async function signIn(_prevState: unknown, formData: FormData) {
  const rl = await authRateLimit();
  if (!rl.success) return { error: 'Too many attempts. Please wait and try again.' };

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const redirectTo = (formData.get('redirectTo') as string) || '/';

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect(redirectTo);
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/auth/sign-in');
}

export async function getUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireUser() {
  const user = await getUser();
  if (!user) {
    redirect('/auth/sign-in');
  }
  return user;
}

/**
 * Returns the current user + their role for the active tenant.
 * Safe to call from client components via useEffect — returns null values
 * rather than throwing when outside tenant context.
 */
/**
 * Platform-level sign in. After authentication, looks up the user's tenant
 * and redirects to their course subdomain.
 */
export async function platformSignIn(_prevState: unknown, formData: FormData) {
  const rl = await authRateLimit();
  if (!rl.success) return { error: 'Too many attempts. Please wait and try again.' };

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const slugHint = String(formData.get('slug') ?? '').trim();
  if (!password) return { error: 'Enter your password or use a magic link.' };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };

  // Look up tenant: membership first, else pending invitation (invited viewers
  // often have no membership row until first tenant visit).
  const serviceClient = createSupabaseServiceClient();
  const { data: membershipRows } = await serviceClient
    .from('memberships')
    .select('tenants(slug)')
    .eq('user_id', data.user.id)
    .limit(50);

  const memberSlugs = (membershipRows ?? [])
    .map((row) => (row.tenants as unknown as { slug: string } | null)?.slug ?? null)
    .filter((slug): slug is string => !!slug);
  const slugFromMember = slugHint && memberSlugs.includes(slugHint) ? slugHint : memberSlugs[0] ?? null;

  const emailNorm = normaliseInviteEmail(data.user.email);
  const slugFromPending =
    !slugFromMember && emailNorm
      ? await getPendingInviteTenantSlug(serviceClient, emailNorm)
      : null;

  const slug = slugFromMember ?? slugFromPending;
  if (!slug) {
    const { data: superadminRow } = await serviceClient
      .from('superadmins')
      .select('id')
      .eq('user_id', data.user.id)
      .maybeSingle();
    if (superadminRow) {
      redirect('/admin');
    }
    return { error: 'No course found for this account.' };
  }

  redirect(`${protocol}://${slug}.${rootDomain}/`);
}

export type AuthEmailActionState = { error?: string; success?: string } | null;

export async function sendSignInMagicLink(
  _prevState: AuthEmailActionState,
  formData: FormData
): Promise<AuthEmailActionState> {
  const rl = await authRateLimit();
  if (!rl.success) return { error: 'Too many attempts. Please wait and try again.' };

  const email = String(formData.get('email') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim() || null;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: buildAuthConfirmRedirectUrl({ slug, flow: 'magic' }),
    },
  });

  if (error) return { error: error.message };
  return { success: 'Check your email for a sign-in link.' };
}

export async function sendPasswordResetEmail(
  _prevState: AuthEmailActionState,
  formData: FormData
): Promise<AuthEmailActionState> {
  const rl = await authRateLimit();
  if (!rl.success) return { error: 'Too many attempts. Please wait and try again.' };

  const email = String(formData.get('email') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim() || null;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: buildAuthConfirmRedirectUrl({ slug, flow: 'recovery' }),
  });

  if (error) return { error: error.message };
  return { success: 'If an account exists for that email, we sent a reset link.' };
}

export async function getAuthState() {
  const user = await getUser();
  if (!user) return { user: null, role: null, isEditor: false };

  const tenantId = await getTenantId().catch(() => null);
  if (!tenantId) return { user, role: null, isEditor: false };

  const role = await getUserRole(tenantId);
  return { user, role, isEditor: role === 'editor' };
}

export type InviteJoinErrorCode =
  | 'RATE_LIMIT'
  | 'TOO_SHORT'
  | 'MISMATCH'
  | 'NOT_SIGNED_IN'
  | 'NO_ACCESS';

export type InviteJoinState = { error: InviteJoinErrorCode | string } | null;
export type PasswordRecoveryErrorCode =
  | 'RATE_LIMIT'
  | 'TOO_SHORT'
  | 'MISMATCH'
  | 'NOT_SIGNED_IN';
export type PasswordRecoveryState = {
  error?: PasswordRecoveryErrorCode | string;
  success?: boolean;
} | null;

/**
 * After invite email link: user has a session on the tenant join page.
 * Saves password then redirects by role / onboarding state.
 */
export async function completeInvitePassword(
  _prev: InviteJoinState,
  formData: FormData
): Promise<InviteJoinState> {
  const rl = await authRateLimit();
  if (!rl.success) return { error: 'RATE_LIMIT' };

  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  if (password.length < 8) return { error: 'TOO_SHORT' };
  if (password !== confirm) return { error: 'MISMATCH' };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'NOT_SIGNED_IN' };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  const tenantId = await getTenantId();
  const role = await getUserRole(tenantId);
  if (!role) return { error: 'NO_ACCESS' };

  const { data: tenant } = await supabase
    .from('tenants')
    .select('onboarding_completed, timezone')
    .eq('id', tenantId)
    .single();

  const row = tenant as {
    onboarding_completed?: boolean | null;
    timezone?: string | null;
  } | null;
  const today = getTenantToday(row?.timezone ?? 'UTC');
  const onboardingDone = row?.onboarding_completed === true;

  if (role === 'editor' && !onboardingDone) {
    redirect('/admin/onboarding');
  }
  if (role !== 'editor') {
    redirect(`/day/${today}`);
  }
  redirect('/');
}

export async function completePasswordRecovery(
  _prev: PasswordRecoveryState,
  formData: FormData
): Promise<PasswordRecoveryState> {
  const rl = await authRateLimit();
  if (!rl.success) return { error: 'RATE_LIMIT' };

  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');
  if (password.length < 8) return { error: 'TOO_SHORT' };
  if (password !== confirm) return { error: 'MISMATCH' };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'NOT_SIGNED_IN' };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  return { success: true };
}
