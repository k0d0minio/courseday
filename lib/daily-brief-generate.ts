import { generateObject } from 'ai'
import { gateway } from '@ai-sdk/gateway'
import type { z } from 'zod'
import type { AppSupabaseClient } from '@/app/[tenant]/day/[date]/queries'
import type { WeatherData } from '@/app/actions/weather'
import type { ActionResponse } from '@/types/actions'
import { logAiCall } from '@/lib/ai-call-log'
import type {
  DailyBriefContent,
  DailyBriefRecord,
  DailyBriefAllergenRollupEntry,
  DailyBriefCovers,
  DailyBriefSectionTimestamps,
  RegenerableSection,
} from '@/types/daily-brief'
import type { Activity, Reservation, BreakfastConfiguration } from '@/types/index'
import type { DayNote } from '@/app/actions/day-notes'
import {
  narrativeSchema,
  dailyBriefContentSchema,
  sectionItemsSchema,
} from '@/lib/daily-brief-schema'

export { narrativeSchema, dailyBriefContentSchema, sectionItemsSchema }

export const PROMPT_VERSION = 'v2'
export const DAILY_BRIEF_MODEL_ID = 'anthropic/claude-sonnet-4-6' as const
const NOTE_MAX = 200

function hasGatewayAuth(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN)
}

// Defense-in-depth: strip obvious PII patterns before any free-text field is sent
// to the LLM. The model is also instructed not to echo personal data, but a regex
// pre-pass means the data simply isn't in the prompt to leak. This is intentionally
// dumb — it does NOT try to detect names, addresses, or anything requiring NLP.
//
// Scrubbed:
// - email addresses → [redacted-email]
// - phone-like number sequences (7+ digits, optionally separated by - . space) → [redacted-phone]
// - @-mentions / handles → [redacted-handle]
//
// NOT scrubbed (out of scope — the system prompt is the primary control):
// - Personal names, place names, room numbers, plate numbers, free-form addresses.
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g
// Matches typical phone formats (with optional country code and grouped digits)
// without false-positiving on ISO dates like 2026-05-10.
const PHONE_RE = /\b(?:\+?\d{1,3}[\s.-]?)?\(?\d{3,4}\)?[\s.-]\d{3,4}[\s.-]\d{3,4}\b/g
const HANDLE_RE = /(?<![\w.+-])@\w{2,}/g

export function scrubPii(text: string): string {
  return text
    .replace(EMAIL_RE, '[redacted-email]')
    .replace(PHONE_RE, '[redacted-phone]')
    .replace(HANDLE_RE, '[redacted-handle]')
}

export function truncateNote(text: string | null | undefined): string | undefined {
  if (!text?.trim()) return undefined
  const scrubbed = scrubPii(text.trim())
  if (scrubbed.length <= NOTE_MAX) return scrubbed
  return `${scrubbed.slice(0, NOTE_MAX)}…`
}

export function buildCovers(
  activities: Activity[],
  reservations: Reservation[],
  breakfasts: BreakfastConfiguration[]
): DailyBriefCovers {
  return {
    breakfast: breakfasts.reduce((s, b) => s + (b.total_guests ?? 0), 0),
    activities: activities.reduce((s, a) => s + (a.expected_covers ?? 0), 0),
    reservations: reservations.reduce((s, r) => s + (r.guest_count ?? 0), 0),
  }
}

export function buildAllergenRollup(
  activities: Activity[],
  reservations: Reservation[],
  breakfasts: BreakfastConfiguration[]
): DailyBriefAllergenRollupEntry[] {
  const map = new Map<string, { a: number; r: number; b: number }>()

  const bump = (code: string, key: 'a' | 'r' | 'b') => {
    const cur = map.get(code) ?? { a: 0, r: 0, b: 0 }
    cur[key] += 1
    map.set(code, cur)
  }

  for (const a of activities) {
    for (const c of a.allergens ?? []) {
      if (c) bump(c, 'a')
    }
  }
  for (const r of reservations) {
    for (const c of r.allergens ?? []) {
      if (c) bump(c, 'r')
    }
  }
  for (const b of breakfasts) {
    for (const c of b.allergens ?? []) {
      if (c) bump(c, 'b')
    }
  }

  return [...map.entries()]
    .map(([code, v]) => ({
      code,
      inActivities: v.a,
      inReservations: v.r,
      inBreakfast: v.b,
    }))
    .sort((x, y) => x.code.localeCompare(y.code))
}

export type StaffShiftContext = {
  name: string
  role: string | null
  start_time: string | null
  end_time: string | null
}

