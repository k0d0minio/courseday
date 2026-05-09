'use server'

import { cache } from 'react'
import { createTenantClient } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { getUserRole, requireEditor } from '@/lib/membership'
import { shiftTemplateSchema, type ShiftTemplateFormData } from '@/lib/shift-template-schema'
import type { ActionResponse } from '@/types/actions'
import type { ShiftTemplate } from '@/types/index'
import { isFeatureEnabled } from '@/app/actions/feature-flags'

function normaliseTime(s: string | undefined | null): string | null {
  const t = (s ?? '').trim()
  return t === '' ? null : t
}

function normaliseNotes(s: string | undefined | null): string | null {
  const t = (s ?? '').trim()
  return t === '' ? null : t
}

const fetchTemplates = cache(async (): Promise<ActionResponse<ShiftTemplate[]>> => {
  const tenantId = await getTenantId()
  const role = await getUserRole(tenantId)
  if (!role) return { success: false, error: 'Not authorized.' }

  const { supabase } = await createTenantClient()
  const { data, error } = await supabase
    .from('shift_template')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name')

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as ShiftTemplate[] }
})

export async function listShiftTemplates(): Promise<ActionResponse<ShiftTemplate[]>> {
  return fetchTemplates()
}

export async function createShiftTemplate(
  raw: ShiftTemplateFormData
): Promise<ActionResponse<ShiftTemplate>> {
  const parsed = shiftTemplateSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]!.message }

  const tenantId = await getTenantId()
  await requireEditor(tenantId)

  if (!(await isFeatureEnabled(tenantId, 'staff_schedule'))) {
    return { success: false, error: 'Staff schedule is disabled.' }
  }

  const { supabase } = await createTenantClient()
  const { data, error } = await supabase
    .from('shift_template')
    .insert({
      tenant_id: tenantId,
      name: parsed.data.name.trim(),
      role: (parsed.data.role ?? '').trim(),
      start_time: normaliseTime(parsed.data.start_time),
      end_time: normaliseTime(parsed.data.end_time),
      default_user_id: parsed.data.default_user_id || null,
      notes: normaliseNotes(parsed.data.notes),
    })
    .select()
    .single()

  if (error) {
    return {
      success: false,
      error: error.code === '23505' ? 'A template with that name already exists.' : error.message,
    }
  }
  return { success: true, data: data as ShiftTemplate }
}

export async function updateShiftTemplate(
  id: string,
  raw: ShiftTemplateFormData
): Promise<ActionResponse<ShiftTemplate>> {
  const parsed = shiftTemplateSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]!.message }

  const tenantId = await getTenantId()
  await requireEditor(tenantId)

  if (!(await isFeatureEnabled(tenantId, 'staff_schedule'))) {
    return { success: false, error: 'Staff schedule is disabled.' }
  }

  const { supabase } = await createTenantClient()
  const { data, error } = await supabase
    .from('shift_template')
    .update({
      name: parsed.data.name.trim(),
      role: (parsed.data.role ?? '').trim(),
      start_time: normaliseTime(parsed.data.start_time),
      end_time: normaliseTime(parsed.data.end_time),
      default_user_id: parsed.data.default_user_id || null,
      notes: normaliseNotes(parsed.data.notes),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) {
    return {
      success: false,
      error: error.code === '23505' ? 'A template with that name already exists.' : error.message,
    }
  }
  return { success: true, data: data as ShiftTemplate }
}

export async function deleteShiftTemplate(id: string): Promise<ActionResponse> {
  const tenantId = await getTenantId()
  await requireEditor(tenantId)

  if (!(await isFeatureEnabled(tenantId, 'staff_schedule'))) {
    return { success: false, error: 'Staff schedule is disabled.' }
  }

  const { supabase } = await createTenantClient()
  const { error } = await supabase
    .from('shift_template')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) return { success: false, error: error.message }
  return { success: true, data: undefined }
}
