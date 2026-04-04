'use server';

import { createTenantClient } from '@/lib/supabase-server';
import { getTenantId } from '@/lib/tenant';
import { requireEditor, getUserRole } from '@/lib/membership';
import { createBreakfastSchema, updateBreakfastSchema } from '@/lib/breakfast-schema';
import type { CreateBreakfastFormData, UpdateBreakfastFormData } from '@/lib/breakfast-schema';
import { parseTableBreakdown } from '@/lib/day-utils';
import type { ActionResponse } from '@/types/actions';
import type { BreakfastConfiguration } from '@/types/index';

export async function createBreakfastConfiguration(
  raw: CreateBreakfastFormData
): Promise<ActionResponse<BreakfastConfiguration>> {
  const parsed = createBreakfastSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const tenantId = await getTenantId();
  await requireEditor(tenantId);

  const { supabase } = await createTenantClient();
  const d = parsed.data;

  // Validate breakfast_date falls within the booking window
  const { data: booking, error: bookingError } = await supabase
    .from('hotel_booking')
    .select('check_in, check_out')
    .eq('id', d.hotelBookingId)
    .eq('tenant_id', tenantId)
    .single();

  if (bookingError) return { success: false, error: bookingError.message };
  if (d.breakfastDate < booking.check_in || d.breakfastDate >= booking.check_out) {
    return { success: false, error: 'Breakfast date must fall within the booking window.' };
  }

  const tableBreakdown = parseTableBreakdown(d.tableBreakdown ?? null);

  const { data, error } = await supabase
    .from('breakfast_configuration')
    .insert({
      tenant_id: tenantId,
      hotel_booking_id: d.hotelBookingId,
      breakfast_date: d.breakfastDate,
      table_breakdown: tableBreakdown,
      start_time: d.startTime || null,
      notes: d.notes || null,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as BreakfastConfiguration };
}

export async function updateBreakfastConfiguration(
  id: string,
  raw: UpdateBreakfastFormData
): Promise<ActionResponse<BreakfastConfiguration>> {
  const parsed = updateBreakfastSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const tenantId = await getTenantId();
  await requireEditor(tenantId);

  const { supabase } = await createTenantClient();
  const d = parsed.data;

  const tableBreakdown = parseTableBreakdown(d.tableBreakdown ?? null);

  const { data, error } = await supabase
    .from('breakfast_configuration')
    .update({
      table_breakdown: tableBreakdown,
      start_time: d.startTime || null,
      notes: d.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as BreakfastConfiguration };
}

export async function deleteBreakfastConfiguration(id: string): Promise<ActionResponse> {
  const tenantId = await getTenantId();
  await requireEditor(tenantId);

  const { supabase } = await createTenantClient();
  const { error } = await supabase
    .from('breakfast_configuration')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function getBreakfastConfigurationsForBooking(
  bookingId: string
): Promise<ActionResponse<BreakfastConfiguration[]>> {
  const tenantId = await getTenantId();
  const role = await getUserRole(tenantId);
  if (!role) return { success: false, error: 'Not authorized.' };

  const { supabase } = await createTenantClient();
  const { data, error } = await supabase
    .from('breakfast_configuration')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('hotel_booking_id', bookingId)
    .order('breakfast_date');

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as BreakfastConfiguration[] };
}

export async function getBreakfastConfigurationsForDay(
  dateIso: string
): Promise<ActionResponse<BreakfastConfiguration[]>> {
  const tenantId = await getTenantId();
  const role = await getUserRole(tenantId);
  if (!role) return { success: false, error: 'Not authorized.' };

  const { supabase } = await createTenantClient();
  const { data, error } = await supabase
    .from('breakfast_configuration')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('breakfast_date', dateIso)
    .order('created_at');

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as BreakfastConfiguration[] };
}
