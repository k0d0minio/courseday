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
import { dailyBriefContentSchema, generateAndPersistDailyBrief } from '@/lib/daily-brief-generate';
import type { ActionResponse } from '@/types/actions';
import type { DailyBriefRecord } from '@/types/daily-brief';

export type { DailyBriefContent, DailyBriefRecord } from '@/types/daily-brief';

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

  const { supabase } = await createTenantClient();
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
  });
}
