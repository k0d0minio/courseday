'use server'

import { createSupabaseServiceClient } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { getWeekdayName, datesInRange } from '@/lib/day-utils'
import type { ActionResponse } from '@/types/actions'
import type { Day } from '@/types/index'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildRow(tenantId: string, dateIso: string) {
  return {
    tenant_id: tenantId,
    date_iso: dateIso,
    weekday: getWeekdayName(dateIso),
  }
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Upserts a Day row for the current tenant + date.
 * Uses the service role client — day creation is a system operation.
 */
export async function ensureDayExists(dateIso: string): Promise<ActionResponse<Day>> {
  const tenantId = await getTenantId()
  const supabase = createSupabaseServiceClient()

  const { data, error } = await supabase
    .from('day')
    .upsert(buildRow(tenantId, dateIso), {
      onConflict: 'tenant_id,date_iso',
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as Day }
}

/**
 * Upserts Day rows for every date in [startDate, endDate] (inclusive).
 * Used by the month calendar view. Performs a single batch upsert.
 */
export async function ensureDaysRange(
  startDate: string,
  endDate: string
): Promise<ActionResponse<Day[]>> {
  const tenantId = await getTenantId()
  const supabase = createSupabaseServiceClient()

  const rows = datesInRange(startDate, endDate).map((d) => buildRow(tenantId, d))

  const { data, error } = await supabase
    .from('day')
    .upsert(rows, { onConflict: 'tenant_id,date_iso' })
    .select()

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as Day[] }
}
