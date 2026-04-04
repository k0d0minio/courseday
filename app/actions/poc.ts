'use server';

import { createTenantClient } from '@/lib/supabase-server';
import { getTenantId } from '@/lib/tenant';
import { getUserRole, requireEditor } from '@/lib/membership';
import { pocSchema } from '@/lib/poc-schema';
import type { PocFormData } from '@/lib/poc-schema';
import type { ActionResponse } from '@/types/actions';
import type { PointOfContact } from '@/types/index';

function normaliseEmpty(s: string | undefined | null): string | null {
  return s && s.trim() !== '' ? s.trim() : null;
}

export async function getAllPOCs(): Promise<ActionResponse<PointOfContact[]>> {
  const tenantId = await getTenantId();
  const role = await getUserRole(tenantId);
  if (!role) return { success: false, error: 'Not authorized.' };

  const { supabase } = await createTenantClient();
  const { data, error } = await supabase
    .from('point_of_contact')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name');

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as PointOfContact[] };
}

export async function createPOC(
  raw: PocFormData
): Promise<ActionResponse<PointOfContact>> {
  const parsed = pocSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const tenantId = await getTenantId();
  await requireEditor(tenantId);

  const { supabase } = await createTenantClient();
  const { data, error } = await supabase
    .from('point_of_contact')
    .insert({
      tenant_id: tenantId,
      name: parsed.data.name.trim(),
      email: normaliseEmpty(parsed.data.email),
      phone: normaliseEmpty(parsed.data.phone),
    })
    .select()
    .single();

  if (error) {
    const isDupe = error.code === '23505';
    return {
      success: false,
      error: isDupe
        ? 'A contact with that name, email, or phone already exists.'
        : error.message,
    };
  }

  return { success: true, data: data as PointOfContact };
}

export async function updatePOC(
  id: string,
  raw: PocFormData
): Promise<ActionResponse<PointOfContact>> {
  const parsed = pocSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const tenantId = await getTenantId();
  await requireEditor(tenantId);

  const { supabase } = await createTenantClient();
  const { data, error } = await supabase
    .from('point_of_contact')
    .update({
      name: parsed.data.name.trim(),
      email: normaliseEmpty(parsed.data.email),
      phone: normaliseEmpty(parsed.data.phone),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) {
    const isDupe = error.code === '23505';
    return {
      success: false,
      error: isDupe
        ? 'A contact with that name, email, or phone already exists.'
        : error.message,
    };
  }

  return { success: true, data: data as PointOfContact };
}

export async function deletePOC(id: string): Promise<ActionResponse> {
  const tenantId = await getTenantId();
  await requireEditor(tenantId);

  const { supabase } = await createTenantClient();

  const { error } = await supabase
    .from('point_of_contact')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}
