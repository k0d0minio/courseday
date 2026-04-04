import { redirect, notFound } from 'next/navigation';
import { getUser } from '@/app/actions/auth';
import { getTenantFromHeaders } from '@/lib/tenant';
import { getUserRole } from '@/lib/membership';
import type { Role } from '@/lib/membership';
import type { User } from '@supabase/supabase-js';

/** Returns the authenticated user or redirects to sign-in. */
export async function requireAuth(): Promise<User> {
  const user = await getUser();
  if (!user) redirect('/auth/sign-in');
  return user;
}

/**
 * Returns the user + role or renders a 404 if the user is not a member of the
 * current tenant. Redirects to sign-in if unauthenticated.
 */
export async function requireTenantMember(): Promise<{ user: User; role: Role }> {
  const user = await requireAuth();
  const tenant = await getTenantFromHeaders();
  const role = await getUserRole(tenant.id);
  if (!role) notFound();
  return { user, role };
}

/**
 * Returns the user + role or redirects to tenant home if the user is not an
 * editor. Renders a 404 if the user is not a member at all.
 */
export async function requireTenantEditor(): Promise<{ user: User; role: 'editor' }> {
  const { user, role } = await requireTenantMember();
  if (role !== 'editor') redirect('/');
  return { user, role: 'editor' };
}
