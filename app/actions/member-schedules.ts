'use server'

import { createTenantClient, createSupabaseServiceClient } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { getUserRole } from '@/lib/membership'
import { scheduleRowSchema } from '@/lib/membership-schema'
import type { ScheduleRow } from '@/lib/membership-schema'
import type { ActionResponse } from '@/types/actions'

export type { ScheduleRow }

export async function getMemberSchedule(
  membershipId: string
): Promise<ActionResponse<ScheduleRow[]>> {
  const tenantId = await getTenantId()
  const role = await getUserRole(tenantId)
  if (role !== 'editor') return { success: false, error: 'Not authorized.' }

  const { supabase } = await createTenantClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('member_schedule') as any)
    .select('day_of_week, start_time, end_time')
    .eq('membership_id', membershipId)
    .eq('tenant_id', tenantId)
    .order('day_of_week')
    .order('start_time')

  if (error) return { success: false, error: error.message }
  return {
    success: true,
    data: (data ?? []) as ScheduleRow[],
  }
}

export async function saveMemberSchedule(
  membershipId: string,
  rows: ScheduleRow[]
): Promise<ActionResponse> {
  const tenantId = await getTenantId()
  const role = await getUserRole(tenantId)
  if (role !== 'editor') return { success: false, error: 'Not authorized.' }

  for (const row of rows) {
    const parsed = scheduleRowSchema.safeParse(row)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid schedule row.' }
    }
  }

  const serviceClient = createSupabaseServiceClient()

  // Replace all rows for this membership atomically.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: deleteError } = await (serviceClient.from('member_schedule') as any)
    .delete()
    .eq('membership_id', membershipId)
    .eq('tenant_id', tenantId)

  if (deleteError) return { success: false, error: deleteError.message }

  if (rows.length === 0) return { success: true, data: undefined }

  const inserts = rows.map((r) => ({
    tenant_id: tenantId,
    membership_id: membershipId,
    day_of_week: r.day_of_week,
    start_time: r.start_time,
    end_time: r.end_time ?? null,
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insertError } = await (serviceClient.from('member_schedule') as any).insert(
    inserts
  )

  if (insertError) return { success: false, error: insertError.message }
  return { success: true, data: undefined }
}
