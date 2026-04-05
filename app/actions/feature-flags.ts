'use server';

import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { getSuperadminStatus } from '@/lib/superadmin';
import { KNOWN_FLAGS } from '@/lib/feature-flags';
import type { FlagKey, FlagMap } from '@/lib/feature-flags';
import type { ActionResponse } from '@/types/actions';

/**
 * Returns the feature flag map for a tenant.
 * Rows missing from the DB are defaulted to enabled=true.
 * Safe to call from server components — uses the service client.
 */
export async function getFeatureFlags(tenantId: string): Promise<FlagMap> {
  const serviceClient = createSupabaseServiceClient();
  const { data } = await serviceClient
    .from('feature_flags')
    .select('flag_key, enabled')
    .eq('tenant_id', tenantId);

  const map: FlagMap = {} as FlagMap;
  for (const key of KNOWN_FLAGS) {
    const row = data?.find((r) => r.flag_key === key);
    map[key] = row ? row.enabled : true;
  }
  return map;
}

/**
 * Returns feature flag maps for multiple tenants at once (admin use).
 * Returns a map keyed by tenantId.
 */
export async function getFeatureFlagsByTenants(
  tenantIds: string[]
): Promise<Record<string, FlagMap>> {
  if (!tenantIds.length) return {};

  const serviceClient = createSupabaseServiceClient();
  const { data } = await serviceClient
    .from('feature_flags')
    .select('tenant_id, flag_key, enabled')
    .in('tenant_id', tenantIds);

  const result: Record<string, FlagMap> = {};
  for (const tenantId of tenantIds) {
    const map: FlagMap = {} as FlagMap;
    for (const key of KNOWN_FLAGS) {
      const row = data?.find((r) => r.tenant_id === tenantId && r.flag_key === key);
      map[key] = row ? row.enabled : true;
    }
    result[tenantId] = map;
  }
  return result;
}

/**
 * Sets a feature flag for a tenant. Superadmin only.
 */
export async function setFeatureFlag(
  tenantId: string,
  key: FlagKey,
  enabled: boolean
): Promise<ActionResponse> {
  const ok = await getSuperadminStatus();
  if (!ok) return { success: false, error: 'Not authorized.' };

  if (!(KNOWN_FLAGS as readonly string[]).includes(key)) {
    return { success: false, error: 'Unknown flag key.' };
  }

  const serviceClient = createSupabaseServiceClient();
  const { error } = await serviceClient
    .from('feature_flags')
    .upsert(
      { tenant_id: tenantId, flag_key: key, enabled, updated_at: new Date().toISOString() },
      { onConflict: 'tenant_id,flag_key' }
    );

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}
