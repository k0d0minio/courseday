'use server';

import { redis } from '@/lib/redis';
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from '@/lib/supabase-server';
import { buildAuthConfirmRedirectUrl } from '@/lib/auth-email-redirect';
import { isValidSlug } from '@/lib/tenant-validation';
import type { ActionResponse } from '@/types/actions';

type CourseResult = { slug: string; requiresConfirmation: boolean };

/**
 * Creates a Supabase user account and a tenant in one shot.
 * Used from the root-domain /new page where the user has no account yet.
 * Uses the service client for tenant/membership writes so that email
 * confirmation state doesn't block the record creation.
 */
export async function createCourse(data: {
  email: string;
  password: string;
  name: string;
  slug: string;
}): Promise<ActionResponse<CourseResult>> {
  if (!isValidSlug(data.slug)) {
    return {
      success: false,
      error:
        'Slug must be 3–63 characters, lowercase alphanumeric and hyphens only, and must not start or end with a hyphen.',
    };
  }

  // Check slug availability (Redis fast path, then Supabase)
  const existingInRedis = await redis.get(`subdomain:${data.slug}`);
  if (existingInRedis) {
    return { success: false, error: 'That subdomain is already taken.' };
  }

  const serviceClient = createSupabaseServiceClient();
  const { data: existingTenant } = await serviceClient
    .from('tenants')
    .select('id')
    .eq('slug', data.slug)
    .maybeSingle();

  if (existingTenant) {
    return { success: false, error: 'That subdomain is already taken.' };
  }

  // Sign up the user — returns user.id even when email confirmation is pending
  const anonClient = await createSupabaseServerClient();
  const { data: authData, error: authError } = await anonClient.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      emailRedirectTo: buildAuthConfirmRedirectUrl({
        slug: data.slug,
        flow: 'signup',
      }),
    },
  });

  if (authError || !authData.user) {
    return { success: false, error: authError?.message ?? 'Sign up failed.' };
  }

  const userId = authData.user.id;

  // Create the tenant
  const { data: tenant, error: tenantError } = await serviceClient
    .from('tenants')
    .insert({ name: data.name, slug: data.slug })
    .select('id, name, slug')
    .single();

  if (tenantError || !tenant) {
    return { success: false, error: 'Failed to create course.' };
  }

  // Store in Redis
  await redis.set(
    `subdomain:${data.slug}`,
    JSON.stringify({ id: tenant.id, name: tenant.name, slug: tenant.slug })
  );

  // Create editor membership using service client (user has no session yet)
  await serviceClient.from('memberships').insert({
    user_id: userId,
    tenant_id: tenant.id,
    role: 'editor',
  });

  return {
    success: true,
    data: {
      slug: data.slug,
      requiresConfirmation: !authData.session,
    },
  };
}
