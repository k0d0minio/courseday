'use server';

import { createTenantClient } from '@/lib/supabase-server';
import { getTenantId } from '@/lib/tenant';
import { getUserRole, requireEditor } from '@/lib/membership';
import { staffRoleSchema } from '@/lib/staff-role-schema';
import type { StaffRoleFormData } from '@/lib/staff-role-schema';
import type { ActionResponse } from '@/types/actions';
import type { StaffRole } from '@/types/index';

export async function getAllStaffRoles(): Promise<ActionResponse<StaffRole[]>> {
  const tenantId = await getTenantId();
  const role = await getUserRole(tenantId);
  if (!role) return { success: false, error: 'Not authorized.' };

  const { supabase } = await createTenantClient();
  const { data, error } = await supabase
    .from('staff_role')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name');

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as StaffRole[] };
}

export async function createStaffRole(
  raw: StaffRoleFormData
): Promise<ActionResponse<StaffRole>> {
  const parsed = staffRoleSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const tenantId = await getTenantId();
  await requireEditor(tenantId);

  const { supabase } = await createTenantClient();
  const { data, error } = await supabase
    .from('staff_role')
    .insert({
      tenant_id: tenantId,
      name: parsed.data.name.trim(),
    })
    .select()
    .single();

  if (error) {
    const isDupe = error.code === '23505';
    return {
      success: false,
      error: isDupe ? 'A role with that name already exists.' : error.message,
    };
  }

  return { success: true, data: data as StaffRole };
}

export async function updateStaffRole(
  id: string,
  raw: StaffRoleFormData
): Promise<ActionResponse<StaffRole>> {
  const parsed = staffRoleSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const tenantId = await getTenantId();
  await requireEditor(tenantId);

  const { supabase } = await createTenantClient();
  const { data, error } = await supabase
    .from('staff_role')
    .update({ name: parsed.data.name.trim() })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) {
    const isDupe = error.code === '23505';
    return {
      success: false,
      error: isDupe ? 'A role with that name already exists.' : error.message,
    };
  }

  return { success: true, data: data as StaffRole };
}

export async function deleteStaffRole(id: string): Promise<ActionResponse> {
  const tenantId = await getTenantId();
  await requireEditor(tenantId);

  const { supabase } = await createTenantClient();
  const { error } = await supabase
    .from('staff_role')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}
