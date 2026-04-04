'use server';

import { randomUUID } from 'crypto';
import { createTenantClient } from '@/lib/supabase-server';
import { getTenantId } from '@/lib/tenant';
import { getUserRole, requireEditor } from '@/lib/membership';
import { generateRecurrenceDates, parseTableBreakdown } from '@/lib/day-utils';
import { programItemSchema } from '@/lib/program-item-schema';
import { ensureDayExists } from '@/app/actions/days';
import type { ActionResponse } from '@/types/actions';
import type { ProgramItem } from '@/types/index';
import type { ProgramItemFormData } from '@/lib/program-item-schema';


// ---------------------------------------------------------------------------
// Internal row builder
// ---------------------------------------------------------------------------

function toRow(
  tenantId: string,
  data: ProgramItemFormData,
  overrides: Partial<{ day_id: string; recurrence_group_id: string; is_recurring: boolean }>
) {
  return {
    tenant_id: tenantId,
    day_id: overrides.day_id ?? data.dayId,
    type: data.type,
    title: data.title.trim(),
    description: data.description?.trim() || null,
    start_time: data.startTime || null,
    end_time: data.endTime || null,
    guest_count: data.guestCount ?? null,
    capacity: data.capacity ?? null,
    venue_type_id: data.venueTypeId ?? null,
    poc_id: data.pocId ?? null,
    table_breakdown: data.tableBreakdown ?? null,
    is_tour_operator: data.isTourOperator ?? false,
    notes: data.notes?.trim() || null,
    is_recurring: overrides.is_recurring ?? data.isRecurring ?? false,
    recurrence_frequency: data.recurrenceFrequency ?? null,
    recurrence_group_id: overrides.recurrence_group_id ?? null,
  };
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export async function createProgramItem(
  raw: ProgramItemFormData
): Promise<ActionResponse<ProgramItem>> {
  const parsed = programItemSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const tenantId = await getTenantId();
  await requireEditor(tenantId);

  const { supabase } = await createTenantClient();
  const data = parsed.data;
  const isRecurring = data.isRecurring && !!data.recurrenceFrequency;

  if (!isRecurring) {
    const { data: row, error } = await supabase
      .from('program_item')
      .insert(toRow(tenantId, data, {}))
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: row as ProgramItem };
  }

  // Recurring path: look up the start date, fan out to all occurrence dates
  const { data: dayRow, error: dayErr } = await supabase
    .from('day')
    .select('date_iso')
    .eq('id', data.dayId)
    .single();

  if (dayErr || !dayRow) {
    return { success: false, error: 'Could not find the day record.' };
  }

  const startDate = dayRow.date_iso;
  const futureDates = generateRecurrenceDates(startDate, data.recurrenceFrequency!);
  const allDates = [startDate, ...futureDates];

  const recurrenceGroupId = randomUUID();

  // Ensure Day rows exist for all future dates
  await Promise.all(futureDates.map((d) => ensureDayExists(d)));

  // Fetch day IDs for all dates
  const { data: dayRows, error: daysErr } = await supabase
    .from('day')
    .select('id, date_iso')
    .eq('tenant_id', tenantId)
    .in('date_iso', allDates);

  if (daysErr || !dayRows) {
    return { success: false, error: 'Could not resolve day records for recurrence.' };
  }

  const dateToId = new Map(dayRows.map((d) => [d.date_iso, d.id]));
  const rows = allDates
    .map((d) => dateToId.get(d))
    .filter((id): id is string => !!id)
    .map((dayId) =>
      toRow(tenantId, data, {
        day_id: dayId,
        recurrence_group_id: recurrenceGroupId,
        is_recurring: true,
      })
    );

  const { data: inserted, error: insertErr } = await supabase
    .from('program_item')
    .insert(rows)
    .select()
    .eq('day_id', data.dayId)
    .single();

  if (insertErr) return { success: false, error: insertErr.message };
  return { success: true, data: inserted as ProgramItem };
}

export async function updateProgramItem(
  id: string,
  raw: ProgramItemFormData
): Promise<ActionResponse<ProgramItem>> {
  const parsed = programItemSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const tenantId = await getTenantId();
  await requireEditor(tenantId);

  const { supabase } = await createTenantClient();
  const data = parsed.data;

  const { data: row, error } = await supabase
    .from('program_item')
    .update({
      type: data.type,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      start_time: data.startTime || null,
      end_time: data.endTime || null,
      guest_count: data.guestCount ?? null,
      capacity: data.capacity ?? null,
      venue_type_id: data.venueTypeId ?? null,
      poc_id: data.pocId ?? null,
      table_breakdown: data.tableBreakdown ?? null,
      is_tour_operator: data.isTourOperator ?? false,
      notes: data.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: row as ProgramItem };
}

export async function deleteProgramItem(id: string): Promise<ActionResponse> {
  const tenantId = await getTenantId();
  await requireEditor(tenantId);

  const { supabase } = await createTenantClient();
  const { error } = await supabase
    .from('program_item')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function deleteRecurrenceGroup(groupId: string): Promise<ActionResponse> {
  const tenantId = await getTenantId();
  await requireEditor(tenantId);

  const { supabase } = await createTenantClient();
  const { error } = await supabase
    .from('program_item')
    .delete()
    .eq('recurrence_group_id', groupId)
    .eq('tenant_id', tenantId);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function getProgramItemsForDay(
  dayId: string
): Promise<ActionResponse<ProgramItem[]>> {
  const tenantId = await getTenantId();
  const role = await getUserRole(tenantId);
  if (!role) return { success: false, error: 'Not authorized.' };

  const { supabase } = await createTenantClient();
  const { data, error } = await supabase
    .from('program_item')
    .select('*, venue_type(*), point_of_contact(*)')
    .eq('tenant_id', tenantId)
    .eq('day_id', dayId)
    .order('start_time', { nullsFirst: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as unknown as ProgramItem[] };
}
