import { createTenantClient } from '@/lib/supabase-server'

/**
 * Returns a Supabase query builder scoped to the current tenant.
 * Already has .eq('tenant_id', tenantId) applied as a belt-and-suspenders
 * layer on top of RLS. Chain additional filters and call .select() as needed.
 *
 * Usage:
 *   const q = await tenantQuery('program_items');
 *   const { data } = await q.eq('day_id', dayId).order('start_time');
 */
export async function tenantQuery(table: string) {
  const { supabase, tenantId } = await createTenantClient()
  return supabase.from(table).select('*').eq('tenant_id', tenantId)
}

/**
 * Inserts a row into the given table, automatically injecting tenant_id.
 * Uses the authenticated user's session so RLS policies still apply.
 *
 * Usage:
 *   const { data, error } = await tenantInsert('program_items', { title: 'Welcome', ... });
 */
export async function tenantInsert<T extends Record<string, unknown>>(table: string, data: T) {
  const { supabase, tenantId } = await createTenantClient()
  return supabase.from(table).insert({ ...data, tenant_id: tenantId })
}
