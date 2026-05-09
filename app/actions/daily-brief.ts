'use server'

/**
 * Prompt contract (prompt_version v1) — data sent to the LLM
 *
 * Included:
 * - Date, weather summary (no geo beyond what weather implies).
 * - Activity titles, times, expected_covers, allergens, truncated notes/description.
 * - Reservation guest_count, times, allergens, truncated notes (guest_name excluded).
 * - Breakfast group_name, total_guests, times, allergens, truncated notes.
 * - Day note text only (author omitted); may still hold PII if editors typed names.
 *
 * Excluded:
 * - Reservation guest_name, table_breakdown (may identify guests).
 * - Staff/shifts (names).
 * - Raw POC / internal IDs.
 *
 * Instruct model: do not invent counts; do not repeat personal names from notes;
 * refer to reservations as "a party of N" when relevant.
 */

import { createTenantClient } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { getUserRole, requireEditor } from '@/lib/membership'
import { isFeatureEnabled } from '@/app/actions/feature-flags'
import { dailyBriefRateLimit } from '@/lib/rate-limit'
import { ensureDayExists } from '@/app/actions/days'
import {
  getProgramItemsForDay,
  getReservationsForDay,
  getBreakfastConfigsForDay,
  getDayNotesForDay,
  getDailyBriefForDayWithClient,
} from '@/app/[tenant]/day/[date]/queries'
import { getWeatherForDay } from '@/app/actions/weather'
import {
  dailyBriefContentSchema,
  generateAndPersistDailyBrief,
  dayHasPlannedContent,
} from '@/lib/daily-brief-generate'
import { redis } from '@/lib/redis'
import type { ActionResponse } from '@/types/actions'
import type { DailyBriefRecord } from '@/types/daily-brief'
import type { Activity, Reservation, BreakfastConfiguration } from '@/types/index'
import type { DayNote } from '@/app/actions/day-notes'
import type { WeatherData } from '@/app/actions/weather'

export type { DailyBriefContent, DailyBriefRecord } from '@/types/daily-brief'

export type EnsureDailyBriefResult =
  | { status: 'empty' }
  | { status: 'ok'; brief: DailyBriefRecord; stale: boolean }
  | { status: 'pending' }
  | { status: 'error'; error: string }

function computeIsStale(
  brief: DailyBriefRecord,
  activities: Activity[],
  reservations: Reservation[],
  breakfasts: BreakfastConfiguration[],
  dayNotes: DayNote[]
): boolean {
  const briefTime = new Date(brief.generated_at).getTime()
  const timestamps = [
    ...activities.map((a) => a.updated_at),
    ...reservations.map((r) => r.updated_at),
    ...breakfasts.map((b) => b.updated_at),
    ...dayNotes.map((n) => n.updated_at),
  ]
  if (timestamps.length === 0) return false
  const maxUpdated = Math.max(...timestamps.map((t) => new Date(t).getTime()))
  return maxUpdated > briefTime
}

/**
 * Auto-generate a daily brief on day-view load.
 * - Any tenant member may trigger this (not editor-only).
 * - Does NOT count against the manual regenerate rate limit.
 * - If day has no planned content, returns { status: 'empty' } — no LLM call, no DB write.
 * - If brief already exists, returns it immediately (idempotent).
 * - If no brief exists, generates one using a Redis lock to prevent duplicate LLM calls.
 */
