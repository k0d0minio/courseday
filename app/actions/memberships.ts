'use server';

import { createTenantClient, createSupabaseServiceClient } from '@/lib/supabase-server';
import { getTenantId } from '@/lib/tenant';
import { getUserRole } from '@/lib/membership';
import { getUser } from '@/app/actions/auth';
import { protocol, rootDomain } from '@/lib/utils';
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
  // Use allSettled so one failed lookup doesn't crash the whole list.
  const emailResults = await Promise.allSettled(
    memberships.map((m) => serviceClient.auth.admin.getUserById(m.user_id))
  );

  return {
    success: true,
    data: memberships.map((m, i) => {
      const settled = emailResults[i];
      const email =
        settled.status === 'fulfilled'
          ? (settled.value.data.user?.email ?? '')
          : '';
      return {
        id: m.id,
        user_id: m.user_id,
        email,
        role: m.role as MemberRole,
        created_at: m.created_at,
      };
    }),
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
): Promise<ActionResponse<{ emailed: boolean }>> {
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
  const { data: existingUserId, error: rpcError } = await serviceClient.rpc(
    'get_user_id_by_email',
    { p_email: trimmedEmail }
  );

  if (rpcError) {
    // RPC unavailable or failed — log server-side, fall through to pending invitation.
    console.error('[inviteMember] get_user_id_by_email RPC error:', rpcError.message);
  }

  const existingUserIdStr =
    existingUserId != null && String(existingUserId).length > 0
      ? String(existingUserId)
      : null;

  if (!rpcError && existingUserIdStr) {
    // User already exists — check if already a member of this tenant.
    const { data: existingMembership } = await serviceClient
      .from('memberships')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('user_id', existingUserIdStr)
      .maybeSingle();

    if (existingMembership) {
      return { success: false, error: 'This person is already a member.' };
    }

    // Create membership directly.
    const { error } = await serviceClient.from('memberships').insert({
      tenant_id: tenantId,
      user_id: existingUserIdStr,
      role,
    });

    if (error) return { success: false, error: error.message };
    return { success: true, data: { emailed: false } };
  }

  const { data: tenantRow, error: tenantLookupError } = await serviceClient
    .from('tenants')
    .select('slug')
    .eq('id', tenantId)
    .maybeSingle();

  if (tenantLookupError || !tenantRow?.slug) {
    return {
      success: false,
      error: tenantLookupError?.message ?? 'Could not resolve venue for invitation.',
    };
  }

  const tenantSlug = tenantRow.slug as string;
  const confirmRedirect = `${protocol}://${rootDomain}/auth/confirm?slug=${encodeURIComponent(tenantSlug)}`;

  const { data: inviteData, error: inviteError } =
    await serviceClient.auth.admin.inviteUserByEmail(trimmedEmail, {
      redirectTo: confirmRedirect,
    });

  if (inviteError) {
    const msg = inviteError.message.toLowerCase();
    const alreadyExists =
      msg.includes('already') ||
      msg.includes('registered') ||
      msg.includes('exists');

    if (alreadyExists) {
      const { data: retryId, error: retryRpcError } = await serviceClient.rpc(
        'get_user_id_by_email',
        { p_email: trimmedEmail }
      );
      if (!retryRpcError && retryId != null && String(retryId).length > 0) {
        const uid = String(retryId);
        const { data: dup } = await serviceClient
          .from('memberships')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('user_id', uid)
          .maybeSingle();
        if (dup) {
          return { success: false, error: 'This person is already a member.' };
        }
        const { error: insErr } = await serviceClient.from('memberships').insert({
          tenant_id: tenantId,
          user_id: uid,
          role,
        });
        if (insErr) return { success: false, error: insErr.message };
        return { success: true, data: { emailed: false } };
      }
    }

    console.error('[inviteMember] inviteUserByEmail:', inviteError.message);
    return {
      success: false,
      error:
        inviteError.message ||
        'Could not send invitation email. Check Auth email settings in Supabase.',
    };
  }

  const newUserId = inviteData.user?.id;
  if (!newUserId) {
    return { success: false, error: 'Invitation did not return a user id.' };
  }

  const { error: membershipError } = await serviceClient.from('memberships').insert({
    tenant_id: tenantId,
    user_id: newUserId,
    role,
  });

  if (membershipError) {
    try {
      await serviceClient.auth.admin.deleteUser(newUserId);
    } catch {
      // best-effort rollback
    }
    return { success: false, error: membershipError.message };
  }

  return { success: true, data: { emailed: true } };
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
