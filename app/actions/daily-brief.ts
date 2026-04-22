'use server';

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

import { generateObject } from 'ai';
import { gateway } from '@ai-sdk/gateway';
import { z } from 'zod';
import { createTenantClient } from '@/lib/supabase-server';
import { getTenantId } from '@/lib/tenant';
import { getUserRole, requireEditor } from '@/lib/membership';
import { dailyBriefRateLimit } from '@/lib/rate-limit';
import { ensureDayExists } from '@/app/actions/days';
import {
  getProgramItemsForDay,
  getReservationsForDay,
  getBreakfastConfigsForDay,
  getDayNotesForDay,
} from '@/app/[tenant]/day/[date]/queries';
import { getWeatherForDay } from '@/app/actions/weather';
import type { ActionResponse } from '@/types/actions';
import type {
  DailyBriefContent,
  DailyBriefRecord,
  DailyBriefAllergenRollupEntry,
  DailyBriefCovers,
} from '@/types/daily-brief';
import type { Activity, Reservation, BreakfastConfiguration } from '@/types/index';
import type { DayNote } from '@/app/actions/day-notes';

export type { DailyBriefContent, DailyBriefRecord } from '@/types/daily-brief';

const PROMPT_VERSION = 'v1';
const MODEL_ID = 'openai/gpt-5.4-mini' as const;
const NOTE_MAX = 200;

const narrativeSchema = z.object({
  headline: z.string(),
  summary: z.string(),
  vipNotes: z.array(z.string()),
  risks: z.array(z.string()),
  suggestedActions: z.array(z.string()),
});

const dailyBriefContentSchema = z.object({
  headline: z.string(),
  summary: z.string(),
  covers: z.object({
    breakfast: z.number(),
    activities: z.number(),
    reservations: z.number(),
  }),
  vipNotes: z.array(z.string()),
  allergenRollup: z.array(
    z.object({
      code: z.string(),
      inActivities: z.number(),
      inReservations: z.number(),
      inBreakfast: z.number(),
    })
  ),
  risks: z.array(z.string()),
  suggestedActions: z.array(z.string()),
});

function truncateNote(text: string | null | undefined): string | undefined {
  if (!text?.trim()) return undefined;
  const t = text.trim();
  if (t.length <= NOTE_MAX) return t;
  return `${t.slice(0, NOTE_MAX)}…`;
}

function buildCovers(
  activities: Activity[],
  reservations: Reservation[],
  breakfasts: BreakfastConfiguration[]
): DailyBriefCovers {
  return {
    breakfast: breakfasts.reduce((s, b) => s + (b.total_guests ?? 0), 0),
    activities: activities.reduce((s, a) => s + (a.expected_covers ?? 0), 0),
    reservations: reservations.reduce((s, r) => s + (r.guest_count ?? 0), 0),
  };
}

function buildAllergenRollup(
  activities: Activity[],
  reservations: Reservation[],
  breakfasts: BreakfastConfiguration[]
): DailyBriefAllergenRollupEntry[] {
  const map = new Map<string, { a: number; r: number; b: number }>();

  const bump = (code: string, key: 'a' | 'r' | 'b') => {
    const cur = map.get(code) ?? { a: 0, r: 0, b: 0 };
    cur[key] += 1;
    map.set(code, cur);
  };

  for (const a of activities) {
    for (const c of a.allergens ?? []) {
      if (c) bump(c, 'a');
    }
  }
  for (const r of reservations) {
    for (const c of r.allergens ?? []) {
      if (c) bump(c, 'r');
    }
  }
  for (const b of breakfasts) {
    for (const c of b.allergens ?? []) {
      if (c) bump(c, 'b');
    }
  }

  return [...map.entries()]
    .map(([code, v]) => ({
      code,
      inActivities: v.a,
      inReservations: v.r,
      inBreakfast: v.b,
    }))
    .sort((x, y) => x.code.localeCompare(y.code));
}

function llmPayload(args: {
  dateIso: string;
  weather: Awaited<ReturnType<typeof getWeatherForDay>>;
  activities: Activity[];
  reservations: Reservation[];
  breakfasts: BreakfastConfiguration[];
  dayNotes: DayNote[];
  covers: DailyBriefCovers;
  allergenRollup: DailyBriefAllergenRollupEntry[];
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
  };
}

