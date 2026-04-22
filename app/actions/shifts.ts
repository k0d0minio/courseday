'use server';

import { createTenantClient } from '@/lib/supabase-server';
import { getTenantId } from '@/lib/tenant';
import { requireEditor } from '@/lib/membership';
import { shiftSchema } from '@/lib/shift-schema';
import type { ShiftFormData } from '@/lib/shift-schema';
import type { ActionResponse } from '@/types/actions';
import type { Shift } from '@/types/index';

function normaliseTime(s: string | undefined | null): string | null {
  const t = (s ?? '').trim();
  return t === '' ? null : t;
}

function normaliseNotes(s: string | undefined | null): string | null {
  const t = (s ?? '').trim();
  return t === '' ? null : t;
}

async function assertDayAndStaffBelongToTenant(
  supabase: Awaited<ReturnType<typeof createTenantClient>>['supabase'],
  tenantId: string,
  dayId: string,
  staffMemberId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: dayRow, error: dayErr } = await supabase
    .from('day')
    .select('id')
    .eq('id', dayId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (dayErr) return { ok: false, error: dayErr.message };
  if (!dayRow) return { ok: false, error: 'Day not found.' };

  const { data: staffRow, error: staffErr } = await supabase
    .from('staff_member')
    .select('id')
    .eq('id', staffMemberId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (staffErr) return { ok: false, error: staffErr.message };
  if (!staffRow) return { ok: false, error: 'Staff member not found.' };

  return { ok: true };
}

export async function createShift(
  dayId: string,
  raw: ShiftFormData
): Promise<ActionResponse<Shift>> {
  const parsed = shiftSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const tenantId = await getTenantId();
  await requireEditor(tenantId);

  const { supabase } = await createTenantClient();
  const check = await assertDayAndStaffBelongToTenant(
    supabase,
    tenantId,
    dayId,
    parsed.data.staff_member_id
  );
  if (!check.ok) return { success: false, error: check.error };

  const { data, error } = await supabase
    .from('shift')
    .insert({
      tenant_id: tenantId,
      day_id: dayId,
      staff_member_id: parsed.data.staff_member_id,
      role: (parsed.data.role ?? '').trim(),
      start_time: normaliseTime(parsed.data.start_time),
      end_time: normaliseTime(parsed.data.end_time),
      notes: normaliseNotes(parsed.data.notes),
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as Shift };
}

export async function updateShift(
  id: string,
  dayId: string,
  raw: ShiftFormData
): Promise<ActionResponse<Shift>> {
  const parsed = shiftSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const tenantId = await getTenantId();
  await requireEditor(tenantId);

  const { supabase } = await createTenantClient();
  const check = await assertDayAndStaffBelongToTenant(
    supabase,
    tenantId,
    dayId,
    parsed.data.staff_member_id
  );
  if (!check.ok) return { success: false, error: check.error };

  const { data, error } = await supabase
    .from('shift')
    .update({
      staff_member_id: parsed.data.staff_member_id,
      role: (parsed.data.role ?? '').trim(),
      start_time: normaliseTime(parsed.data.start_time),
      end_time: normaliseTime(parsed.data.end_time),
      notes: normaliseNotes(parsed.data.notes),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('day_id', dayId)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as Shift };
}

export async function deleteShift(id: string, dayId: string): Promise<ActionResponse> {
  const tenantId = await getTenantId();
  await requireEditor(tenantId);

  const { supabase } = await createTenantClient();
  const { error } = await supabase
    .from('shift')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('day_id', dayId);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}
