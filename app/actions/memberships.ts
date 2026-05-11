'use server'

import { createTenantClient, createSupabaseServiceClient } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { getUserRole } from '@/lib/membership'
import { getUser } from '@/app/actions/auth'
import { buildAuthConfirmRedirectUrl } from '@/lib/auth-email-redirect'
import { memberEditSchema } from '@/lib/membership-schema'
import type { MemberEditInput } from '@/lib/membership-schema'
import type { ActionResponse } from '@/types/actions'

export type MemberRole = 'editor' | 'staff'

export interface Member {
  id: string
  user_id: string
  email: string
  role: MemberRole
  created_at: string
  hourly_rate: number | null
  currency: string | null
  first_name: string | null
  last_name: string | null
  job_title: string | null
  phone: string | null
}

export interface PendingInvitation {
  id: string
  email: string
  role: MemberRole
  created_at: string
}

export interface TenantMemberAssignee {
  user_id: string
  email: string
  display_name: string
  role: MemberRole
  job_title?: string | null
}

export async function getTenantMemberAssignees(): Promise<ActionResponse<TenantMemberAssignee[]>> {
  const tenantId = await getTenantId()
  const role = await getUserRole(tenantId)
  if (!role) return { success: false, error: 'Not authorized.' }

  const { supabase } = await createTenantClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: memberships, error } = await (supabase.from('memberships') as any)
    .select('user_id, role, first_name, last_name, job_title')
    .eq('tenant_id', tenantId)
    .order('created_at')

  if (error) return { success: false, error: error.message }
  if (!memberships?.length) return { success: true, data: [] }

  const rows = memberships as Array<{
    user_id: string
    role: string
    first_name: string | null
    last_name: string | null
    job_title: string | null
  }>

  const serviceClient = createSupabaseServiceClient()
  const emailResults = await Promise.allSettled(
    rows.map((m) => serviceClient.auth.admin.getUserById(m.user_id))
  )

  return {
    success: true,
    data: rows.map((m, i) => {
      const settled = emailResults[i]
      const email =
        settled && settled.status === 'fulfilled' ? (settled.value.data.user?.email ?? '') : ''
      const fullName = [m.first_name, m.last_name].filter(Boolean).join(' ')
      return {
        user_id: m.user_id,
        email,
        display_name: fullName || (email ? (email.split('@')[0] ?? email) : m.user_id.slice(0, 8)),
        role: m.role as MemberRole,
        job_title: m.job_title ?? null,
      }
    }),
  }
}

export async function getMembers(): Promise<ActionResponse<Member[]>> {
  const tenantId = await getTenantId()
  const role = await getUserRole(tenantId)
  if (role !== 'editor') return { success: false, error: 'Not authorized.' }

  const { supabase } = await createTenantClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: memberships, error } = await (supabase.from('memberships') as any)
    .select(
      'id, user_id, role, created_at, hourly_rate, currency, first_name, last_name, job_title, phone'
    )
    .eq('tenant_id', tenantId)
    .order('created_at')

  if (error) return { success: false, error: error.message }
  if (!memberships?.length) return { success: true, data: [] }

  const rows = memberships as Array<{
    id: string
    user_id: string
    role: string
    created_at: string
    hourly_rate: number | null
    currency: string | null
    first_name: string | null
    last_name: string | null
    job_title: string | null
    phone: string | null
  }>

  const serviceClient = createSupabaseServiceClient()
  // Use allSettled so one failed lookup doesn't crash the whole list.
  const emailResults = await Promise.allSettled(
    rows.map((m) => serviceClient.auth.admin.getUserById(m.user_id))
  )

  return {
    success: true,
    data: rows.map((m, i) => {
      const settled = emailResults[i]
      const email =
        settled && settled.status === 'fulfilled' ? (settled.value.data.user?.email ?? '') : ''
      return {
        id: m.id,
        user_id: m.user_id,
        email,
        role: m.role as MemberRole,
        created_at: m.created_at,
        hourly_rate: m.hourly_rate,
        currency: m.currency,
        first_name: m.first_name,
        last_name: m.last_name,
        job_title: m.job_title,
        phone: m.phone,
      }
    }),
  }
}

export async function getPendingInvitations(): Promise<ActionResponse<PendingInvitation[]>> {
  const tenantId = await getTenantId()
  const role = await getUserRole(tenantId)
  if (role !== 'editor') return { success: false, error: 'Not authorized.' }

  const { supabase } = await createTenantClient()
  const { data, error } = await supabase
    .from('pending_invitations')
    .select('id, email, role, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at')

  if (error) return { success: false, error: error.message }
  return { success: true, data: (data ?? []) as PendingInvitation[] }
}

