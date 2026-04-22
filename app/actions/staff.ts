'use server';

import { createTenantClient } from '@/lib/supabase-server';
import { getTenantId } from '@/lib/tenant';
import { getUserRole, requireEditor } from '@/lib/membership';
import { staffMemberSchema } from '@/lib/staff-schema';
import type { StaffMemberFormData } from '@/lib/staff-schema';
import type { ActionResponse } from '@/types/actions';
import type { StaffMember } from '@/types/index';

function normaliseRole(s: string | undefined | null): string {
  return (s ?? '').trim();
}

export async function getAllStaffMembers(): Promise<ActionResponse<StaffMember[]>> {
  const tenantId = await getTenantId();
  const role = await getUserRole(tenantId);
  if (!role) return { success: false, error: 'Not authorized.' };

  const { supabase } = await createTenantClient();
  const { data, error } = await supabase
    .from('staff_member')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('active', { ascending: false })
    .order('name');

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as StaffMember[] };
}

export async function createStaffMember(
  raw: StaffMemberFormData
): Promise<ActionResponse<StaffMember>> {
  const parsed = staffMemberSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const tenantId = await getTenantId();
  await requireEditor(tenantId);

  const { supabase } = await createTenantClient();
  const { data, error } = await supabase
    .from('staff_member')
    .insert({
      tenant_id: tenantId,
      name: parsed.data.name.trim(),
      role: normaliseRole(parsed.data.role),
      active: parsed.data.active ?? true,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as StaffMember };
}

export async function updateStaffMember(
  id: string,
  raw: StaffMemberFormData
): Promise<ActionResponse<StaffMember>> {
  const parsed = staffMemberSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const tenantId = await getTenantId();
  await requireEditor(tenantId);

  const { supabase } = await createTenantClient();
  const { data, error } = await supabase
    .from('staff_member')
    .update({
      name: parsed.data.name.trim(),
      role: normaliseRole(parsed.data.role),
      active: parsed.data.active ?? true,
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as StaffMember };
}

export async function deleteStaffMember(id: string): Promise<ActionResponse> {
  const tenantId = await getTenantId();
  await requireEditor(tenantId);

  const { supabase } = await createTenantClient();
  const { error } = await supabase
    .from('staff_member')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) {
    if (error.code === '23503') {
      return {
        success: false,
        error:
          'This person still has scheduled shifts. Remove or reassign those shifts first.',
      };
    }
    return { success: false, error: error.message };
  }
  return { success: true, data: undefined };
}
