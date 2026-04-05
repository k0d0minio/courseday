'use server';

import { createTenantClient } from '@/lib/supabase-server';
import { getTenantId } from '@/lib/tenant';
import { getUserRole, requireEditor } from '@/lib/membership';
import { reservationSchema } from '@/lib/reservation-schema';
import { notifyTenantMembers, getDayDate } from '@/lib/notifications';
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
  const user = await requireEditor(tenantId);

  const { supabase } = await createTenantClient();
  const d = parsed.data;

  const { data, error } = await supabase
    .from('reservation')
    .insert({
      tenant_id: tenantId,
      day_id: d.dayId,
      guest_name: d.guestName || null,
      guest_count: d.guestCount ?? null,
      start_time: d.startTime || null,
      end_time: d.endTime || null,
      notes: d.notes || null,
      table_breakdown: d.tableBreakdown ?? null,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  const name = d.guestName?.trim() || 'Guest';
  Promise.allSettled([
    getDayDate(d.dayId).then((date) =>
      notifyTenantMembers(tenantId, user.id, `Reservation added: ${name}`, undefined, date ? `/day/${date}` : undefined)
    ),
  ]);

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
  const user = await requireEditor(tenantId);

  const { supabase } = await createTenantClient();
  const d = parsed.data;

  const { data, error } = await supabase
    .from('reservation')
    .update({
      guest_name: d.guestName || null,
      guest_count: d.guestCount ?? null,
      start_time: d.startTime || null,
      end_time: d.endTime || null,
      notes: d.notes || null,
      table_breakdown: d.tableBreakdown ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  const name = d.guestName?.trim() || 'Guest';
  Promise.allSettled([
    getDayDate(d.dayId).then((date) =>
      notifyTenantMembers(tenantId, user.id, `Reservation updated: ${name}`, undefined, date ? `/day/${date}` : undefined)
    ),
  ]);

  return { success: true, data: data as Reservation };
}

export async function deleteReservation(id: string): Promise<ActionResponse> {
  const tenantId = await getTenantId();
  const user = await requireEditor(tenantId);

  const { supabase } = await createTenantClient();

  const { data: existing } = await supabase
    .from('reservation')
    .select('guest_name, day_id')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  const { error } = await supabase
    .from('reservation')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) return { success: false, error: error.message };

  if (existing) {
    const { guest_name, day_id } = existing as { guest_name: string | null; day_id: string };
    const name = guest_name?.trim() || 'Guest';
    Promise.allSettled([
      getDayDate(day_id).then((date) =>
        notifyTenantMembers(tenantId, user.id, `Reservation removed: ${name}`, undefined, date ? `/day/${date}` : undefined)
      ),
    ]);
  }

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
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('day_id', dayId)
    .order('start_time', { nullsFirst: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as Reservation[] };
}
