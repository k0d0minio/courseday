'use server';

import { createTenantClient } from '@/lib/supabase-server';
import { getTenantId } from '@/lib/tenant';
import { requireEditor } from '@/lib/membership';
import { ensureDayExists } from '@/app/actions/days';
import type { ActionResponse } from '@/types/actions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TemplateItem = {
  title: string;
  start_time: string | null;
  end_time: string | null;
  expected_covers: number | null;
  venue_type_id: string | null;
  poc_id: string | null;
  notes: string | null;
};

export type ScheduleTemplate = {
  id: string;
  tenant_id: string;
  name: string;
  items: TemplateItem[];
  created_at: string;
  updated_at: string;
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export async function getTemplates(): Promise<ActionResponse<ScheduleTemplate[]>> {
  const tenantId = await getTenantId();
  const { supabase } = await createTenantClient();

  const { data, error } = await supabase
    .from('schedule_templates')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name');

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as ScheduleTemplate[] };
}

export async function saveTemplate(
  name: string,
  items: TemplateItem[]
): Promise<ActionResponse<ScheduleTemplate>> {
  const trimmed = name.trim();
  if (!trimmed) return { success: false, error: 'Template name is required.' };

  const tenantId = await getTenantId();
  await requireEditor(tenantId);

  const { supabase } = await createTenantClient();
  const { data, error } = await supabase
    .from('schedule_templates')
    .insert({ tenant_id: tenantId, name: trimmed, items })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as ScheduleTemplate };
}

export async function deleteTemplate(id: string): Promise<ActionResponse> {
  const tenantId = await getTenantId();
  await requireEditor(tenantId);

  const { supabase } = await createTenantClient();
  const { error } = await supabase
    .from('schedule_templates')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function applyTemplate(
  dayId: string,
  templateId: string,
  mode: 'replace' | 'merge'
): Promise<ActionResponse> {
  const tenantId = await getTenantId();
  await requireEditor(tenantId);

  const { supabase } = await createTenantClient();

  const { data: template, error: tErr } = await supabase
    .from('schedule_templates')
    .select('items')
    .eq('id', templateId)
    .eq('tenant_id', tenantId)
    .single();

  if (tErr || !template) return { success: false, error: 'Template not found.' };

  const items = (template as { items: TemplateItem[] }).items;
  if (!items.length) return { success: true, data: undefined };

  if (mode === 'replace') {
    const { error: delErr } = await supabase
      .from('activity')
      .delete()
      .eq('day_id', dayId)
      .eq('tenant_id', tenantId);
    if (delErr) return { success: false, error: delErr.message };
  }

  const rows = items.map((item) => ({
    tenant_id: tenantId,
    day_id: dayId,
    title: item.title,
    start_time: item.start_time,
    end_time: item.end_time,
    expected_covers: item.expected_covers,
    venue_type_id: item.venue_type_id,
    poc_id: item.poc_id,
    notes: item.notes,
    is_recurring: false,
  }));

  const { error: insErr } = await supabase.from('activity').insert(rows);
  if (insErr) return { success: false, error: insErr.message };

  return { success: true, data: undefined };
}

export async function copyDayActivities(
  sourceDayId: string,
  targetDate: string
): Promise<ActionResponse> {
  const tenantId = await getTenantId();
  await requireEditor(tenantId);

  const { supabase } = await createTenantClient();

  const { data: sourceActivities, error: fetchErr } = await supabase
    .from('activity')
    .select('title, start_time, end_time, expected_covers, venue_type_id, poc_id, notes')
    .eq('day_id', sourceDayId)
    .eq('tenant_id', tenantId);

  if (fetchErr) return { success: false, error: fetchErr.message };
  if (!sourceActivities?.length) return { success: true, data: undefined };

  const dayResult = await ensureDayExists(targetDate);
  if (!dayResult.success) return { success: false, error: 'Could not create target day.' };

  const targetDayId = dayResult.data.id;

  const rows = (sourceActivities as TemplateItem[]).map((a) => ({
    tenant_id: tenantId,
    day_id: targetDayId,
    title: a.title,
    start_time: a.start_time,
    end_time: a.end_time,
    expected_covers: a.expected_covers,
    venue_type_id: a.venue_type_id,
    poc_id: a.poc_id,
    notes: a.notes,
    is_recurring: false,
  }));

  const { error: insErr } = await supabase.from('activity').insert(rows);
  if (insErr) return { success: false, error: insErr.message };

  return { success: true, data: undefined };
}