export async function getDailyBrief(dayId: string): Promise<ActionResponse<DailyBriefRecord | null>> {
  const tenantId = await getTenantId();
  const role = await getUserRole(tenantId);
  if (!role) return { success: false, error: 'Not authorized.' };

  const { supabase } = await createTenantClient();
  const { data, error } = await supabase
    .from('daily_brief')
    .select('id, content, generated_at, model, prompt_version')
    .eq('tenant_id', tenantId)
    .eq('day_id', dayId)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!data) return { success: true, data: null };

  const parsed = dailyBriefContentSchema.safeParse(data.content);
  if (!parsed.success) return { success: true, data: null };

  return {
    success: true,
    data: {
      id: data.id,
      content: parsed.data,
      generated_at: data.generated_at,
      model: data.model,
      prompt_version: data.prompt_version,
    },
  };
}

export async function generateDailyBrief(dateIso: string): Promise<ActionResponse<DailyBriefRecord>> {
  const tenantId = await getTenantId();
  const user = await requireEditor(tenantId);

  if (!process.env.AI_GATEWAY_API_KEY) {
    return {
      success: false,
      error: 'AI brief is not configured (missing AI_GATEWAY_API_KEY).',
    };
  }

  const rl = await dailyBriefRateLimit(tenantId, dateIso);
  if (!rl.success) {
    return {
      success: false,
      error: 'Daily brief limit reached for this date. Try again tomorrow.',
    };
  }

  const dayResult = await ensureDayExists(dateIso);
  if (!dayResult.success) return { success: false, error: dayResult.error };
  const dayId = dayResult.data.id;

  const [activities, reservations, breakfasts, dayNotes, weather] = await Promise.all([
    getProgramItemsForDay(tenantId, dayId),
    getReservationsForDay(tenantId, dayId),
    getBreakfastConfigsForDay(tenantId, dayId),
    getDayNotesForDay(tenantId, dayId),
    getWeatherForDay(dateIso),
  ]);

  const covers = buildCovers(activities, reservations, breakfasts);
  const allergenRollup = buildAllergenRollup(activities, reservations, breakfasts);
  const payload = llmPayload({
    dateIso,
    weather,
    activities,
    reservations,
    breakfasts,
    dayNotes,
    covers,
    allergenRollup,
  });

  const system = `You write concise operational day briefings for venue staff.
Rules:
- Use British English spelling if unsure; keep tone professional and calm.
- Do not invent numbers. Covers and allergen counts in the input are authoritative; reflect them in prose only as appropriate.
- Never include guest personal names. If notes contain names, generalise (e.g. "a dietary note on one reservation").
- vipNotes: short bullets for large parties, tight turnarounds, or anything that reads as priority from the data (not names).
- If data is sparse, say so briefly; still give a useful headline and summary.`;

  let narrative: z.infer<typeof narrativeSchema>;
  try {
    const result = await generateObject({
      model: gateway(MODEL_ID),
      schema: narrativeSchema,
      system,
      prompt: `Produce a daily briefing from this JSON:\n${JSON.stringify(payload)}`,
      maxOutputTokens: 2048,
    });
    narrative = result.object;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Generation failed.';
    return {
      success: false,
      error:
        msg.length > 200
          ? 'Brief generation failed. Check AI Gateway configuration and try again.'
          : msg,
    };
  }

  const content: DailyBriefContent = {
    ...narrative,
    covers,
    allergenRollup,
  };

  const { supabase } = await createTenantClient();
  const { data, error } = await supabase
    .from('daily_brief')
    .upsert(
      {
        tenant_id: tenantId,
        day_id: dayId,
        content,
        generated_at: new Date().toISOString(),
        generated_by: user.id,
        model: MODEL_ID,
        prompt_version: PROMPT_VERSION,
      },
      { onConflict: 'tenant_id,day_id' }
    )
    .select('id, content, generated_at, model, prompt_version')
    .single();

  if (error) return { success: false, error: error.message };

  const parsed = dailyBriefContentSchema.safeParse(data.content);
  if (!parsed.success) return { success: false, error: 'Could not validate saved brief.' };

  return {
    success: true,
    data: {
      id: data.id,
      content: parsed.data,
      generated_at: data.generated_at,
      model: data.model,
      prompt_version: data.prompt_version,
    },
  };
}
