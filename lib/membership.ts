import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getUser } from '@/app/actions/auth';
import { getSuperadminImpersonationRole } from '@/lib/superadmin';

export type Role = 'editor' | 'viewer';

/** Returns the current user's role for the given tenant, or null if not a member. */
export async function getUserRole(tenantId: string): Promise<Role | null> {
  const user = await getUser();
  if (!user) return null;

  const superadminRole = await getSuperadminImpersonationRole(tenantId, user.id);
  if (superadminRole) return superadminRole;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('memberships')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .maybeSingle();

  return (data?.role as Role) ?? null;
}

/** Returns the current user if they are an editor, otherwise redirects. */
export async function requireEditor(tenantId: string) {
  const user = await getUser();
  if (!user) redirect('/auth/sign-in');

  const role = await getUserRole(tenantId);
  if (role !== 'editor') redirect('/');

  return user;
}

/** Returns true if the current user is an editor of the given tenant. */
export async function isEditor(tenantId: string): Promise<boolean> {
  return (await getUserRole(tenantId)) === 'editor';
}

/** Returns all tenants the current user is a member of. */
export async function getUserTenants() {
  const user = await getUser();
  if (!user) return [];

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('memberships')
    .select('role, tenants(id, name, slug, timezone)')
    .eq('user_id', user.id);

  return (data ?? []).map((row) => ({
    role: row.role as Role,
    tenant: row.tenants as unknown as {
      id: string;
      name: string;
      slug: string;
      timezone: string;
    },
  }));
}
