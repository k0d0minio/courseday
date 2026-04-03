'use server';

import { redis } from '@/lib/redis';
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from '@/lib/supabase-server';
import { isValidSlug } from '@/lib/tenant-validation';

export type TenantRedisData = {
  id: string;
  name: string;
  slug: string;
};

type ActionResponse<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

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
    .select('id, name, slug')
    .single();

  if (error || !tenant) {
    return { success: false, error: 'Failed to create tenant.' };
  }

  // Store in Redis
  const redisData: TenantRedisData = {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
  };
  await redis.set(`subdomain:${tenant.slug}`, JSON.stringify(redisData));

  // TODO (T-08): Create initial membership row for the creating user with role 'editor'.
  // Requires the memberships table introduced in T-08.

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
    .select('id, name, slug')
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
  };
  await redis.set(`subdomain:${tenant.slug}`, JSON.stringify(redisData));

  return { success: true, data: redisData };
}

// ---------------------------------------------------------------------------
// updateTenant
// ---------------------------------------------------------------------------
export async function updateTenant(
  id: string,
  data: { name?: string; slug?: string; logo_url?: string; timezone?: string }
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
    .select('id, name, slug')
    .eq('id', id)
    .single();

  if (!current) {
    return { success: false, error: 'Tenant not found.' };
  }

  const { data: updated, error } = await serviceClient
    .from('tenants')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, name, slug')
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
  };
  await redis.set(`subdomain:${updated.slug}`, JSON.stringify(redisData));

  return { success: true, data: redisData };
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
