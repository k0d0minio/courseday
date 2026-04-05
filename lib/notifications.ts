import { createSupabaseServiceClient } from '@/lib/supabase-server';

/**
 * Sends a notification to all members of a tenant except the actor.
 * Fire-and-forget: wrap with Promise.allSettled to avoid blocking mutations.
 *
 * @param tenantId   - Target tenant.
 * @param actorId    - The user who triggered the action (excluded from recipients).
 * @param title      - Short notification title.
 * @param body       - Optional longer description.
 * @param link       - Optional deep-link path, e.g. "/day/2024-01-15".
 */
export async function notifyTenantMembers(
  tenantId: string,
  actorId: string,
  title: string,
  body?: string,
  link?: string
): Promise<void> {
  const serviceClient = createSupabaseServiceClient();

  const { data: members } = await serviceClient
    .from('memberships')
    .select('user_id')
    .eq('tenant_id', tenantId)
    .neq('user_id', actorId);

  if (!members?.length) return;

  const rows = members.map((m) => ({
    tenant_id: tenantId,
    user_id: m.user_id,
    title,
    body: body ?? null,
    link: link ?? null,
  }));

  await serviceClient.from('notifications').insert(rows);
}

/**
 * Resolves a day_id to its date_iso string.
 * Returns null if the day is not found.
 */
export async function getDayDate(dayId: string): Promise<string | null> {
  const serviceClient = createSupabaseServiceClient();
  const { data } = await serviceClient
    .from('day')
    .select('date_iso')
    .eq('id', dayId)
    .maybeSingle();
  return (data as { date_iso: string } | null)?.date_iso ?? null;
}
