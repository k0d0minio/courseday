'use server';

import { createTenantClient } from '@/lib/supabase-server';
import { getTenantId } from '@/lib/tenant';
import { requireEditor, getUserRole } from '@/lib/membership';
import { createBreakfastSchema, updateBreakfastSchema } from '@/lib/breakfast-schema';
import type { CreateBreakfastFormData, UpdateBreakfastFormData } from '@/lib/breakfast-schema';
import type { ActionResponse } from '@/types/actions';
import type { BreakfastConfiguration } from '@/types/index';

function totalGuests(tableBreakdown?: number[] | null, guestCount?: number): number {
  if (tableBreakdown && tableBreakdown.length > 0) {
    return tableBreakdown.reduce((s, n) => s + n, 0);
  }
  return guestCount ?? 0;
}

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

  // Resolve the day's date_iso (needed for the breakfast_date column)
  const { data: dayRow, error: dayErr } = await supabase
    .from('day')
    .select('date_iso')
    .eq('id', d.dayId)
    .eq('tenant_id', tenantId)
    .single();
  if (dayErr || !dayRow) return { success: false, error: 'Day not found.' };

  const { data, error } = await supabase
    .from('breakfast_configuration')
    .insert({
      tenant_id: tenantId,
      day_id: d.dayId,
      breakfast_date: (dayRow as { date_iso: string }).date_iso,
      group_name: d.groupName || null,
      table_breakdown: d.tableBreakdown ?? null,
      total_guests: totalGuests(d.tableBreakdown, d.guestCount),
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

  const { data, error } = await supabase
    .from('breakfast_configuration')
    .update({
      group_name: d.groupName || null,
      table_breakdown: d.tableBreakdown ?? null,
      total_guests: totalGuests(d.tableBreakdown, d.guestCount),
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

export async function getBreakfastConfigurationsForDay(
  dayId: string
): Promise<ActionResponse<BreakfastConfiguration[]>> {
  const tenantId = await getTenantId();
  const role = await getUserRole(tenantId);
  if (!role) return { success: false, error: 'Not authorized.' };

  const { supabase } = await createTenantClient();
  const { data, error } = await supabase
    .from('breakfast_configuration')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('day_id', dayId)
    .order('start_time', { nullsFirst: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as BreakfastConfiguration[] };
}
