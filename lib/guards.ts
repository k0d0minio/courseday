import { redirect, notFound } from 'next/navigation';
import { getUser } from '@/app/actions/auth';
import { getTenantFromHeaders } from '@/lib/tenant';
import { getUserRole } from '@/lib/membership';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
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
 *
 * On first visit after sign-up, if a pending invitation exists for the user's
 * email, it is automatically accepted: a membership is created and the
 * invitation row is deleted.
 */
export async function requireTenantMember(): Promise<{ user: User; role: Role }> {
  const user = await requireAuth();
  const tenant = await getTenantFromHeaders();
  const role = await getUserRole(tenant.id);

  if (!role) {
    // Check for a pending invitation matching the user's email.
    const serviceClient = createSupabaseServiceClient();
    const { data: authUser } = await serviceClient.auth.admin.getUserById(user.id);
    const email = authUser.user?.email;

    if (email) {
      const { data: invitation } = await serviceClient
        .from('pending_invitations')
        .select('id, role')
        .eq('tenant_id', tenant.id)
        .ilike('email', email)
        .maybeSingle();

      if (invitation) {
        // Auto-accept: create membership and remove the invitation.
        await serviceClient.from('memberships').insert({
          tenant_id: tenant.id,
          user_id: user.id,
          role: invitation.role,
        });
        await serviceClient
          .from('pending_invitations')
          .delete()
          .eq('id', invitation.id);

        return { user, role: invitation.role as Role };
      }
    }

    notFound();
  }

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
