'use server';

import { redis } from '@/lib/redis';
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from '@/lib/supabase-server';
import { isValidSlug } from '@/lib/tenant-validation';
import { getUser } from '@/app/actions/auth';
import type { ActionResponse } from '@/types/actions';

export type TenantStatus = 'active' | 'suspended' | 'archived';

export type TenantRedisData = {
  id: string;
  name: string;
  slug: string;
  language: string;
  status: TenantStatus;
};

// ---------------------------------------------------------------------------
// createTenant
// ---------------------------------------------------------------------------
export async function createTenant(data: {
  name: string;
  slug: string;
}): Promise<ActionResponse<TenantRedisData>> {
  if (!isValidSlug(data.slug)) {
    return {
      success: false,
      error:
        'Slug must be 3–63 characters, lowercase alphanumeric and hyphens only, and must not start or end with a hyphen.',
    };
  }

  // Check Redis first (fast path)
  const existingInRedis = await redis.get(`subdomain:${data.slug}`);
  if (existingInRedis) {
    return { success: false, error: 'This subdomain is already taken.' };
  }

  // Check Supabase (source of truth)
  const serviceClient = createSupabaseServiceClient();
  const { data: existing } = await serviceClient
    .from('tenants')
    .select('id')
    .eq('slug', data.slug)
    .maybeSingle();

  if (existing) {
    return { success: false, error: 'This subdomain is already taken.' };
  }

  // Insert into Supabase
  const { data: tenant, error } = await serviceClient
    .from('tenants')
    .insert({ name: data.name, slug: data.slug })
    .select('id, name, slug, language, status')
    .single();

  if (error || !tenant) {
    return { success: false, error: 'Failed to create tenant.' };
  }

  // Store in Redis
  const redisData: TenantRedisData = {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    language: (tenant as { language?: string }).language ?? 'en',
    status: ((tenant as { status?: string }).status ?? 'active') as TenantStatus,
  };
  await redis.set(`subdomain:${tenant.slug}`, JSON.stringify(redisData));

  // Create initial membership row for the creating user with role 'editor'.
  // Must use service client — user has no membership yet so RLS would block.
  const { getUser } = await import('@/app/actions/auth');
  const currentUser = await getUser();
  if (!currentUser) {
    await serviceClient.from('tenants').delete().eq('id', tenant.id);
    await redis.del(`subdomain:${tenant.slug}`);
    return { success: false, error: 'Not authenticated.' };
  }

  await serviceClient.from('memberships').insert({
    user_id: currentUser.id,
    tenant_id: tenant.id,
    role: 'editor',
  });

  return { success: true, data: redisData };
}

// ---------------------------------------------------------------------------
// getTenantBySlug
// ---------------------------------------------------------------------------
export async function getTenantBySlug(
  slug: string
): Promise<ActionResponse<TenantRedisData>> {
  // Redis fast path
  const cached = await redis.get(`subdomain:${slug}`);
  if (cached) {
    return { success: true, data: JSON.parse(cached) as TenantRedisData };
  }

  // Fallback to Supabase
  const serviceClient = createSupabaseServiceClient();
  const { data: tenant } = await serviceClient
    .from('tenants')
    .select('id, name, slug, language, status')
    .eq('slug', slug)
    .maybeSingle();

  if (!tenant) {
    return { success: false, error: 'Tenant not found.' };
  }

  // Backfill Redis
  const redisData: TenantRedisData = {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    language: (tenant as { language?: string }).language ?? 'en',
    status: ((tenant as { status?: string }).status ?? 'active') as TenantStatus,
  };
  await redis.set(`subdomain:${tenant.slug}`, JSON.stringify(redisData));

  return { success: true, data: redisData };
}

