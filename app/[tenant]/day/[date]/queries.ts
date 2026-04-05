import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { Activity, Reservation, BreakfastConfiguration } from '@/types/index';
import type { DayNote } from '@/app/actions/day-notes';

export async function getProgramItemsForDay(
  tenantId: string,
  dayId: string
): Promise<Activity[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('activity')
    .select('*, point_of_contact(*), venue_type(*)')
    .eq('tenant_id', tenantId)
    .eq('day_id', dayId)
    .order('start_time', { nullsFirst: true });
  return (data ?? []) as unknown as Activity[];
}

export async function getReservationsForDay(
  tenantId: string,
  dayId: string
): Promise<Reservation[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('reservation')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('day_id', dayId)
    .order('start_time', { nullsFirst: true });
  return (data ?? []) as unknown as Reservation[];
}

export async function getBreakfastConfigsForDay(
  tenantId: string,
  dayId: string
): Promise<BreakfastConfiguration[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('breakfast_configuration')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('day_id', dayId)
    .order('start_time', { nullsFirst: true });
  return (data ?? []) as unknown as BreakfastConfiguration[];
}

export async function getDayNotesForDay(
  tenantId: string,
  dayId: string
): Promise<DayNote[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('day_notes')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('day_id', dayId)
    .order('created_at', { ascending: true });
  return (data ?? []) as unknown as DayNote[];
}
