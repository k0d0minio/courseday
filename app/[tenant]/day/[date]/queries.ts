import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { ProgramItem, Reservation, HotelBooking, BreakfastConfiguration } from '@/types/index';

// These queries target tables created in T-20, T-23, T-25, T-26.
// Until those migrations are applied they return empty arrays gracefully.

export async function getProgramItemsForDay(
  tenantId: string,
  dayId: string
): Promise<ProgramItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('program_item')
    .select('*, point_of_contact(*), venue_type(*)')
    .eq('tenant_id', tenantId)
    .eq('day_id', dayId)
    .order('start_time', { nullsFirst: true });
  return (data ?? []) as unknown as ProgramItem[];
}

export async function getReservationsForDay(
  tenantId: string,
  dayId: string
): Promise<Reservation[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('reservations')
    .select('*, hotel_bookings(*)')
    .eq('tenant_id', tenantId)
    .eq('day_id', dayId)
    .order('tee_time', { nullsFirst: true });
  return (data ?? []) as unknown as Reservation[];
}

export async function getHotelBookingsForDate(
  tenantId: string,
  dateIso: string
): Promise<HotelBooking[]> {
  const supabase = await createSupabaseServerClient();
  // Bookings where check_in <= dateIso < check_out (guest is on property)
  const { data } = await supabase
    .from('hotel_bookings')
    .select('*')
    .eq('tenant_id', tenantId)
    .lte('check_in', dateIso)
    .gt('check_out', dateIso)
    .order('guest_name');
  return (data ?? []) as unknown as HotelBooking[];
}

export async function getBreakfastConfigsForDay(
  tenantId: string,
  dateIso: string
): Promise<BreakfastConfiguration[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('breakfast_configurations')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('breakfast_date', dateIso)
    .order('created_at');
  return (data ?? []) as unknown as BreakfastConfiguration[];
}
