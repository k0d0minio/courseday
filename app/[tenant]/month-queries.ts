import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { Activity, Reservation, BreakfastConfiguration } from '@/types/index';

export async function getProgramItemsForMonth(
  tenantId: string,
  dayIds: string[]
): Promise<Activity[]> {
  if (dayIds.length === 0) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('activity')
    .select('*')
    .eq('tenant_id', tenantId)
    .in('day_id', dayIds);
  return (data ?? []) as Activity[];
}

export async function getReservationsForMonth(
  tenantId: string,
  dayIds: string[]
): Promise<Reservation[]> {
  if (dayIds.length === 0) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('reservation')
    .select('*')
    .eq('tenant_id', tenantId)
    .in('day_id', dayIds);
  return (data ?? []) as Reservation[];
}

export async function getBreakfastConfigsForMonth(
  tenantId: string,
  start: string,
  end: string
): Promise<BreakfastConfiguration[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('breakfast_configuration')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('breakfast_date', start)
    .lte('breakfast_date', end);
  return (data ?? []) as BreakfastConfiguration[];
}