export function llmPayload(args: {
  dateIso: string
  weather: WeatherData | null
  activities: Activity[]
  reservations: Reservation[]
  breakfasts: BreakfastConfiguration[]
  dayNotes: DayNote[]
  covers: DailyBriefCovers
  allergenRollup: DailyBriefAllergenRollupEntry[]
  staffShifts?: StaffShiftContext[] | undefined
}) {
  return {
    date: args.dateIso,
    weather: args.weather
      ? {
          description: args.weather.description,
          tempMin: args.weather.tempMin,
          tempMax: args.weather.tempMax,
          precipitationProbability: args.weather.precipitationProbability,
        }
      : null,
    covers: args.covers,
    allergenRollup: args.allergenRollup,
    activities: args.activities.map((a) => ({
      title: a.title,
      start_time: a.start_time,
      end_time: a.end_time,
      expected_covers: a.expected_covers,
      allergens: a.allergens ?? [],
      description: truncateNote(a.description),
      notes: truncateNote(a.notes),
    })),
    reservations: args.reservations.map((r) => ({
      guest_count: r.guest_count,
      start_time: r.start_time,
      end_time: r.end_time,
      allergens: r.allergens ?? [],
      notes: truncateNote(r.notes),
    })),
    breakfasts: args.breakfasts.map((b) => ({
      group_name: b.group_name,
      total_guests: b.total_guests,
      start_time: b.start_time,
      allergens: b.allergens ?? [],
      notes: truncateNote(b.notes),
    })),
    dayNotes: args.dayNotes.map((n) => ({
      content: truncateNote(n.content),
    })),
    ...(args.staffShifts && args.staffShifts.length > 0
      ? {
          staffScheduled: args.staffShifts.map((s) => ({
            name: s.name,
            role: s.role,
            start_time: s.start_time,
            end_time: s.end_time,
          })),
        }
      : {}),
  }
}

const BRIEF_SYSTEM_BASE = `You write concise operational day briefings for venue staff.
Rules:
- Keep tone professional and calm.
- Do not invent numbers. Covers and allergen counts in the input are authoritative; reflect them in prose only as appropriate.
- Never include guest personal names. If notes contain names, generalise (e.g. "a dietary note on one reservation").
- vipNotes: short bullets for large parties, tight turnarounds, or anything that reads as priority from the data (not names).
- If data is sparse, say so briefly; still give a useful headline and summary.`

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  fr: 'French',
  de: 'German',
  es: 'Spanish',
}

export function buildBriefSystem(language = 'en'): string {
  const lang = LANGUAGE_NAMES[language] ?? 'English'
  return `${BRIEF_SYSTEM_BASE}\n- Respond in ${lang}.`
}

export const BRIEF_SYSTEM = buildBriefSystem('en')

const SECTION_INSTRUCTIONS: Record<RegenerableSection, string> = {
  vipNotes:
    'Produce ONLY the VIP / priority notes for this day, as `items`. Short bullets for large parties, tight turnarounds, or items that read as priority from the data. Never include guest personal names. If nothing qualifies, return an empty array.',
  risks:
    'Produce ONLY the operational risks for this day, as `items`. Short bullets covering allergen pressure, weather impact, capacity strain, or note-driven concerns. Never include guest personal names. If nothing qualifies, return an empty array.',
  suggestedActions:
    'Produce ONLY suggested actions for staff for this day, as `items`. Concrete, actionable bullets the team should consider before service. Never include guest personal names. If nothing qualifies, return an empty array.',
}

type AiUsage = {
  promptTokens?: number | null
  completionTokens?: number | null
  inputTokens?: number | null
  outputTokens?: number | null
}

function readUsage(usage: AiUsage | undefined): {
  promptTokens: number | null
  completionTokens: number | null
} {
  if (!usage) return { promptTokens: null, completionTokens: null }
  return {
    promptTokens: usage.promptTokens ?? usage.inputTokens ?? null,
    completionTokens: usage.completionTokens ?? usage.outputTokens ?? null,
  }
}

export async function generateBriefSection(
  payload: ReturnType<typeof llmPayload>,
  section: RegenerableSection,
  tenantId: string | null = null
): Promise<{ success: true; items: string[] } | { success: false; error: string }> {
  if (!hasGatewayAuth()) {
    return {
      success: false,
      error: 'AI brief is not configured (set AI_GATEWAY_API_KEY or run `vercel env pull`).',
    }
  }

  const startedAt = Date.now()
  try {
    const result = await generateObject({
      model: gateway(DAILY_BRIEF_MODEL_ID),
      schema: sectionItemsSchema,
      system: BRIEF_SYSTEM,
      prompt: `${SECTION_INSTRUCTIONS[section]}\n\nFrom this JSON:\n${JSON.stringify(payload)}`,
      maxOutputTokens: 1024,
      providerOptions: {
        gateway: { caching: 'auto' },
      },
    })
    const { promptTokens, completionTokens } = readUsage(result.usage as AiUsage | undefined)
    void logAiCall({
      tenantId,
      feature: 'daily_brief',
      model: DAILY_BRIEF_MODEL_ID,
      promptTokens,
      completionTokens,
      durationMs: Date.now() - startedAt,
      status: 'ok',
    })
    return { success: true, items: result.object.items }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Generation failed.'
    void logAiCall({
      tenantId,
      feature: 'daily_brief',
      model: DAILY_BRIEF_MODEL_ID,
      promptTokens: null,
      completionTokens: null,
      durationMs: Date.now() - startedAt,
      status: 'error',
      error: msg,
    })
    return {
      success: false,
      error:
        msg.length > 200
          ? 'Section generation failed. Check AI Gateway configuration and try again.'
          : msg,
    }
  }
}