// ---------------------------------------------------------------------------
// updateTenant
// ---------------------------------------------------------------------------
export async function updateTenant(
  id: string,
  data: { name?: string; slug?: string; logo_url?: string | null; accent_color?: string | null; timezone?: string; language?: string; latitude?: number | null; longitude?: number | null; onboarding_completed?: boolean }
): Promise<ActionResponse<TenantRedisData>> {
  const serviceClient = createSupabaseServiceClient();

  if (data.slug !== undefined && !isValidSlug(data.slug)) {
    return {
      success: false,
      error: 'Invalid slug format.',
    };
  }

  // Get current record so we can clean up Redis if slug changes
  const { data: current } = await serviceClient
    .from('tenants')
    .select('id, name, slug, language, status')
    .eq('id', id)
    .single();

  if (!current) {
    return { success: false, error: 'Tenant not found.' };
  }

  const { data: updated, error } = await serviceClient
    .from('tenants')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, name, slug, language, status')
    .single();

  if (error || !updated) {
    return { success: false, error: 'Failed to update tenant.' };
  }

  // If slug changed, remove old Redis key
  if (data.slug && data.slug !== current.slug) {
    await redis.del(`subdomain:${current.slug}`);
  }

  // Upsert Redis with latest data
  const redisData: TenantRedisData = {
    id: updated.id,
    name: updated.name,
    slug: updated.slug,
    language: (updated as { language?: string }).language ?? 'en',
    status: ((updated as { status?: string }).status ?? 'active') as TenantStatus,
  };
  await redis.set(`subdomain:${updated.slug}`, JSON.stringify(redisData));

  return { success: true, data: redisData };
}

// ---------------------------------------------------------------------------
// completeOnboarding
// ---------------------------------------------------------------------------
export async function completeOnboarding(tenantId: string): Promise<ActionResponse> {
  const serviceClient = createSupabaseServiceClient();
  const { error } = await serviceClient
    .from('tenants')
    .update({ onboarding_completed: true } as Record<string, unknown>)
    .eq('id', tenantId);

  if (error) {
    return { success: false, error: 'Failed to complete onboarding.' };
  }
  return { success: true, data: undefined };
}

// ---------------------------------------------------------------------------
// deleteTenant
// ---------------------------------------------------------------------------
export async function deleteTenant(id: string): Promise<ActionResponse> {
  const serviceClient = createSupabaseServiceClient();

  // Fetch slug before deleting so we can remove the Redis key
  const { data: tenant } = await serviceClient
    .from('tenants')
    .select('slug')
    .eq('id', id)
    .single();

  if (!tenant) {
    return { success: false, error: 'Tenant not found.' };
  }

  const { error } = await serviceClient.from('tenants').delete().eq('id', id);

  if (error) {
    return { success: false, error: 'Failed to delete tenant.' };
  }

  await redis.del(`subdomain:${tenant.slug}`);

  return { success: true, data: undefined };
}

// ---------------------------------------------------------------------------
// setTenantStatus — shared helper for suspend/reactivate/archive
// ---------------------------------------------------------------------------
async function setTenantStatus(id: string, status: TenantStatus): Promise<ActionResponse> {
  const serviceClient = createSupabaseServiceClient();

  const { data: updated, error } = await serviceClient
    .from('tenants')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, name, slug, language, status')
    .single();

  if (error || !updated) {
    return { success: false, error: `Failed to update tenant status.` };
  }

  // Refresh Redis so middleware picks up the new status immediately
  const redisData: TenantRedisData = {
    id: updated.id,
    name: updated.name,
    slug: updated.slug,
    language: (updated as { language?: string }).language ?? 'en',
    status: ((updated as { status?: string }).status ?? 'active') as TenantStatus,
  };
  await redis.set(`subdomain:${updated.slug}`, JSON.stringify(redisData));

  return { success: true, data: undefined };
}

export async function suspendTenant(id: string): Promise<ActionResponse> {
  return setTenantStatus(id, 'suspended');
}

export async function reactivateTenant(id: string): Promise<ActionResponse> {
  return setTenantStatus(id, 'active');
}

export async function archiveTenant(id: string): Promise<ActionResponse> {
  return setTenantStatus(id, 'archived');
}
