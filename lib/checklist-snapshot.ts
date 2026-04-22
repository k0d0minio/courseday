import type { ActionResponse } from '@/types/actions';
import type { ActivityChecklistItem } from '@/types/index';

// Keep this module free of the `'use server'` directive — it exports synchronous
// helpers shared by multiple server actions. The `supabase` client is whatever
// the caller has already created (tenant or service). All writes rely on the
// caller having verified editor permission.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

type SnapshotByIdsParams = {
  tenantId: string;
  dayId: string;
  activityId: string;
  templateIds: string[];
  startPosition?: number;
};

/**
 * Copies every item from the listed templates onto the given activity. Items
 * keep their order inside each template; templates are concatenated in the
 * order they are supplied.
 */
export async function snapshotTemplateIdsForActivity(
  supabase: SupabaseLike,
  { tenantId, dayId, activityId, templateIds, startPosition = 0 }: SnapshotByIdsParams
): Promise<ActionResponse<ActivityChecklistItem[]>> {
  if (templateIds.length === 0) return { success: true, data: [] };

  const { data: items, error } = await supabase
    .from('checklist_template_item')
    .select('label, position, template_id')
    .in('template_id', templateIds);

  if (error) return { success: false, error: error.message };

  const raw = (items ?? []) as {
    label: string;
    position: number;
    template_id: string;
  }[];

  // Preserve caller-supplied template order, then item position within each.
  const orderIndex = new Map(templateIds.map((id, i) => [id, i]));
  const sorted = raw.slice().sort((a, b) => {
    const oa = orderIndex.get(a.template_id) ?? 0;
    const ob = orderIndex.get(b.template_id) ?? 0;
    if (oa !== ob) return oa - ob;
    return a.position - b.position;
  });

  const rows = sorted.map((row, idx) => ({
    tenant_id: tenantId,
    day_id: dayId,
    activity_id: activityId,
    label: row.label,
    position: startPosition + idx,
  }));

  if (rows.length === 0) return { success: true, data: [] };

  const { data: inserted, error: insErr } = await supabase
    .from('activity_checklist_item')
    .insert(rows)
    .select();

  if (insErr) return { success: false, error: insErr.message };
  return { success: true, data: (inserted ?? []) as ActivityChecklistItem[] };
}

type MatchingParams = {
  tenantId: string;
  dayId: string;
  activityId: string;
  venueTypeId: string | null | undefined;
  tagIds: string[];
};

/**
 * Finds every template in the tenant that matches the given venue type or any
 * of the given activity tags, then snapshots their items onto the activity.
 * Called from `createActivity` (and each recurring occurrence) to auto-populate
 * checklists on creation.
 */
export async function snapshotMatchingTemplatesForActivity(
  supabase: SupabaseLike,
  { tenantId, dayId, activityId, venueTypeId, tagIds }: MatchingParams
): Promise<ActionResponse<ActivityChecklistItem[]>> {
  const filters: string[] = [];
  if (venueTypeId) filters.push(`venue_type_id.eq.${venueTypeId}`);
  if (tagIds.length > 0) {
    filters.push(`activity_tag_id.in.(${tagIds.join(',')})`);
  }

  if (filters.length === 0) return { success: true, data: [] };

  const { data: templates, error } = await supabase
    .from('checklist_template')
    .select('id, created_at')
    .eq('tenant_id', tenantId)
    .or(filters.join(','))
    .order('created_at', { ascending: true });

  if (error) return { success: false, error: error.message };

  const templateIds = ((templates ?? []) as { id: string }[]).map((t) => t.id);
  if (templateIds.length === 0) return { success: true, data: [] };

  return snapshotTemplateIdsForActivity(supabase, {
    tenantId,
    dayId,
    activityId,
    templateIds,
  });
}
