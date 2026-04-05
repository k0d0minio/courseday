'use server';

import { randomUUID } from 'crypto';
import { createTenantClient, createSupabaseServiceClient } from '@/lib/supabase-server';
import { getTenantId } from '@/lib/tenant';
import { getUserRole, requireEditor } from '@/lib/membership';
import { generateRecurrenceDates } from '@/lib/day-utils';
import { activitySchema } from '@/lib/program-item-schema';
import { ensureDayExists } from '@/app/actions/days';
import { notifyTenantMembers, getDayDate } from '@/lib/notifications';
import { mutationRateLimit } from '@/lib/rate-limit';
import type { ActionResponse } from '@/types/actions';
import type { Activity, ActivityWithRelations } from '@/types/index';
import type { ActivityFormData } from '@/lib/program-item-schema';

const MAX_RECURRENCE_OCCURRENCES = 52;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function toRow(
  tenantId: string,
  data: ActivityFormData,
  overrides: Partial<{ day_id: string; recurrence_group_id: string; is_recurring: boolean }>
) {
  return {
    tenant_id: tenantId,
    day_id: overrides.day_id ?? data.dayId,
    title: data.title.trim(),
    description: data.description?.trim() || null,
    start_time: data.startTime || null,
    end_time: data.endTime || null,
    expected_covers: data.expectedCovers ?? null,
    venue_type_id: data.venueTypeId ?? null,
    poc_id: data.pocId ?? null,
    notes: data.notes?.trim() || null,
    is_recurring: overrides.is_recurring ?? data.isRecurring ?? false,
    recurrence_frequency: data.recurrenceFrequency ?? null,
    recurrence_group_id: overrides.recurrence_group_id ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assignTags(supabase: any, activityId: string, tagIds: string[]): Promise<string | null> {
  const { error: delErr } = await supabase
    .from('activity_tag_assignment')
    .delete()
    .eq('activity_id', activityId);
  if (delErr) return delErr.message;

  if (tagIds.length === 0) return null;

  const { error: insErr } = await supabase
    .from('activity_tag_assignment')
    .insert(tagIds.map((tagId) => ({ activity_id: activityId, tag_id: tagId })));
  if (insErr) return insErr.message;

  return null;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export async function createActivity(
  raw: ActivityFormData
): Promise<ActionResponse<Activity>> {
  const parsed = activitySchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const tenantId = await getTenantId();
  const user = await requireEditor(tenantId);

  const rl = await mutationRateLimit(user.id);
  if (!rl.success) return { success: false, error: 'Too many requests. Please slow down.' };

  const { supabase } = await createTenantClient();
  const data = parsed.data;
  const isRecurring = data.isRecurring && !!data.recurrenceFrequency;
  const tagIds = data.tagIds ?? [];

  if (!isRecurring) {
    const { data: row, error } = await supabase
      .from('activity')
      .insert(toRow(tenantId, data, {}))
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    if (tagIds.length > 0) {
      const tagErr = await assignTags(supabase, (row as Activity).id, tagIds);
      if (tagErr) return { success: false, error: tagErr };
    }

    Promise.allSettled([
      getDayDate(data.dayId).then((date) =>
        notifyTenantMembers(tenantId, user.id, `Activity added: ${data.title}`, undefined, date ? `/day/${date}` : undefined)
      ),
    ]);

    return { success: true, data: row as Activity };
  }

  // Recurring path
  const { data: dayRow, error: dayErr } = await supabase
    .from('day')
    .select('date_iso')
    .eq('id', data.dayId)
    .single();

  if (dayErr || !dayRow) {
    return { success: false, error: 'Could not find the day record.' };
  }

  const startDate = (dayRow as { date_iso: string }).date_iso;
  const futureDates = generateRecurrenceDates(startDate, data.recurrenceFrequency!).slice(0, MAX_RECURRENCE_OCCURRENCES - 1);
  const allDates = [startDate, ...futureDates];

  const recurrenceGroupId = randomUUID();

  await Promise.all(futureDates.map((d) => ensureDayExists(d)));

  const { data: dayRows, error: daysErr } = await supabase
    .from('day')
    .select('id, date_iso')
    .eq('tenant_id', tenantId)
    .in('date_iso', allDates);

  if (daysErr || !dayRows) {
    return { success: false, error: 'Could not resolve day records for recurrence.' };
  }

  const dateToId = new Map((dayRows as { id: string; date_iso: string }[]).map((d) => [d.date_iso, d.id]));
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
    .from('activity')
    .insert(rows)
    .select()
    .eq('day_id', data.dayId)
    .single();

  if (insertErr) return { success: false, error: insertErr.message };

  if (tagIds.length > 0) {
    const tagErr = await assignTags(supabase, (inserted as Activity).id, tagIds);
    if (tagErr) return { success: false, error: tagErr };
  }

  Promise.allSettled([
    getDayDate(data.dayId).then((date) =>
      notifyTenantMembers(tenantId, user.id, `Activity added: ${data.title}`, undefined, date ? `/day/${date}` : undefined)
    ),
  ]);

  return { success: true, data: inserted as Activity };
}

export async function updateActivity(
  id: string,
  raw: ActivityFormData
): Promise<ActionResponse<Activity>> {
  const parsed = activitySchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const tenantId = await getTenantId();
  const user = await requireEditor(tenantId);

  const { supabase } = await createTenantClient();
  const data = parsed.data;

  const { data: row, error } = await supabase
    .from('activity')
    .update({
      title: data.title.trim(),
      description: data.description?.trim() || null,
      start_time: data.startTime || null,
      end_time: data.endTime || null,
      expected_covers: data.expectedCovers ?? null,
      venue_type_id: data.venueTypeId ?? null,
      poc_id: data.pocId ?? null,
      notes: data.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  const tagErr = await assignTags(supabase, id, data.tagIds ?? []);
  if (tagErr) return { success: false, error: tagErr };

  Promise.allSettled([
    getDayDate(data.dayId).then((date) =>
      notifyTenantMembers(tenantId, user.id, `Activity updated: ${data.title}`, undefined, date ? `/day/${date}` : undefined)
    ),
  ]);

  return { success: true, data: row as Activity };
}

export async function deleteActivity(id: string): Promise<ActionResponse> {
  const tenantId = await getTenantId();
  const user = await requireEditor(tenantId);

  const { supabase } = await createTenantClient();

  const { data: existing } = await supabase
    .from('activity')
    .select('title, day_id')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  const { error } = await supabase
    .from('activity')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) return { success: false, error: error.message };

  if (existing) {
    const { title, day_id } = existing as { title: string; day_id: string };
    Promise.allSettled([
      getDayDate(day_id).then((date) =>
        notifyTenantMembers(tenantId, user.id, `Activity removed: ${title}`, undefined, date ? `/day/${date}` : undefined)
      ),
    ]);
  }

  return { success: true, data: undefined };
}

export async function deleteActivityRecurrenceGroup(groupId: string): Promise<ActionResponse> {
  const tenantId = await getTenantId();
  await requireEditor(tenantId);

  const { supabase } = await createTenantClient();
  const { error } = await supabase
    .from('activity')
    .delete()
    .eq('recurrence_group_id', groupId)
    .eq('tenant_id', tenantId);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function deleteActivityFromHere(
  id: string,
  groupId: string
): Promise<ActionResponse> {
  const tenantId = await getTenantId();
  const user = await requireEditor(tenantId);

  const { supabase } = await createTenantClient();
  const serviceClient = createSupabaseServiceClient();

  // Get the current activity's day_id and title
  const { data: curr } = await supabase
    .from('activity')
    .select('day_id, title')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (!curr) return { success: false, error: 'Activity not found.' };

  const { day_id, title } = curr as { day_id: string; title: string };

  // Resolve the date of this activity's day
  const { data: dayRow } = await serviceClient
    .from('day')
    .select('date_iso')
    .eq('id', day_id)
    .maybeSingle();

  if (!dayRow) return { success: false, error: 'Day not found.' };
  const currentDate = (dayRow as { date_iso: string }).date_iso;

  // Get all activities in the recurrence group
  const { data: groupActivities } = await supabase
    .from('activity')
    .select('id, day_id')
    .eq('recurrence_group_id', groupId)
    .eq('tenant_id', tenantId);

  if (!groupActivities?.length) return { success: true, data: undefined };

  // Resolve their day dates via service client
  const dayIds = [...new Set(groupActivities.map((a) => (a as { day_id: string }).day_id))];
  const { data: days } = await serviceClient
    .from('day')
    .select('id, date_iso')
    .in('id', dayIds);

  const futureDayIds = new Set(
    (days ?? [])
      .filter((d) => (d as { date_iso: string }).date_iso >= currentDate)
      .map((d) => (d as { id: string }).id)
  );

  const toDeleteIds = (groupActivities as { id: string; day_id: string }[])
    .filter((a) => futureDayIds.has(a.day_id))
    .map((a) => a.id);

  if (toDeleteIds.length === 0) return { success: true, data: undefined };

  const { error } = await supabase
    .from('activity')
    .delete()
    .in('id', toDeleteIds)
    .eq('tenant_id', tenantId);

  if (error) return { success: false, error: error.message };

  Promise.allSettled([
    notifyTenantMembers(
      tenantId,
      user.id,
      `Recurring activity removed from ${currentDate}: ${title}`,
      undefined,
      `/day/${currentDate}`
    ),
  ]);

  return { success: true, data: undefined };
}

export async function getActivitiesForDay(
  dayId: string
): Promise<ActionResponse<ActivityWithRelations[]>> {
  const tenantId = await getTenantId();
  const role = await getUserRole(tenantId);
  if (!role) return { success: false, error: 'Not authorized.' };

  const { supabase } = await createTenantClient();
  const { data, error } = await supabase
    .from('activity')
    .select('*, venue_type(*), point_of_contact(*), activity_tag_assignment(activity_tag(*))')
    .eq('tenant_id', tenantId)
    .eq('day_id', dayId)
    .order('start_time', { nullsFirst: true });

  if (error) return { success: false, error: error.message };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (data as any[]).map((row) => ({
    ...row,
    tags: (row.activity_tag_assignment ?? []).map((a: { activity_tag: unknown }) => a.activity_tag),
    activity_tag_assignment: undefined,
  }));

  return { success: true, data: items as ActivityWithRelations[] };
}
