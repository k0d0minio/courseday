'use server';

import { createTenantClient } from '@/lib/supabase-server';
import { getTenantId } from '@/lib/tenant';
import { getUserRole, requireEditor } from '@/lib/membership';
import type { ActionResponse } from '@/types/actions';

const MAX_LEN = 2000;

export interface DayNote {
  id: string;
  tenant_id: string;
  day_id: string;
  user_id: string;
  author_name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export async function getDayNotes(dayId: string): Promise<ActionResponse<DayNote[]>> {
  const tenantId = await getTenantId();
  const role = await getUserRole(tenantId);
  if (!role) return { success: false, error: 'Not authorized.' };

  const { supabase } = await createTenantClient();
  const { data, error } = await supabase
    .from('day_notes')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('day_id', dayId)
    .order('created_at', { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as DayNote[] };
}

export async function createDayNote(
  dayId: string,
  content: string
): Promise<ActionResponse<DayNote>> {
  const trimmed = content.trim();
  if (!trimmed || trimmed.length > MAX_LEN) {
    return { success: false, error: `Note must be 1–${MAX_LEN} characters.` };
  }

  const tenantId = await getTenantId();
  const user = await requireEditor(tenantId);
  const authorName = user.email ?? user.id;

  const { supabase } = await createTenantClient();
  const { data, error } = await supabase
    .from('day_notes')
    .insert({
      tenant_id: tenantId,
      day_id: dayId,
      user_id: user.id,
      author_name: authorName,
      content: trimmed,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as DayNote };
}

export async function updateDayNote(
  id: string,
  content: string
): Promise<ActionResponse<DayNote>> {
  const trimmed = content.trim();
  if (!trimmed || trimmed.length > MAX_LEN) {
    return { success: false, error: `Note must be 1–${MAX_LEN} characters.` };
  }

  const tenantId = await getTenantId();
  const user = await requireEditor(tenantId);

  const { supabase } = await createTenantClient();
  const { data, error } = await supabase
    .from('day_notes')
    .update({ content: trimmed, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as DayNote };
}

export async function deleteDayNote(id: string): Promise<ActionResponse> {
  const tenantId = await getTenantId();
  const user = await requireEditor(tenantId);

  const { supabase } = await createTenantClient();
  const { error } = await supabase
    .from('day_notes')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}
