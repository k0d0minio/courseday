'use server'

import { createTenantClient, createSupabaseServerClient } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { requireEditor } from '@/lib/membership'
import { getUser } from '@/app/actions/auth'
import { shiftSchema } from '@/lib/shift-schema'
import type { ShiftFormData } from '@/lib/shift-schema'
import type { ActionResponse } from '@/types/actions'
import type { Shift, ShiftWithAssignee } from '@/types/index'
import { getTenantAssignees } from '@/app/[tenant]/day/[date]/queries'
import { isFeatureEnabled } from '@/app/actions/feature-flags'
import { addDays, format, parseISO } from 'date-fns'
import { awaitNotifications } from '@/lib/notifications'
import {
  notifyShiftAssigned,
  notifyShiftUpdatedSameUser,
  notifyShiftReassigned,
  notifyShiftCancelled,
} from '@/lib/shift-notifications'

export type MyShiftWithDate = ShiftWithAssignee & { date_iso: string }

function normaliseTime(s: string | undefined | null): string | null {
  const t = (s ?? '').trim()
  return t === '' ? null : t
}

function normaliseNotes(s: string | undefined | null): string | null {
  const t = (s ?? '').trim()
  return t === '' ? null : t
}

async function assertDayAndMemberBelongToTenant(
  supabase: Awaited<ReturnType<typeof createTenantClient>>['supabase'],
  tenantId: string,
  dayId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: dayRow, error: dayErr } = await supabase
    .from('day')
    .select('id')
    .eq('id', dayId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (dayErr) return { ok: false, error: dayErr.message }
  if (!dayRow) return { ok: false, error: 'Day not found.' }

  const { data: memberRow, error: memberErr } = await supabase
    .from('memberships')
    .select('id')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (memberErr) return { ok: false, error: memberErr.message }
  if (!memberRow) return { ok: false, error: 'Team member not found.' }

  return { ok: true }
}

