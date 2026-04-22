'use server';

import { createTenantClient } from '@/lib/supabase-server';
import { getTenantId } from '@/lib/tenant';
import { getUserRole, requireEditor } from '@/lib/membership';
import { checklistTemplateSchema } from '@/lib/checklist-schema';
import { snapshotTemplateIdsForActivity } from '@/lib/checklist-snapshot';
import type { ChecklistTemplateFormData } from '@/lib/checklist-schema';
import type { ActionResponse } from '@/types/actions';
import type {
  ActivityChecklistItem,
  ChecklistTemplate,
  ChecklistTemplateItem,
  ChecklistTemplateWithItems,
} from '@/types/index';

// ---------------------------------------------------------------------------
// Internal mapping
// ---------------------------------------------------------------------------

type RawTemplateRow = ChecklistTemplate & {
  checklist_template_item: ChecklistTemplateItem[] | null;
};

function mapTemplate(row: RawTemplateRow): ChecklistTemplateWithItems {
  const items = (row.checklist_template_item ?? [])
    .slice()
    .sort((a, b) => a.position - b.position);
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    name: row.name,
    venue_type_id: row.venue_type_id,
    activity_tag_id: row.activity_tag_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    items,
  };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function getAllChecklistTemplates(): Promise<
  ActionResponse<ChecklistTemplateWithItems[]>
> {
  const tenantId = await getTenantId();
  const role = await getUserRole(tenantId);
  if (!role) return { success: false, error: 'Not authorized.' };

  const { supabase } = await createTenantClient();
  const { data, error } = await supabase
    .from('checklist_template')
    .select('*, checklist_template_item(*)')
    .eq('tenant_id', tenantId)
    .order('name');

  if (error) return { success: false, error: error.message };

  return {
    success: true,
    data: (data as RawTemplateRow[]).map(mapTemplate),
  };
}

export async function getChecklistItemsForActivities(
  activityIds: string[]
): Promise<ActionResponse<ActivityChecklistItem[]>> {
  const tenantId = await getTenantId();
  const role = await getUserRole(tenantId);
  if (!role) return { success: false, error: 'Not authorized.' };
  if (activityIds.length === 0) return { success: true, data: [] };

  const { supabase } = await createTenantClient();
  const { data, error } = await supabase
    .from('activity_checklist_item')
    .select('*')
    .eq('tenant_id', tenantId)
    .in('activity_id', activityIds)
    .order('position');

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as ActivityChecklistItem[] };
}

// ---------------------------------------------------------------------------
// Template CRUD
// ---------------------------------------------------------------------------

export async function createChecklistTemplate(
  raw: ChecklistTemplateFormData
): Promise<ActionResponse<ChecklistTemplateWithItems>> {
  const parsed = checklistTemplateSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const tenantId = await getTenantId();
  await requireEditor(tenantId);

  const { supabase } = await createTenantClient();
  const { name, scope, scopeId, items } = parsed.data;

  const { data: tplRow, error: tplErr } = await supabase
    .from('checklist_template')
    .insert({
      tenant_id: tenantId,
      name: name.trim(),
      venue_type_id: scope === 'venue_type' ? scopeId : null,
      activity_tag_id: scope === 'activity_tag' ? scopeId : null,
    })
    .select()
    .single();

  if (tplErr) return { success: false, error: tplErr.message };

  const template = tplRow as ChecklistTemplate;

  if (items.length > 0) {
    const { error: itemsErr } = await supabase
      .from('checklist_template_item')
      .insert(
        items.map((it, idx) => ({
          template_id: template.id,
          label: it.label.trim(),
          position: idx,
        }))
      );
    if (itemsErr) return { success: false, error: itemsErr.message };
  }

  const { data: fullRow, error: fetchErr } = await supabase
    .from('checklist_template')
    .select('*, checklist_template_item(*)')
    .eq('id', template.id)
    .single();

  if (fetchErr) return { success: false, error: fetchErr.message };
  return { success: true, data: mapTemplate(fullRow as RawTemplateRow) };
}

