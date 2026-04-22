import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { getWeekdayName } from '@/lib/day-utils';
import type { Day } from '@/types/index';
import type { ActionResponse } from '@/types/actions';

export function buildDayRow(tenantId: string, dateIso: string) {
  return {
    tenant_id: tenantId,
    date_iso: dateIso,
    weekday: getWeekdayName(dateIso),
  };
}

export async function ensureDayForTenant(
  tenantId: string,
  dateIso: string
): Promise<ActionResponse<Day>> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('day')
    .upsert(buildDayRow(tenantId, dateIso), {
      onConflict: 'tenant_id,date_iso',
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as Day };
}
