'use server';

import { createTenantClient } from '@/lib/supabase-server';
import { getTenantId } from '@/lib/tenant';
import { getUserRole, requireEditor } from '@/lib/membership';
import { reservationSchema } from '@/lib/reservation-schema';
import type { ReservationFormData } from '@/lib/reservation-schema';
import type { ActionResponse } from '@/types/actions';
import type { Reservation } from '@/types/index';

export async function createReservation(
  raw: ReservationFormData
): Promise<ActionResponse<Reservation>> {
  const parsed = reservationSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const tenantId = await getTenantId();
  await requireEditor(tenantId);

  const { supabase } = await createTenantClient();
  const d = parsed.data;

  const { data, error } = await supabase
    .from('reservation')
    .insert({
      tenant_id: tenantId,
      day_id: d.dayId,
      guest_name: d.guestName || null,
      guest_email: d.guestEmail || null,
      guest_phone: d.guestPhone || null,
      guest_count: d.guestCount ?? null,
      start_time: d.startTime || null,
      end_time: d.endTime || null,
      notes: d.notes || null,
      hotel_booking_id: d.hotelBookingId ?? null,
      program_item_id: d.programItemId ?? null,
      table_index: d.tableIndex ?? null,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as Reservation };
}

export async function updateReservation(
  id: string,
  raw: ReservationFormData
): Promise<ActionResponse<Reservation>> {
  const parsed = reservationSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const tenantId = await getTenantId();
  await requireEditor(tenantId);

  const { supabase } = await createTenantClient();
  const d = parsed.data;

  const { data, error } = await supabase
    .from('reservation')
    .update({
      guest_name: d.guestName || null,
      guest_email: d.guestEmail || null,
      guest_phone: d.guestPhone || null,
      guest_count: d.guestCount ?? null,
      start_time: d.startTime || null,
      end_time: d.endTime || null,
      notes: d.notes || null,
      hotel_booking_id: d.hotelBookingId ?? null,
      program_item_id: d.programItemId ?? null,
      table_index: d.tableIndex ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as Reservation };
}

export async function deleteReservation(id: string): Promise<ActionResponse> {
  const tenantId = await getTenantId();
  await requireEditor(tenantId);

  const { supabase } = await createTenantClient();
  const { error } = await supabase
    .from('reservation')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function getReservationsForDay(
  dayId: string
): Promise<ActionResponse<Reservation[]>> {
  const tenantId = await getTenantId();
  const role = await getUserRole(tenantId);
  if (!role) return { success: false, error: 'Not authorized.' };

  const { supabase } = await createTenantClient();
  const { data, error } = await supabase
    .from('reservation')
    .select('*, hotel_booking(*), program_item(*)')
    .eq('tenant_id', tenantId)
    .eq('day_id', dayId)
    .order('start_time', { nullsFirst: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as unknown as Reservation[] };
}