export async function createShift(
  dayId: string,
  raw: ShiftFormData
): Promise<ActionResponse<Shift>> {
  const parsed = shiftSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]!.message }
  }

  const tenantId = await getTenantId()
  await requireEditor(tenantId)

  const { supabase } = await createTenantClient()
  const check = await assertDayAndMemberBelongToTenant(
    supabase,
    tenantId,
    dayId,
    parsed.data.user_id
  )
  if (!check.ok) return { success: false, error: check.error }

  const { data, error } = await supabase
    .from('shift')
    .insert({
      tenant_id: tenantId,
      day_id: dayId,
      user_id: parsed.data.user_id,
      role: (parsed.data.role ?? '').trim(),
      start_time: normaliseTime(parsed.data.start_time),
      end_time: normaliseTime(parsed.data.end_time),
      notes: normaliseNotes(parsed.data.notes),
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  if (await isFeatureEnabled(tenantId, 'staff_schedule')) {
    const actor = await getUser()
    const actorId = actor?.id ?? ''
    await awaitNotifications(
      [
        notifyShiftAssigned({
          tenantId,
          actorId,
          assigneeId: parsed.data.user_id,
          dayId,
          startTime: normaliseTime(parsed.data.start_time),
          endTime: normaliseTime(parsed.data.end_time),
        }),
      ],
      'shift:create'
    )
  }

  return { success: true, data: data as Shift }
}

export async function updateShift(
  id: string,
  dayId: string,
  raw: ShiftFormData
): Promise<ActionResponse<Shift>> {
  const parsed = shiftSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]!.message }
  }

  const tenantId = await getTenantId()
  await requireEditor(tenantId)

  const { supabase } = await createTenantClient()
  const check = await assertDayAndMemberBelongToTenant(
    supabase,
    tenantId,
    dayId,
    parsed.data.user_id
  )
  if (!check.ok) return { success: false, error: check.error }

  const { data: oldShift } = await supabase
    .from('shift')
    .select('user_id')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  const oldUserId: string | null = (oldShift as { user_id: string } | null)?.user_id ?? null

  const { data, error } = await supabase
    .from('shift')
    .update({
      user_id: parsed.data.user_id,
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
    .single()

  if (error) return { success: false, error: error.message }

  if (await isFeatureEnabled(tenantId, 'staff_schedule')) {
    const actor = await getUser()
    const actorId = actor?.id ?? ''
    const newUserId = parsed.data.user_id
    const notifTasks: Promise<void>[] = []

    if (oldUserId && oldUserId !== newUserId) {
      notifTasks.push(
        notifyShiftReassigned({
          tenantId,
          actorId,
          newAssigneeId: newUserId,
          oldAssigneeId: oldUserId,
          dayId,
          startTime: normaliseTime(parsed.data.start_time),
          endTime: normaliseTime(parsed.data.end_time),
        })
      )
    } else {
      notifTasks.push(
        notifyShiftUpdatedSameUser({
          tenantId,
          actorId,
          assigneeId: newUserId,
          dayId,
          startTime: normaliseTime(parsed.data.start_time),
          endTime: normaliseTime(parsed.data.end_time),
        })
      )
    }

    await awaitNotifications(notifTasks, 'shift:update')
  }

  return { success: true, data: data as Shift }
}

export async function deleteShift(id: string, dayId: string): Promise<ActionResponse> {
  const tenantId = await getTenantId()
  await requireEditor(tenantId)

  const { supabase } = await createTenantClient()

  const { data: existing } = await supabase
    .from('shift')
    .select('user_id')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  const assigneeId: string | null = (existing as { user_id: string } | null)?.user_id ?? null

  const { error } = await supabase
    .from('shift')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('day_id', dayId)

  if (error) return { success: false, error: error.message }

  if (assigneeId && (await isFeatureEnabled(tenantId, 'staff_schedule'))) {
    const actor = await getUser()
    const actorId = actor?.id ?? ''
    await awaitNotifications(
      [notifyShiftCancelled({ tenantId, actorId, assigneeId, dayId })],
      'shift:cancel'
    )
  }

  return { success: true, data: undefined }
}

export async function getMyShifts({
  from,
  to,
}: {
  from: string
  to: string
}): Promise<MyShiftWithDate[]> {
  const tenantId = await getTenantId()
  const user = await getUser()
  if (!user) return []

  const supabase = await createSupabaseServerClient()

  const { data: days } = await supabase
    .from('day')
    .select('id, date_iso')
    .eq('tenant_id', tenantId)
    .gte('date_iso', from)
    .lte('date_iso', to)

  const dayRows = days ?? []
  if (dayRows.length === 0) return []

  const dayMap = new Map<string, string>(dayRows.map((d) => [d.id, d.date_iso as string]))
  const dayIds = dayRows.map((d) => d.id)

  const { data } = await supabase
    .from('shift')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .in('day_id', dayIds)
    .order('start_time', { nullsFirst: true })

  const rows = (data ?? []) as unknown as Array<Omit<ShiftWithAssignee, 'assignee'>>
  if (rows.length === 0) return []

  const assignees = await getTenantAssignees(tenantId)
  return rows.map((s) => ({
    ...s,
    date_iso: dayMap.get(s.day_id) ?? '',
    assignee: assignees.get(s.user_id) ?? {
      user_id: s.user_id,
      email: '',
      display_name: '—',
    },
  }))
}

export async function clockInShift(shiftId: string): Promise<ActionResponse<Shift>> {
  const tenantId = await getTenantId()
  await requireEditor(tenantId)
  if (!(await isFeatureEnabled(tenantId, 'staff_schedule'))) {
    return { success: false, error: 'Staff schedule feature is disabled.' }
  }

  const { supabase } = await createTenantClient()

  const { data: existing, error: fetchErr } = await supabase
    .from('shift')
    .select('actual_start')
    .eq('id', shiftId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (fetchErr) return { success: false, error: fetchErr.message }
  if (!existing) return { success: false, error: 'Shift not found.' }
  if (existing.actual_start) return { success: false, error: 'Already clocked in.' }

  const { data, error } = await supabase
    .from('shift')
    .update({ actual_start: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', shiftId)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as Shift }
}

export async function clockOutShift(shiftId: string): Promise<ActionResponse<Shift>> {
  const tenantId = await getTenantId()
  await requireEditor(tenantId)
  if (!(await isFeatureEnabled(tenantId, 'staff_schedule'))) {
    return { success: false, error: 'Staff schedule feature is disabled.' }
  }

  const { supabase } = await createTenantClient()

  const { data: existing, error: fetchErr } = await supabase
    .from('shift')
    .select('actual_start, actual_end')
    .eq('id', shiftId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (fetchErr) return { success: false, error: fetchErr.message }
  if (!existing) return { success: false, error: 'Shift not found.' }
  if (!existing.actual_start) return { success: false, error: 'Not clocked in yet.' }

  const { data, error } = await supabase
    .from('shift')
    .update({ actual_end: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', shiftId)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as Shift }
}

export async function setShiftActuals(
  shiftId: string,
  actuals: { actual_start: string | null; actual_end: string | null }
): Promise<ActionResponse<Shift>> {
  const tenantId = await getTenantId()
  await requireEditor(tenantId)
  if (!(await isFeatureEnabled(tenantId, 'staff_schedule'))) {
    return { success: false, error: 'Staff schedule feature is disabled.' }
  }

  if (actuals.actual_start && actuals.actual_end) {
    if (new Date(actuals.actual_end) < new Date(actuals.actual_start)) {
      return { success: false, error: 'End time must be after start time.' }
    }
  }

  const { supabase } = await createTenantClient()
  const { data, error } = await supabase
    .from('shift')
    .update({
      actual_start: actuals.actual_start || null,
      actual_end: actuals.actual_end || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', shiftId)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as Shift }
}

export async function getWeekShifts(weekStart: string): Promise<ShiftWithAssignee[]> {
  const tenantId = await getTenantId()
  const weekEnd = format(addDays(parseISO(weekStart), 6), 'yyyy-MM-dd')

  const supabase = await createSupabaseServerClient()

  const { data: days } = await supabase
    .from('day')
    .select('id')
    .eq('tenant_id', tenantId)
    .gte('date_iso', weekStart)
    .lte('date_iso', weekEnd)

  const dayIds = (days ?? []).map((d) => d.id)
  if (dayIds.length === 0) return []

  const { data } = await supabase
    .from('shift')
    .select('*')
    .eq('tenant_id', tenantId)
    .in('day_id', dayIds)
    .order('start_time', { nullsFirst: true })

  const rows = (data ?? []) as unknown as Array<Omit<ShiftWithAssignee, 'assignee'>>
  if (rows.length === 0) return []

  const assignees = await getTenantAssignees(tenantId)
  return rows.map((s) => ({
    ...s,
    assignee: assignees.get(s.user_id) ?? {
      user_id: s.user_id,
      email: '',
      display_name: '—',
    },
  }))
}
