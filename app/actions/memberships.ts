'use server';

import { createTenantClient, createSupabaseServiceClient } from '@/lib/supabase-server';
import { getTenantId } from '@/lib/tenant';
import { getUserRole } from '@/lib/membership';
import { getUser } from '@/app/actions/auth';
import type { ActionResponse } from '@/types/actions';

export type MemberRole = 'editor' | 'viewer';

export interface Member {
  id: string;
  user_id: string;
  email: string;
  role: MemberRole;
  created_at: string;
}

export interface PendingInvitation {
  id: string;
  email: string;
  role: MemberRole;
  created_at: string;
}

export async function getMembers(): Promise<ActionResponse<Member[]>> {
  const tenantId = await getTenantId();
  const role = await getUserRole(tenantId);
  if (role !== 'editor') return { success: false, error: 'Not authorized.' };

  const { supabase } = await createTenantClient();
  const { data: memberships, error } = await supabase
    .from('memberships')
    .select('id, user_id, role, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at');

  if (error) return { success: false, error: error.message };
  if (!memberships?.length) return { success: true, data: [] };

  const serviceClient = createSupabaseServiceClient();
  const emailResults = await Promise.all(
    memberships.map((m) => serviceClient.auth.admin.getUserById(m.user_id))
  );

  return {
    success: true,
    data: memberships.map((m, i) => ({
      id: m.id,
      user_id: m.user_id,
      email: emailResults[i].data.user?.email ?? '',
      role: m.role as MemberRole,
      created_at: m.created_at,
    })),
  };
}

export async function getPendingInvitations(): Promise<ActionResponse<PendingInvitation[]>> {
  const tenantId = await getTenantId();
  const role = await getUserRole(tenantId);
  if (role !== 'editor') return { success: false, error: 'Not authorized.' };

  const { supabase } = await createTenantClient();
  const { data, error } = await supabase
    .from('pending_invitations')
    .select('id, email, role, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at');

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as PendingInvitation[] };
}

export async function inviteMember(
  email: string,
  role: MemberRole
): Promise<ActionResponse> {
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail || !trimmedEmail.includes('@')) {
    return { success: false, error: 'Invalid email address.' };
  }
  if (role !== 'editor' && role !== 'viewer') {
    return { success: false, error: 'Invalid role.' };
  }

  const tenantId = await getTenantId();
  const currentRole = await getUserRole(tenantId);
  if (currentRole !== 'editor') return { success: false, error: 'Not authorized.' };

  const serviceClient = createSupabaseServiceClient();

  // Look up whether the email belongs to an existing auth user.
  const { data: existingUserId } = await serviceClient.rpc('get_user_id_by_email', {
    p_email: trimmedEmail,
  });

  if (existingUserId) {
    // User already exists — check if already a member of this tenant.
    const { data: existingMembership } = await serviceClient
      .from('memberships')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('user_id', existingUserId)
      .maybeSingle();

    if (existingMembership) {
      return { success: false, error: 'This person is already a member.' };
    }

    // Create membership directly.
    const { error } = await serviceClient.from('memberships').insert({
      tenant_id: tenantId,
      user_id: existingUserId,
      role,
    });

    if (error) return { success: false, error: error.message };
    return { success: true, data: undefined };
  }

  // User doesn't exist yet — create a pending invitation.
  const { supabase } = await createTenantClient();
  const { error } = await supabase.from('pending_invitations').insert({
    tenant_id: tenantId,
    email: trimmedEmail,
    role,
  });

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'An invitation for this email already exists.' };
    }
    return { success: false, error: error.message };
  }

  return { success: true, data: undefined };
}

export async function updateMemberRole(
  membershipId: string,
  newRole: MemberRole
): Promise<ActionResponse> {
  if (newRole !== 'editor' && newRole !== 'viewer') {
    return { success: false, error: 'Invalid role.' };
  }

  const tenantId = await getTenantId();
  const currentRole = await getUserRole(tenantId);
  if (currentRole !== 'editor') return { success: false, error: 'Not authorized.' };

  const user = await getUser();
  if (!user) return { success: false, error: 'Not authenticated.' };

  const { supabase } = await createTenantClient();

  const { data: target } = await supabase
    .from('memberships')
    .select('user_id')
    .eq('id', membershipId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (target?.user_id === user.id) {
    return { success: false, error: 'You cannot change your own role.' };
  }

  const { error } = await supabase
    .from('memberships')
    .update({ role: newRole })
    .eq('id', membershipId)
    .eq('tenant_id', tenantId);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function removeMember(membershipId: string): Promise<ActionResponse> {
  const tenantId = await getTenantId();
  const currentRole = await getUserRole(tenantId);
  if (currentRole !== 'editor') return { success: false, error: 'Not authorized.' };

  const user = await getUser();
  if (!user) return { success: false, error: 'Not authenticated.' };

  const { supabase } = await createTenantClient();

  const { data: target } = await supabase
    .from('memberships')
    .select('user_id')
    .eq('id', membershipId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (target?.user_id === user.id) {
    return { success: false, error: 'You cannot remove yourself.' };
  }

  const { error } = await supabase
    .from('memberships')
    .delete()
    .eq('id', membershipId)
    .eq('tenant_id', tenantId);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function cancelInvitation(invitationId: string): Promise<ActionResponse> {
  const tenantId = await getTenantId();
  const role = await getUserRole(tenantId);
  if (role !== 'editor') return { success: false, error: 'Not authorized.' };

  const { supabase } = await createTenantClient();
  const { error } = await supabase
    .from('pending_invitations')
    .delete()
    .eq('id', invitationId)
    .eq('tenant_id', tenantId);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}
