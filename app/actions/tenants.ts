'use server'

import { redis } from '@/lib/redis'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase-server'
import { isValidSlug } from '@/lib/tenant-validation'
import { getUser } from '@/app/actions/auth'
import { getUserRole } from '@/lib/membership'
import { isUserSuperadmin } from '@/lib/superadmin'
import type { ActionResponse } from '@/types/actions'

export type TenantStatus = 'active' | 'suspended' | 'archived'

export type TenantRedisData = {
  id: string
  name: string
  slug: string
  language: string
  status: TenantStatus
}

// ---------------------------------------------------------------------------
// createTenant
// ---------------------------------------------------------------------------
export async function createTenant(data: {
  name: string
  slug: string
}): Promise<ActionResponse<TenantRedisData>> {
  if (!isValidSlug(data.slug)) {
    return {
      success: false,
      error:
        'Slug must be 3–63 characters, lowercase alphanumeric and hyphens only, and must not start or end with a hyphen.',
    }
  }

  // Check Supabase first (source of truth)
  const serviceClient = createSupabaseServiceClient()
  const { data: existing, error: existingError } = await serviceClient
    .from('tenants')
    .select('id')
    .eq('slug', data.slug)
    .maybeSingle()

  if (existingError) {
    return { success: false, error: 'Failed to validate tenant slug.' }
  }

  if (existing) {
    return { success: false, error: 'This subdomain is already taken.' }
  }

  // Redis is cache only. If key exists without DB row, clear stale key.
  const existingInRedis = await redis.get(`subdomain:${data.slug}`)
  if (existingInRedis) {
    await redis.del(`subdomain:${data.slug}`)
  }

  // Insert into Supabase
  const { data: tenant, error } = await serviceClient
    .from('tenants')
    .insert({ name: data.name, slug: data.slug })
    .select('id, name, slug, language, status')
    .single()

  if (error || !tenant) {
    if (error?.code === '23505') {
      return { success: false, error: 'This subdomain is already taken.' }
    }
    return { success: false, error: 'Failed to create tenant.' }
  }

  // Store in Redis
  const redisData: TenantRedisData = {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    language: (tenant as { language?: string }).language ?? 'en',
    status: ((tenant as { status?: string }).status ?? 'active') as TenantStatus,
  }
  await redis.set(`subdomain:${tenant.slug}`, JSON.stringify(redisData), 'EX', 86400)

  // Create initial membership row for the creating user with role 'editor'.
  // Must use service client — user has no membership yet so RLS would block.
  const { getUser } = await import('@/app/actions/auth')
  const currentUser = await getUser()
  if (!currentUser) {
    await serviceClient.from('tenants').delete().eq('id', tenant.id)
    await redis.del(`subdomain:${tenant.slug}`)
    return { success: false, error: 'Not authenticated.' }
  }

  await serviceClient.from('memberships').insert({
    user_id: currentUser.id,
    tenant_id: tenant.id,
    role: 'editor',
  })

  return { success: true, data: redisData }
}

// ---------------------------------------------------------------------------
// getTenantBySlug
// ---------------------------------------------------------------------------
export async function getTenantBySlug(slug: string): Promise<ActionResponse<TenantRedisData>> {
  // Redis fast path
  try {
    const cached = await redis.get(`subdomain:${slug}`)
    if (cached) {
      return { success: true, data: JSON.parse(cached) as TenantRedisData }
    }
  } catch (err) {
    // Redis outage or corrupt cache value — fall through to Supabase.
    console.error('[getTenantBySlug] redis cache read failed', { slug, err })
  }

  // Fallback to Supabase
  const serviceClient = createSupabaseServiceClient()
  const { data: tenant } = await serviceClient
    .from('tenants')
    .select('id, name, slug, language, status')
    .eq('slug', slug)
    .maybeSingle()

  if (!tenant) {
    return { success: false, error: 'Tenant not found.' }
  }

  // Backfill Redis
  const redisData: TenantRedisData = {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    language: (tenant as { language?: string }).language ?? 'en',
    status: ((tenant as { status?: string }).status ?? 'active') as TenantStatus,
  }
  await redis.set(`subdomain:${tenant.slug}`, JSON.stringify(redisData), 'EX', 86400)

  return { success: true, data: redisData }
}

