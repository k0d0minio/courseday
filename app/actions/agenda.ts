'use server';

import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase-server';
import { getTenantId } from '@/lib/tenant';
import { datesInRange, getWeekdayName } from '@/lib/day-utils';
import type { ActionResponse } from '@/types/actions';
import type { DaySummary } from '@/components/HomeClient';

/**
 * Returns aggregated DaySummary rows for every date in [start, end].
 * Upserts Day rows as a side effect (idempotent).
 */
export async function getDaySummaries(
  start: string,
  end: string
): Promise<ActionResponse<DaySummary[]>> {
  const tenantId = await getTenantId();
  const supabase = await createSupabaseServerClient();
  const serviceClient = createSupabaseServiceClient();

  // Ensure Day rows exist for every date in the range
  const dates = datesInRange(start, end);
  const rows = dates.map((d) => ({
    tenant_id: tenantId,
    date_iso: d,
    weekday: getWeekdayName(d),
  }));

  const { data: dayRows, error: dayErr } = await serviceClient
    .from('day')
    .upsert(rows, { onConflict: 'tenant_id,date_iso' })
    .select('id,date_iso');

  if (dayErr || !dayRows) {
    return { success: false, error: dayErr?.message ?? 'Failed to load days.' };
  }

  const dayIds = dayRows.map((d) => d.id);
  const dayDateMap = new Map<string, string>(dayRows.map((d) => [d.id, d.date_iso as string]));

  // Fetch counts in parallel — only select the columns we need
  const [activitiesRes, reservationsRes, breakfastRes] = await Promise.all([
    supabase
      .from('activity')
      .select('day_id')
      .eq('tenant_id', tenantId)
      .in('day_id', dayIds)
      .is('deleted_at', null),
    supabase
      .from('reservation')
      .select('day_id')
      .eq('tenant_id', tenantId)
      .in('day_id', dayIds)
      .is('deleted_at', null),
    supabase
      .from('breakfast_configuration')
      .select('breakfast_date,total_guests')
      .eq('tenant_id', tenantId)
      .gte('breakfast_date', start)
      .lte('breakfast_date', end)
      .is('deleted_at', null),
  ]);

  // Build summary map
  const summaryMap = new Map<string, DaySummary>();
  for (const row of dayRows) {
    summaryMap.set(row.date_iso as string, {
      date: row.date_iso as string,
      dayId: row.id as string,
      golfCount: 0,
      reservationCount: 0,
      breakfastCount: 0,
    });
  }

  for (const item of activitiesRes.data ?? []) {
    const date = dayDateMap.get((item as { day_id: string }).day_id);
    if (!date) continue;
    const s = summaryMap.get(date);
    if (s) s.golfCount++;
  }

  for (const item of reservationsRes.data ?? []) {
    const date = dayDateMap.get((item as { day_id: string }).day_id);
    if (!date) continue;
    const s = summaryMap.get(date);
    if (s) s.reservationCount++;
  }

  for (const item of breakfastRes.data ?? []) {
    const s = summaryMap.get((item as { breakfast_date: string }).breakfast_date);
    if (s) s.breakfastCount += (item as { total_guests: number }).total_guests;
  }

  const summaries = [...summaryMap.values()].sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  return { success: true, data: summaries };
}
