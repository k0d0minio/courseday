import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getUser } from '@/app/actions/auth';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import {
  SUPERADMIN_ROLE_COOKIE,
  parseSuperadminRoleCookie,
} from '@/lib/superadmin-impersonation';

export async function isUserSuperadmin(userId: string): Promise<boolean> {
  const serviceClient = createSupabaseServiceClient();
  const { data } = await serviceClient
    .from('superadmins')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  return !!data;
}

/**
 * Returns true if the currently authenticated user has a row in superadmins.
 * Uses the service client so it works regardless of RLS policies.
 */
export async function getSuperadminStatus(): Promise<boolean> {
  const user = await getUser();
  if (!user) return false;

  return isUserSuperadmin(user.id);
}

/**
 * Returns impersonated role when a superadmin is viewing a tenant as editor/viewer.
 * Returns null when no valid impersonation context exists.
 */
export async function getSuperadminImpersonationRole(
  tenantId: string,
  userId: string
): Promise<'editor' | 'viewer' | null> {
  const cookieStore = await cookies();
  const parsed = parseSuperadminRoleCookie(cookieStore.get(SUPERADMIN_ROLE_COOKIE)?.value);
  if (!parsed) return null;
  if (parsed.userId !== userId || parsed.tenantId !== tenantId) return null;

  const isSuperadmin = await isUserSuperadmin(userId);
  if (!isSuperadmin) return null;

  return parsed.role;
}

/**
 * Redirects to /auth/sign-in unless the current user is a superadmin.
 * Call at the top of any platform admin page.tsx.
 */
export async function requireSuperadmin(): Promise<void> {
  const ok = await getSuperadminStatus();
  if (!ok) redirect('/auth/sign-in');
}
