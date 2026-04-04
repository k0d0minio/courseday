'use server';

import { createTenantClient } from '@/lib/supabase-server';
import { getTenantId } from '@/lib/tenant';
import { requireEditor, getUserRole } from '@/lib/membership';
import { hotelBookingSchema } from '@/lib/hotel-booking-schema';
import type { HotelBookingFormData } from '@/lib/hotel-booking-schema';
import { datesInRange } from '@/lib/day-utils';
import type { ActionResponse } from '@/types/actions';
import type { HotelBooking } from '@/types/index';

export async function createHotelBooking(
  raw: HotelBookingFormData
): Promise<ActionResponse<HotelBooking>> {
  const parsed = hotelBookingSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const tenantId = await getTenantId();
  await requireEditor(tenantId);

  const { supabase } = await createTenantClient();
  const d = parsed.data;

  const { data: booking, error } = await supabase
    .from('hotel_booking')
    .insert({
      tenant_id: tenantId,
      guest_name: d.guestName,
      guest_count: d.guestCount,
      check_in: d.checkIn,
      check_out: d.checkOut,
      is_tour_operator: d.isTourOperator,
      notes: d.notes || null,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  // Auto-create breakfast configurations for each night of the stay.
  // checkIn is the first night; checkOut day is departure (no breakfast).
  const nights = nightDates(d.checkIn, d.checkOut);
  if (nights.length > 0) {
    await supabase.from('breakfast_configuration').insert(
      nights.map((date) => ({
        tenant_id: tenantId,
        hotel_booking_id: booking.id,
        breakfast_date: date,
      }))
    );
    // breakfast_configuration table is created in T-26 migration.
    // Errors are intentionally not surfaced here — the booking is committed.
  }

  return { success: true, data: booking as HotelBooking };
}

export async function updateHotelBooking(
  id: string,
  raw: HotelBookingFormData
): Promise<ActionResponse<HotelBooking>> {
  const parsed = hotelBookingSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const tenantId = await getTenantId();
  await requireEditor(tenantId);

  const { supabase } = await createTenantClient();
  const d = parsed.data;

  const { data: existing, error: fetchError } = await supabase
    .from('hotel_booking')
    .select('check_in, check_out')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchError) return { success: false, error: fetchError.message };

  const { data: booking, error } = await supabase
    .from('hotel_booking')
    .update({
      guest_name: d.guestName,
      guest_count: d.guestCount,
      check_in: d.checkIn,
      check_out: d.checkOut,
      is_tour_operator: d.isTourOperator,
      notes: d.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  // Reconcile breakfast configurations when dates change (added in T-26).
  const datesChanged = existing.check_in !== d.checkIn || existing.check_out !== d.checkOut;
  if (datesChanged) {
    await reconcileBreakfastConfigs(
      supabase,
      tenantId,
      id,
      existing.check_in,
      existing.check_out,
      d.checkIn,
      d.checkOut
    );
  }

  return { success: true, data: booking as HotelBooking };
}

export async function deleteHotelBooking(id: string): Promise<ActionResponse> {
  const tenantId = await getTenantId();
  await requireEditor(tenantId);

  const { supabase } = await createTenantClient();
  const { error } = await supabase
    .from('hotel_booking')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function getHotelBookingsForDate(
  dateIso: string
): Promise<ActionResponse<HotelBooking[]>> {
  const tenantId = await getTenantId();
  const role = await getUserRole(tenantId);
  if (!role) return { success: false, error: 'Not authorized.' };

  const { supabase } = await createTenantClient();
  const { data, error } = await supabase
    .from('hotel_booking')
    .select('*')
    .eq('tenant_id', tenantId)
    .lte('check_in', dateIso)
    .gt('check_out', dateIso)
    .order('guest_name');

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as HotelBooking[] };
}

export async function getHotelBookingsForDateRange(
  start: string,
  end: string
): Promise<ActionResponse<HotelBooking[]>> {
  const tenantId = await getTenantId();
  const role = await getUserRole(tenantId);
  if (!role) return { success: false, error: 'Not authorized.' };

  const { supabase } = await createTenantClient();
  // Overlapping: booking's check_in < range end AND booking's check_out > range start
  const { data, error } = await supabase
    .from('hotel_booking')
    .select('*')
    .eq('tenant_id', tenantId)
    .lt('check_in', end)
    .gt('check_out', start)
    .order('check_in');

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as HotelBooking[] };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Returns all night dates for a stay: check_in up to (but not including) check_out. */
function nightDates(checkIn: string, checkOut: string): string[] {
  // checkOut day is departure — no breakfast needed for that day
  const dayBefore = subtractOneDay(checkOut);
  if (dayBefore < checkIn) return [];
  return datesInRange(checkIn, dayBefore);
}

function subtractOneDay(dateIso: string): string {
  const d = new Date(dateIso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Reconciles breakfast_configuration rows when booking dates change.
 * Deletes configs for removed nights, inserts configs for new nights.
 * No-op if breakfast_configuration table does not yet exist (T-26).
 */
async function reconcileBreakfastConfigs(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  tenantId: string,
  bookingId: string,
  oldCheckIn: string,
  oldCheckOut: string,
  newCheckIn: string,
  newCheckOut: string
): Promise<void> {
  const oldNights = new Set(nightDates(oldCheckIn, oldCheckOut));
  const newNights = new Set(nightDates(newCheckIn, newCheckOut));

  const toDelete = [...oldNights].filter((d) => !newNights.has(d));
  const toAdd = [...newNights].filter((d) => !oldNights.has(d));

  if (toDelete.length > 0) {
    await supabase
      .from('breakfast_configuration')
      .delete()
      .eq('hotel_booking_id', bookingId)
      .in('breakfast_date', toDelete);
  }

  if (toAdd.length > 0) {
    await supabase.from('breakfast_configuration').insert(
      toAdd.map((date) => ({
        tenant_id: tenantId,
        hotel_booking_id: bookingId,
        breakfast_date: date,
      }))
    );
  }
}