// ---------------------------------------------------------------------------
// updateTenant
// ---------------------------------------------------------------------------
export async function updateTenant(
  id: string,
  data: {
    name?: string
    slug?: string
    logo_url?: string | null
    accent_color?: string | null
    theme_palette?: string
    timezone?: string
    language?: string
    latitude?: number | null
    longitude?: number | null
    onboarding_completed?: boolean
    email_from_name?: string | null
    email_reply_to?: string | null
  }
): Promise<ActionResponse<TenantRedisData>> {
  const user = await getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated.' }
  }

  const role = await getUserRole(id)
  if (role !== 'editor') {
    return {
      success: false,
      error: 'Not authorized to update this tenant.',
    }
  }

  if (data.slug !== undefined && !isValidSlug(data.slug)) {
    return {
      success: false,
      error: 'Invalid slug format.',
    }
  }

  const supabase = await createSupabaseServerClient()

  // RLS: editors may read/update their tenant (see migration 00027_tenants_editor_update).
  const { data: current, error: fetchError } = await supabase
    .from('tenants')
    .select('id, name, slug, language, status')
    .eq('id', id)
    .single()

  if (fetchError) {
    return {
      success: false,
      error: fetchError.message || 'Tenant not found.',
    }
  }

  if (!current) {
    return { success: false, error: 'Tenant not found.' }
  }

  const { data: updated, error: updateError } = await supabase
    .from('tenants')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, name, slug, language, status')
    .single()

  if (updateError || !updated) {
    return {
      success: false,
      error: updateError?.message ?? 'Failed to update tenant.',
    }
  }

  // If slug changed, remove old Redis key
  if (data.slug && data.slug !== current.slug) {
    await redis.del(`subdomain:${current.slug}`)
  }

  // Upsert Redis with latest data
  const redisData: TenantRedisData = {
    id: updated.id,
    name: updated.name,
    slug: updated.slug,
    language: (updated as { language?: string }).language ?? 'en',
    status: ((updated as { status?: string }).status ?? 'active') as TenantStatus,
  }
  await redis.set(`subdomain:${updated.slug}`, JSON.stringify(redisData), 'EX', 86400)

  return { success: true, data: redisData }
}

// ---------------------------------------------------------------------------
// completeOnboarding
// ---------------------------------------------------------------------------
export async function completeOnboarding(tenantId: string): Promise<ActionResponse> {
  const serviceClient = createSupabaseServiceClient()
  const { error } = await serviceClient
    .from('tenants')
    .update({ onboarding_completed: true } as Record<string, unknown>)
    .eq('id', tenantId)

  if (error) {
    return { success: false, error: 'Failed to complete onboarding.' }
  }
  return { success: true, data: undefined }
}

// ---------------------------------------------------------------------------
// deleteTenant
// ---------------------------------------------------------------------------
export async function deleteTenant(id: string): Promise<ActionResponse> {
  const user = await getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated.' }
  }

  const isSuperadmin = await isUserSuperadmin(user.id)
  if (!isSuperadmin) {
    return { success: false, error: 'Not authorized.' }
  }

  const serviceClient = createSupabaseServiceClient()

  const { data: tenant } = await serviceClient
    .from('tenants')
    .select('id, slug')
    .eq('id', id)
    .single()

  if (!tenant) {
    return { success: false, error: 'Tenant not found.' }
  }

  // Collect member user_ids before cascade removes memberships
  const { data: memberships } = await serviceClient
    .from('memberships')
    .select('user_id')
    .eq('tenant_id', id)

  const memberUserIds = (memberships ?? []).map((m: { user_id: string }) => m.user_id)

  // Remove all storage objects under {tenant_id}/ in tenant-logos
  const { data: storageObjects } = await serviceClient.storage.from('tenant-logos').list(id)

  if (storageObjects && storageObjects.length > 0) {
    const paths = storageObjects.map((obj: { name: string }) => `${id}/${obj.name}`)
    await serviceClient.storage.from('tenant-logos').remove(paths)
  }

  // Delete tenant row — cascades all child tables (activities, shifts, etc.)
  const { error } = await serviceClient.from('tenants').delete().eq('id', id)

  if (error) {
    return { success: false, error: 'Failed to delete tenant.' }
  }

  // Delete auth users whose only membership was this tenant
  for (const userId of memberUserIds) {
    const { data: remaining } = await serviceClient
      .from('memberships')
      .select('tenant_id')
      .eq('user_id', userId)
      .limit(1)

    if (!remaining || remaining.length === 0) {
      await serviceClient.auth.admin.deleteUser(userId)
    }
  }

  await redis.del(`subdomain:${tenant.slug}`)

  return { success: true, data: undefined }
}

// ---------------------------------------------------------------------------
// setTenantStatus — shared helper for suspend/reactivate/archive
// ---------------------------------------------------------------------------
async function setTenantStatus(id: string, status: TenantStatus): Promise<ActionResponse> {
  const serviceClient = createSupabaseServiceClient()

  const { data: updated, error } = await serviceClient
    .from('tenants')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, name, slug, language, status')
    .single()

  if (error || !updated) {
    return { success: false, error: `Failed to update tenant status.` }
  }

  // Refresh Redis so middleware picks up the new status immediately
  const redisData: TenantRedisData = {
    id: updated.id,
    name: updated.name,
    slug: updated.slug,
    language: (updated as { language?: string }).language ?? 'en',
    status: ((updated as { status?: string }).status ?? 'active') as TenantStatus,
  }
  await redis.set(`subdomain:${updated.slug}`, JSON.stringify(redisData), 'EX', 86400)

  return { success: true, data: undefined }
}

export async function suspendTenant(id: string): Promise<ActionResponse> {
  return setTenantStatus(id, 'suspended')
}

export async function reactivateTenant(id: string): Promise<ActionResponse> {
  return setTenantStatus(id, 'active')
}

export async function archiveTenant(id: string): Promise<ActionResponse> {
  return setTenantStatus(id, 'archived')
}