export async function ensureDailyBrief(args: {
  tenantId: string
  dayId: string
  dateIso: string
  activities: Activity[]
  reservations: Reservation[]
  breakfasts: BreakfastConfiguration[]
  dayNotes: DayNote[]
  weather: WeatherData | null
}): Promise<EnsureDailyBriefResult> {
  const { tenantId, dayId, dateIso, activities, reservations, breakfasts, dayNotes, weather } = args

  if (!(await isFeatureEnabled(tenantId, 'daily_brief'))) return { status: 'empty' }

  if (!dayHasPlannedContent(activities, reservations, breakfasts)) return { status: 'empty' }

  const { supabase } = await createTenantClient()

  const existing = await getDailyBriefForDayWithClient(supabase, tenantId, dayId)
  if (existing) {
    return {
      status: 'ok',
      brief: existing,
      stale: computeIsStale(existing, activities, reservations, breakfasts, dayNotes),
    }
  }

  const lockKey = `daily-brief:lock:${tenantId}:${dayId}`
  let acquired: string | null = null
  try {
    acquired = await redis.set(lockKey, '1', 'EX', 30, 'NX')
  } catch {
    // Redis unavailable — proceed without lock (fail-open)
    acquired = 'OK'
  }

  if (!acquired) {
    // Another process is generating — wait briefly then read
    await new Promise((r) => setTimeout(r, 800))
    const retry = await getDailyBriefForDayWithClient(supabase, tenantId, dayId)
    if (retry) {
      return {
        status: 'ok',
        brief: retry,
        stale: computeIsStale(retry, activities, reservations, breakfasts, dayNotes),
      }
    }
    return { status: 'pending' }
  }

  try {
    const { data: tenantRow } = await supabase
      .from('tenants')
      .select('language')
      .eq('id', tenantId)
      .single()

    const result = await generateAndPersistDailyBrief(supabase, {
      tenantId,
      dayId,
      dateIso,
      generatedBy: null,
      activities,
      reservations,
      breakfasts,
      dayNotes,
      weather,
      language: tenantRow?.language ?? 'en',
    })
    if (!result.success) return { status: 'error', error: result.error }
    return { status: 'ok', brief: result.data, stale: false }
  } finally {
    try {
      await redis.del(lockKey)
    } catch {
      // best-effort cleanup
    }
  }
}

export async function getDailyBrief(
  dayId: string
): Promise<ActionResponse<DailyBriefRecord | null>> {
  const tenantId = await getTenantId()
  const role = await getUserRole(tenantId)
  if (!role) return { success: false, error: 'Not authorized.' }

  const { supabase } = await createTenantClient()
  const { data, error } = await supabase
    .from('daily_brief')
    .select('id, content, generated_at, model, prompt_version')
    .eq('tenant_id', tenantId)
    .eq('day_id', dayId)
    .maybeSingle()

  if (error) return { success: false, error: error.message }
  if (!data) return { success: true, data: null }

  const parsed = dailyBriefContentSchema.safeParse(data.content)
  if (!parsed.success) return { success: true, data: null }

  return {
    success: true,
    data: {
      id: data.id,
      content: parsed.data,
      generated_at: data.generated_at,
      model: data.model,
      prompt_version: data.prompt_version,
    },
  }
}

export async function generateDailyBrief(
  dateIso: string
): Promise<ActionResponse<DailyBriefRecord>> {
  const tenantId = await getTenantId()
  if (!(await isFeatureEnabled(tenantId, 'daily_brief'))) {
    return { success: false, error: 'Daily brief is disabled for this venue.' }
  }
  const user = await requireEditor(tenantId)

  if (!process.env.AI_GATEWAY_API_KEY) {
    return {
      success: false,
      error: 'AI brief is not configured (missing AI_GATEWAY_API_KEY).',
    }
  }

  const rl = await dailyBriefRateLimit(tenantId, dateIso)
  if (!rl.success) {
    return {
      success: false,
      error: 'Daily brief limit reached for this date. Try again tomorrow.',
    }
  }

  const dayResult = await ensureDayExists(dateIso)
  if (!dayResult.success) return { success: false, error: dayResult.error }
  const dayId = dayResult.data.id

  const [activities, reservations, breakfasts, dayNotes, weather] = await Promise.all([
    getProgramItemsForDay(tenantId, dayId),
    getReservationsForDay(tenantId, dayId),
    getBreakfastConfigsForDay(tenantId, dayId),
    getDayNotesForDay(tenantId, dayId),
    getWeatherForDay(dateIso),
  ])

  const { supabase } = await createTenantClient()

  const { data: tenantRow } = await supabase
    .from('tenants')
    .select('language')
    .eq('id', tenantId)
    .single()

  return generateAndPersistDailyBrief(supabase, {
    tenantId,
    dayId,
    dateIso,
    generatedBy: user.id,
    activities,
    reservations,
    breakfasts,
    dayNotes,
    weather,
    language: tenantRow?.language ?? 'en',
  })
}
