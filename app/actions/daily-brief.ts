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
 * - Staff shifts: first name + role + start/end times (when staff_schedule flag is on).
 *
 * Excluded:
 * - Reservation guest_name, table_breakdown (may identify guests).
 * - Raw POC / internal IDs.
 *
 * Instruct model: do not invent counts; do not repeat personal names from notes;
 * refer to reservations as "a party of N" when relevant.
 */

import { createTenantClient } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { getUserRole, requireEditor } from '@/lib/membership'
import { isFeatureEnabled } from '@/app/actions/feature-flags'
import { dailyBriefRateLimit, dailyBriefSectionRateLimit } from '@/lib/rate-limit'
import { ensureDayExists } from '@/app/actions/days'
import {
  getProgramItemsForDay,
  getReservationsForDay,
  getBreakfastConfigsForDay,
  getDayNotesForDay,
  getDailyBriefForDayWithClient,
  getShiftsForDay,
} from '@/app/[tenant]/day/[date]/queries'
import { getWeatherForDay } from '@/app/actions/weather'
import {
  dailyBriefContentSchema,
  generateAndPersistDailyBrief,
  generateBriefSection,
  mergeBriefSection,
  dayHasPlannedContent,
  buildCovers,
  buildAllergenRollup,
  llmPayload,
} from '@/lib/daily-brief-generate'
import { redis } from '@/lib/redis'
import type { ActionResponse } from '@/types/actions'
import {
  REGENERATABLE_SECTIONS,
  type DailyBriefRecord,
  type RegenerableSection,
} from '@/types/daily-brief'
import type { Activity, Reservation, BreakfastConfiguration } from '@/types/index'
import type { DayNote } from '@/app/actions/day-notes'
import type { WeatherData } from '@/app/actions/weather'
import type { StaffShiftContext } from '@/lib/daily-brief-generate'

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
  language?: string
  activities: Activity[]
  reservations: Reservation[]
  breakfasts: BreakfastConfiguration[]
  dayNotes: DayNote[]
  weather: WeatherData | null
  staffShifts?: StaffShiftContext[] | undefined
}): Promise<EnsureDailyBriefResult> {
  const {
    tenantId,
    dayId,
    dateIso,
    language,
    activities,
    reservations,
    breakfasts,
    dayNotes,
    weather,
    staffShifts,
  } = args

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
    const result = await generateAndPersistDailyBrief(supabase, {
      tenantId,
      dayId,
      dateIso,
      generatedBy: null,
      language: language ?? 'en',
      activities,
      reservations,
      breakfasts,
      dayNotes,
      weather,
      staffShifts,
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

  const staffScheduleOn = await isFeatureEnabled(tenantId, 'staff_schedule')

  const dayResult = await ensureDayExists(dateIso)
  if (!dayResult.success) return { success: false, error: dayResult.error }
  const dayId = dayResult.data.id

  const { supabase } = await createTenantClient()

  const [activities, reservations, breakfasts, dayNotes, weather, rawShifts, tenantRow] =
    await Promise.all([
      getProgramItemsForDay(tenantId, dayId),
      getReservationsForDay(tenantId, dayId),
      getBreakfastConfigsForDay(tenantId, dayId),
      getDayNotesForDay(tenantId, dayId),
      getWeatherForDay(dateIso),
      staffScheduleOn ? getShiftsForDay(tenantId, dayId) : Promise.resolve([]),
      supabase.from('tenants').select('language').eq('id', tenantId).single(),
    ])
  const language = tenantRow.data?.language ?? 'en'
  const staffShifts = rawShifts.map((s) => ({
    name: s.assignee.display_name,
    role: s.role ?? null,
    start_time: s.start_time ?? null,
    end_time: s.end_time ?? null,
  }))
  return generateAndPersistDailyBrief(supabase, {
    tenantId,
    dayId,
    dateIso,
    generatedBy: user.id,
    language,
    activities,
    reservations,
    breakfasts,
    dayNotes,
    weather,
    ...(staffScheduleOn && staffShifts.length > 0 ? { staffShifts } : {}),
  })
}

function isRegenerableSection(value: string): value is RegenerableSection {
  return (REGENERATABLE_SECTIONS as readonly string[]).includes(value)
}

/**
 * Regenerate a single brief section (vipNotes / risks / suggestedActions).
 * Editor-only. Has its own per-section rate limit so a small change doesn't
 * burn the whole-brief quota.
 */
export async function regenerateBriefSection(
  dateIso: string,
  section: RegenerableSection
): Promise<ActionResponse<DailyBriefRecord>> {
  if (!isRegenerableSection(section)) {
    return { success: false, error: 'Invalid section.' }
  }

  const tenantId = await getTenantId()
  if (!(await isFeatureEnabled(tenantId, 'daily_brief'))) {
    return { success: false, error: 'Daily brief is disabled for this venue.' }
  }
  await requireEditor(tenantId)

  if (!process.env.AI_GATEWAY_API_KEY) {
    return {
      success: false,
      error: 'AI brief is not configured (missing AI_GATEWAY_API_KEY).',
    }
  }

  const rl = await dailyBriefSectionRateLimit(tenantId, dateIso, section)
  if (!rl.success) {
    return {
      success: false,
      error: 'Section regen limit reached. Try again tomorrow.',
    }
  }

  const dayResult = await ensureDayExists(dateIso)
  if (!dayResult.success) return { success: false, error: dayResult.error }
  const dayId = dayResult.data.id

  const { supabase } = await createTenantClient()

  const existing = await getDailyBriefForDayWithClient(supabase, tenantId, dayId)
  if (!existing) {
    return {
      success: false,
      error: 'No existing brief to regenerate. Generate the full brief first.',
    }
  }

  const staffScheduleOn = await isFeatureEnabled(tenantId, 'staff_schedule')

  const [activities, reservations, breakfasts, dayNotes, weather, rawShifts] = await Promise.all([
    getProgramItemsForDay(tenantId, dayId),
    getReservationsForDay(tenantId, dayId),
    getBreakfastConfigsForDay(tenantId, dayId),
    getDayNotesForDay(tenantId, dayId),
    getWeatherForDay(dateIso),
    staffScheduleOn ? getShiftsForDay(tenantId, dayId) : Promise.resolve([]),
  ])

  const staffShifts: StaffShiftContext[] = rawShifts.map((s) => ({
    name: s.assignee.display_name,
    role: s.role ?? null,
    start_time: s.start_time ?? null,
    end_time: s.end_time ?? null,
  }))

  const covers = buildCovers(activities, reservations, breakfasts)
  const allergenRollup = buildAllergenRollup(activities, reservations, breakfasts)
  const payload = llmPayload({
    dateIso,
    weather,
    activities,
    reservations,
    breakfasts,
    dayNotes,
    covers,
    allergenRollup,
    ...(staffScheduleOn && staffShifts.length > 0 ? { staffShifts } : {}),
  })

  const sectionResult = await generateBriefSection(payload, section, tenantId)
  if (!sectionResult.success) {
    return { success: false, error: sectionResult.error }
  }

  const generatedAt = new Date().toISOString()
  const merged = mergeBriefSection(existing.content, section, sectionResult.items, generatedAt)

  const { data, error } = await supabase
    .from('daily_brief')
    .update({
      content: merged as never,
      generated_at: generatedAt,
    })
    .eq('tenant_id', tenantId)
    .eq('day_id', dayId)
    .select('id, content, generated_at, model, prompt_version')
    .single()

  if (error) return { success: false, error: error.message }

  const parsed = dailyBriefContentSchema.safeParse(data.content)
  if (!parsed.success) return { success: false, error: 'Could not validate saved brief.' }

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
