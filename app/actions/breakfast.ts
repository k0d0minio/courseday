'use server';

import { createTenantClient } from '@/lib/supabase-server';
import { getTenantId } from '@/lib/tenant';
import { requireEditor, getUserRole } from '@/lib/membership';
import { createBreakfastSchema, updateBreakfastSchema } from '@/lib/breakfast-schema';
import { notifyTenantMembers, getDayDate } from '@/lib/notifications';
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
  const user = await requireEditor(tenantId);

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
      allergens: d.allergens ?? [],
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  const label = d.groupName?.trim() || 'Unnamed group';
  Promise.allSettled([
    notifyTenantMembers(tenantId, user.id, `Breakfast added: ${label}`, undefined, `/day/${(dayRow as { date_iso: string }).date_iso}`),
  ]);

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
  const user = await requireEditor(tenantId);

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
      allergens: d.allergens ?? [],
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  const row = data as BreakfastConfiguration;
  const label = d.groupName?.trim() || 'Unnamed group';
  Promise.allSettled([
    getDayDate(row.day_id).then((date) =>
      notifyTenantMembers(tenantId, user.id, `Breakfast updated: ${label}`, undefined, date ? `/day/${date}` : undefined)
    ),
  ]);

  return { success: true, data: row };
}

export async function deleteBreakfastConfiguration(id: string): Promise<ActionResponse> {
  const tenantId = await getTenantId();
  const user = await requireEditor(tenantId);

  const { supabase } = await createTenantClient();

  const { data: existing } = await supabase
    .from('breakfast_configuration')
    .select('group_name, day_id')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  const { error } = await supabase
    .from('breakfast_configuration')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) return { success: false, error: error.message };

  if (existing) {
    const { group_name, day_id } = existing as { group_name: string | null; day_id: string };
    const label = group_name?.trim() || 'Unnamed group';
    Promise.allSettled([
      getDayDate(day_id).then((date) =>
        notifyTenantMembers(tenantId, user.id, `Breakfast removed: ${label}`, undefined, date ? `/day/${date}` : undefined)
      ),
    ]);
  }

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
