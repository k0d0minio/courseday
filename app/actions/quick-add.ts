'use server';

import { ensureDayExists } from '@/app/actions/days';
import { getTenantId } from '@/lib/tenant';
import { requireEditor } from '@/lib/membership';
import { quickAddRateLimit } from '@/lib/rate-limit';
import { generateQuickAddParse } from '@/lib/quick-add-generate';
import type { QuickAddParseData } from '@/lib/quick-add-types';
import type { ActionResponse } from '@/types/actions';

/**
 * Classify and extract fields from free text. No DB writes.
 * @param input raw user text
 * @param contextDate Y-M-D of the day view
 */
export async function parseQuickAdd(
  input: string,
  contextDate: string
): Promise<ActionResponse<QuickAddParseData>> {
  const tenantId = await getTenantId();
  const user = await requireEditor(tenantId);

  const { success: allowed } = await quickAddRateLimit(user.id);
  if (!allowed) {
    return {
      success: false,
      error: 'Too many quick add attempts. Wait a minute and try again.',
    };
  }

  const dayResult = await ensureDayExists(contextDate);
  if (!dayResult.success) {
    return { success: false, error: dayResult.error };
  }
  const dayId = dayResult.data.id;

  const gen = await generateQuickAddParse(input.trim(), dayId, contextDate);
  if (!gen.success) {
    return { success: false, error: gen.error };
  }

  return { success: true, data: gen.data };
}
