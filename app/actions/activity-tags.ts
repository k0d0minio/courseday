'use server';

import { createTenantClient } from '@/lib/supabase-server';
import { getTenantId } from '@/lib/tenant';
import { getUserRole, requireEditor } from '@/lib/membership';
import { activityTagSchema } from '@/lib/activity-tag-schema';
import type { ActionResponse } from '@/types/actions';
import type { ActivityTag } from '@/types/index';

export async function getAllActivityTags(): Promise<ActionResponse<ActivityTag[]>> {
  const tenantId = await getTenantId();
  const role = await getUserRole(tenantId);
  if (!role) return { success: false, error: 'Not authorized.' };

  const { supabase } = await createTenantClient();
  const { data, error } = await supabase
    .from('activity_tag')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name');

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as ActivityTag[] };
}

export async function createActivityTag(
  name: string
): Promise<ActionResponse<ActivityTag>> {
  const parsed = activityTagSchema.safeParse({ name });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const tenantId = await getTenantId();
  await requireEditor(tenantId);

  const { supabase } = await createTenantClient();
  const { data, error } = await supabase
    .from('activity_tag')
    .insert({ tenant_id: tenantId, name: parsed.data.name.trim() })
    .select()
    .single();

  if (error) {
    const isDupe = error.code === '23505';
    return {
      success: false,
      error: isDupe ? 'A tag with that name already exists.' : error.message,
    };
  }

  return { success: true, data: data as ActivityTag };
}

export async function updateActivityTag(
  id: string,
  name: string
): Promise<ActionResponse<ActivityTag>> {
  const parsed = activityTagSchema.safeParse({ name });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const tenantId = await getTenantId();
  await requireEditor(tenantId);

  const { supabase } = await createTenantClient();
  const { data, error } = await supabase
    .from('activity_tag')
    .update({ name: parsed.data.name.trim() })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) {
    const isDupe = error.code === '23505';
    return {
      success: false,
      error: isDupe ? 'A tag with that name already exists.' : error.message,
    };
  }

  return { success: true, data: data as ActivityTag };
}

export async function deleteActivityTag(id: string): Promise<ActionResponse> {
  const tenantId = await getTenantId();
  await requireEditor(tenantId);

  const { supabase } = await createTenantClient();
  const { error } = await supabase
    .from('activity_tag')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}