export async function updateChecklistTemplate(
  id: string,
  raw: ChecklistTemplateFormData
): Promise<ActionResponse<ChecklistTemplateWithItems>> {
  const parsed = checklistTemplateSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const tenantId = await getTenantId();
  await requireEditor(tenantId);

  const { supabase } = await createTenantClient();
  const { name, scope, scopeId, items } = parsed.data;

  const { error: updErr } = await supabase
    .from('checklist_template')
    .update({
      name: name.trim(),
      venue_type_id: scope === 'venue_type' ? scopeId : null,
      activity_tag_id: scope === 'activity_tag' ? scopeId : null,
    })
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (updErr) return { success: false, error: updErr.message };

  // Replace items: delete existing, insert new in order.
  // Historical activities are unaffected because their items live on
  // activity_checklist_item.
  const { error: delErr } = await supabase
    .from('checklist_template_item')
    .delete()
    .eq('template_id', id);

  if (delErr) return { success: false, error: delErr.message };

  if (items.length > 0) {
    const { error: insErr } = await supabase
      .from('checklist_template_item')
      .insert(
        items.map((it, idx) => ({
          template_id: id,
          label: it.label.trim(),
          position: idx,
        }))
      );
    if (insErr) return { success: false, error: insErr.message };
  }

  const { data: fullRow, error: fetchErr } = await supabase
    .from('checklist_template')
    .select('*, checklist_template_item(*)')
    .eq('id', id)
    .single();

  if (fetchErr) return { success: false, error: fetchErr.message };
  return { success: true, data: mapTemplate(fullRow as RawTemplateRow) };
}

export async function deleteChecklistTemplate(
  id: string
): Promise<ActionResponse> {
  const tenantId = await getTenantId();
  await requireEditor(tenantId);

  const { supabase } = await createTenantClient();
  const { error } = await supabase
    .from('checklist_template')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

// ---------------------------------------------------------------------------
// Applying templates to an activity
// ---------------------------------------------------------------------------

/**
 * Manually attach one or more templates to an existing activity. Items are
 * snapshot-copied onto `activity_checklist_item`. Safe to call repeatedly —
 * callers should filter out templates whose items were already applied.
 */
export async function attachChecklistTemplatesToActivity(
  activityId: string,
  templateIds: string[]
): Promise<ActionResponse<ActivityChecklistItem[]>> {
  const tenantId = await getTenantId();
  await requireEditor(tenantId);
  if (templateIds.length === 0) return { success: true, data: [] };

  const { supabase } = await createTenantClient();

  const { data: activityRow, error: activityErr } = await supabase
    .from('activity')
    .select('id, day_id, tenant_id')
    .eq('id', activityId)
    .eq('tenant_id', tenantId)
    .single();

  if (activityErr || !activityRow) {
    return { success: false, error: 'Activity not found.' };
  }

  const { data: existing } = await supabase
    .from('activity_checklist_item')
    .select('position')
    .eq('activity_id', activityId);

  const startPos =
    ((existing ?? []) as { position: number }[]).reduce(
      (max, r) => Math.max(max, r.position),
      -1
    ) + 1;

  const inserted = await snapshotTemplateIdsForActivity(supabase, {
    tenantId,
    dayId: (activityRow as { day_id: string }).day_id,
    activityId,
    templateIds,
    startPosition: startPos,
  });

  if (!inserted.success) return inserted;
  return { success: true, data: inserted.data };
}

// ---------------------------------------------------------------------------
// Ticking items (editors only via RLS)
// ---------------------------------------------------------------------------

export async function setChecklistItemDone(
  itemId: string,
  done: boolean
): Promise<ActionResponse<ActivityChecklistItem>> {
  const tenantId = await getTenantId();
  const user = await requireEditor(tenantId);

  const { supabase } = await createTenantClient();
  const { data, error } = await supabase
    .from('activity_checklist_item')
    .update({
      is_done: done,
      done_by: done ? user.id : null,
      done_at: done ? new Date().toISOString() : null,
    })
    .eq('id', itemId)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as ActivityChecklistItem };
}