export async function inviteMember(
  email: string,
  role: MemberRole
): Promise<ActionResponse<{ emailed: boolean }>> {
  const trimmedEmail = email.trim().toLowerCase()
  if (!trimmedEmail || !trimmedEmail.includes('@')) {
    return { success: false, error: 'Invalid email address.' }
  }
  if (role !== 'editor' && role !== 'staff') {
    return { success: false, error: 'Invalid role.' }
  }

  const tenantId = await getTenantId()
  const currentRole = await getUserRole(tenantId)
  if (currentRole !== 'editor') return { success: false, error: 'Not authorized.' }

  const serviceClient = createSupabaseServiceClient()

  // Look up whether the email belongs to an existing auth user.
  const { data: existingUserId, error: rpcError } = await serviceClient.rpc(
    'get_user_id_by_email',
    { p_email: trimmedEmail }
  )

  if (rpcError) {
    // RPC unavailable or failed — log server-side, fall through to pending invitation.
    console.error('[inviteMember] get_user_id_by_email RPC error:', rpcError.message)
  }

  const existingUserIdStr =
    existingUserId != null && String(existingUserId).length > 0 ? String(existingUserId) : null

  if (!rpcError && existingUserIdStr) {
    // User already exists — check if already a member of this tenant.
    const { data: existingMembership } = await serviceClient
      .from('memberships')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('user_id', existingUserIdStr)
      .maybeSingle()

    if (existingMembership) {
      return { success: false, error: 'This person is already a member.' }
    }

    // Create membership directly.
    const { error } = await serviceClient.from('memberships').insert({
      tenant_id: tenantId,
      user_id: existingUserIdStr,
      role,
    })

    if (error) return { success: false, error: error.message }
    return { success: true, data: { emailed: false } }
  }

  const { data: tenantRow, error: tenantLookupError } = await serviceClient
    .from('tenants')
    .select('slug')
    .eq('id', tenantId)
    .maybeSingle()

  if (tenantLookupError || !tenantRow?.slug) {
    return {
      success: false,
      error: tenantLookupError?.message ?? 'Could not resolve venue for invitation.',
    }
  }

  const tenantSlug = tenantRow.slug as string
  const confirmRedirect = buildAuthConfirmRedirectUrl({
    slug: tenantSlug,
    flow: 'invite',
  })

  const { data: inviteData, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(
    trimmedEmail,
    {
      redirectTo: confirmRedirect,
      data: { invited: true },
    }
  )

  if (inviteError) {
    const msg = inviteError.message.toLowerCase()
    const alreadyExists =
      msg.includes('already') || msg.includes('registered') || msg.includes('exists')

    if (alreadyExists) {
      const { data: retryId, error: retryRpcError } = await serviceClient.rpc(
        'get_user_id_by_email',
        { p_email: trimmedEmail }
      )
      if (!retryRpcError && retryId != null && String(retryId).length > 0) {
        const uid = String(retryId)
        const { data: dup } = await serviceClient
          .from('memberships')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('user_id', uid)
          .maybeSingle()
        if (dup) {
          return { success: false, error: 'This person is already a member.' }
        }
        const { error: insErr } = await serviceClient.from('memberships').insert({
          tenant_id: tenantId,
          user_id: uid,
          role,
        })
        if (insErr) return { success: false, error: insErr.message }
        return { success: true, data: { emailed: false } }
      }
    }

    console.error('[inviteMember] inviteUserByEmail:', inviteError.message)
    return {
      success: false,
      error:
        inviteError.message ||
        'Could not send invitation email. Check Auth email settings in Supabase.',
    }
  }

  const newUserId = inviteData.user?.id
  if (!newUserId) {
    return { success: false, error: 'Invitation did not return a user id.' }
  }

  const { error: membershipError } = await serviceClient.from('memberships').insert({
    tenant_id: tenantId,
    user_id: newUserId,
    role,
  })

  if (membershipError) {
    try {
      await serviceClient.auth.admin.deleteUser(newUserId)
    } catch {
      // best-effort rollback
    }
    return { success: false, error: membershipError.message }
  }

  return { success: true, data: { emailed: true } }
}

export async function updateMemberRole(
  membershipId: string,
  newRole: MemberRole
): Promise<ActionResponse> {
  if (newRole !== 'editor' && newRole !== 'staff') {
    return { success: false, error: 'Invalid role.' }
  }

  const tenantId = await getTenantId()
  const currentRole = await getUserRole(tenantId)
  if (currentRole !== 'editor') return { success: false, error: 'Not authorized.' }

  const user = await getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  const { supabase } = await createTenantClient()

  const { data: target } = await supabase
    .from('memberships')
    .select('user_id')
    .eq('id', membershipId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (target?.user_id === user.id) {
    return { success: false, error: 'You cannot change your own role.' }
  }

  const { error } = await supabase
    .from('memberships')
    .update({ role: newRole })
    .eq('id', membershipId)
    .eq('tenant_id', tenantId)

  if (error) return { success: false, error: error.message }
  return { success: true, data: undefined }
}

export async function removeMember(membershipId: string): Promise<ActionResponse> {
  const tenantId = await getTenantId()
  const currentRole = await getUserRole(tenantId)
  if (currentRole !== 'editor') return { success: false, error: 'Not authorized.' }

  const user = await getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  const { supabase } = await createTenantClient()

  const { data: target } = await supabase
    .from('memberships')
    .select('user_id')
    .eq('id', membershipId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (target?.user_id === user.id) {
    return { success: false, error: 'You cannot remove yourself.' }
  }

  const { error } = await supabase
    .from('memberships')
    .delete()
    .eq('id', membershipId)
    .eq('tenant_id', tenantId)

  if (error) return { success: false, error: error.message }
  return { success: true, data: undefined }
}

export async function getMemberProfile(): Promise<
  ActionResponse<{ first_name: string | null; last_name: string | null; job_title: string | null }>
> {
  const tenantId = await getTenantId()
  const user = await getUser()
  if (!user) return { success: false, error: 'Not authorized.' }
  const role = await getUserRole(tenantId)
  if (!role) return { success: false, error: 'Not authorized.' }

  const { supabase } = await createTenantClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('memberships') as any)
    .select('first_name, last_name, job_title')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .single()

  if (error) return { success: false, error: error.message }
  const row = data as {
    first_name: string | null
    last_name: string | null
    job_title: string | null
  } | null
  return {
    success: true,
    data: {
      first_name: row?.first_name ?? null,
      last_name: row?.last_name ?? null,
      job_title: row?.job_title ?? null,
    },
  }
}

export async function updateMemberProfile(data: {
  first_name: string
  last_name: string
  job_title: string
}): Promise<ActionResponse> {
  const tenantId = await getTenantId()
  const user = await getUser()
  if (!user) return { success: false, error: 'Not authorized.' }
  const role = await getUserRole(tenantId)
  if (!role) return { success: false, error: 'Not authorized.' }

  // Use service client: RLS UPDATE policy is editors-only, but any member
  // should be able to update their own profile fields.
  const serviceClient = createSupabaseServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (serviceClient.from('memberships') as any)
    .update({
      first_name: data.first_name.trim() || null,
      last_name: data.last_name.trim() || null,
      job_title: data.job_title.trim() || null,
    })
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  return { success: true, data: undefined }
}

export async function updateStaffProfile(
  membershipId: string,
  data: { first_name: string; last_name: string; job_title: string }
): Promise<ActionResponse> {
  const tenantId = await getTenantId()
  const currentRole = await getUserRole(tenantId)
  if (currentRole !== 'editor') return { success: false, error: 'Not authorized.' }

  const serviceClient = createSupabaseServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: target, error: fetchError } = await (serviceClient.from('memberships') as any)
    .select('role')
    .eq('id', membershipId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (fetchError) return { success: false, error: fetchError.message }
  if (!target) return { success: false, error: 'Member not found.' }
  if ((target as { role: string }).role !== 'staff') {
    return { success: false, error: 'Can only edit staff profiles.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (serviceClient.from('memberships') as any)
    .update({
      first_name: data.first_name.trim() || null,
      last_name: data.last_name.trim() || null,
      job_title: data.job_title.trim() || null,
    })
    .eq('id', membershipId)
    .eq('tenant_id', tenantId)

  if (error) return { success: false, error: error.message }
  return { success: true, data: undefined }
}

export async function updateMember(
  membershipId: string,
  input: MemberEditInput
): Promise<ActionResponse> {
  const tenantId = await getTenantId()
  const currentRole = await getUserRole(tenantId)
  if (currentRole !== 'editor') return { success: false, error: 'Not authorized.' }

  const parsed = memberEditSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const { first_name, last_name, phone, job_title, hourly_rate, currency } = parsed.data

  const serviceClient = createSupabaseServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (serviceClient.from('memberships') as any)
    .update({
      first_name: first_name.trim() || null,
      last_name: last_name.trim() || null,
      phone: phone.trim() || null,
      job_title: job_title.trim() || null,
      hourly_rate,
      currency: currency.trim().toUpperCase() || null,
    })
    .eq('id', membershipId)
    .eq('tenant_id', tenantId)

  if (error) return { success: false, error: error.message }
  return { success: true, data: undefined }
}

export async function cancelInvitation(invitationId: string): Promise<ActionResponse> {
  const tenantId = await getTenantId()
  const role = await getUserRole(tenantId)
  if (role !== 'editor') return { success: false, error: 'Not authorized.' }

  const { supabase } = await createTenantClient()
  const { error } = await supabase
    .from('pending_invitations')
    .delete()
    .eq('id', invitationId)
    .eq('tenant_id', tenantId)

  if (error) return { success: false, error: error.message }
  return { success: true, data: undefined }
}