/** Replace one section's items in a brief, recording a per-section timestamp. */
export function mergeBriefSection(
  content: DailyBriefContent,
  section: RegenerableSection,
  items: string[],
  timestamp: string = new Date().toISOString()
): DailyBriefContent {
  const sectionTimestamps: DailyBriefSectionTimestamps = {
    ...(content.sectionTimestamps ?? {}),
  }
  sectionTimestamps[section] = timestamp
  switch (section) {
    case 'vipNotes':
      return { ...content, vipNotes: items, sectionTimestamps }
    case 'risks':
      return { ...content, risks: items, sectionTimestamps }
    case 'suggestedActions':
      return { ...content, suggestedActions: items, sectionTimestamps }
  }
}

export function dayHasPlannedContent(
  activities: Activity[],
  reservations: Reservation[],
  breakfasts: BreakfastConfiguration[]
): boolean {
  return activities.length > 0 || reservations.length > 0 || breakfasts.length > 0
}

/** Run model + persist. Caller supplies loaded rows and weather. */
export async function generateAndPersistDailyBrief(
  supabase: AppSupabaseClient,
  args: {
    tenantId: string
    dayId: string
    dateIso: string
    generatedBy: string | null
    language?: string
    activities: Activity[]
    reservations: Reservation[]
    breakfasts: BreakfastConfiguration[]
    dayNotes: DayNote[]
    weather: WeatherData | null
    staffShifts?: StaffShiftContext[] | undefined
  }
): Promise<ActionResponse<DailyBriefRecord>> {
  if (!hasGatewayAuth()) {
    return {
      success: false,
      error: 'AI brief is not configured (set AI_GATEWAY_API_KEY or run `vercel env pull`).',
    }
  }

  const covers = buildCovers(args.activities, args.reservations, args.breakfasts)
  const allergenRollup = buildAllergenRollup(args.activities, args.reservations, args.breakfasts)
  const payload = llmPayload({
    dateIso: args.dateIso,
    weather: args.weather,
    activities: args.activities,
    reservations: args.reservations,
    breakfasts: args.breakfasts,
    dayNotes: args.dayNotes,
    covers,
    allergenRollup,
    staffShifts: args.staffShifts,
  })

  const language = args.language ?? 'en'

  let narrative: z.infer<typeof narrativeSchema>
  const startedAt = Date.now()
  try {
    const result = await generateObject({
      model: gateway(DAILY_BRIEF_MODEL_ID),
      schema: narrativeSchema,
      system: buildBriefSystem(language),
      prompt: `Produce a daily briefing from this JSON:\n${JSON.stringify(payload)}`,
      maxOutputTokens: 2048,
      providerOptions: {
        gateway: { caching: 'auto' },
      },
    })
    narrative = result.object
    const { promptTokens, completionTokens } = readUsage(result.usage as AiUsage | undefined)
    void logAiCall({
      tenantId: args.tenantId,
      feature: 'daily_brief',
      model: DAILY_BRIEF_MODEL_ID,
      promptTokens,
      completionTokens,
      durationMs: Date.now() - startedAt,
      status: 'ok',
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Generation failed.'
    void logAiCall({
      tenantId: args.tenantId,
      feature: 'daily_brief',
      model: DAILY_BRIEF_MODEL_ID,
      promptTokens: null,
      completionTokens: null,
      durationMs: Date.now() - startedAt,
      status: 'error',
      error: msg,
    })
    return {
      success: false,
      error:
        msg.length > 200
          ? 'Brief generation failed. Check AI Gateway configuration and try again.'
          : msg,
    }
  }

  const content: DailyBriefContent = {
    ...narrative,
    covers,
    allergenRollup,
  }

  const row: Record<string, unknown> = {
    tenant_id: args.tenantId,
    day_id: args.dayId,
    content,
    language,
    generated_at: new Date().toISOString(),
    model: DAILY_BRIEF_MODEL_ID,
    prompt_version: PROMPT_VERSION,
    // A fresh AI generation always discards any prior editor overrides — the
    // user has been warned in the UI before getting here.
    headline_override: null,
    summary_override: null,
    overridden_by: null,
    overridden_at: null,
  }
  if (args.generatedBy) row.generated_by = args.generatedBy
  else row.generated_by = null

  // Override columns added in 00050; cast until `pnpm db:types` regenerates `types/supabase.ts`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = (await (supabase.from('daily_brief') as any)
    .upsert(row, { onConflict: 'tenant_id,day_id' })
    .select(
      'id, content, generated_at, model, prompt_version, headline_override, summary_override, overridden_by, overridden_at'
    )
    .single()) as { data: DailyBriefPersistedRow; error: { message: string } | null }

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
      headline_override: data.headline_override,
      summary_override: data.summary_override,
      overridden_by: data.overridden_by,
      overridden_at: data.overridden_at,
    },
  }
}

type DailyBriefPersistedRow = {
  id: string
  content: unknown
  generated_at: string
  model: string
  prompt_version: string
  headline_override: string | null
  summary_override: string | null
  overridden_by: string | null
  overridden_at: string | null
}
