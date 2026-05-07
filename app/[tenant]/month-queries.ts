import { createSupabaseServerClient } from '@/lib/supabase-server'

export type MonthActivitySummary = { day_id: string }
export type MonthReservationSummary = { day_id: string }
export type MonthBreakfastSummary = { breakfast_date: string; total_guests: number }

export async function getProgramItemsForMonth(
  tenantId: string,
  dayIds: string[]
): Promise<MonthActivitySummary[]> {
  if (dayIds.length === 0) return []
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('activity')
    .select('day_id')
    .eq('tenant_id', tenantId)
    .in('day_id', dayIds)
  return (data ?? []) as MonthActivitySummary[]
}

export async function getReservationsForMonth(
  tenantId: string,
  dayIds: string[]
): Promise<MonthReservationSummary[]> {
  if (dayIds.length === 0) return []
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('reservation')
    .select('day_id')
    .eq('tenant_id', tenantId)
    .in('day_id', dayIds)
  return (data ?? []) as MonthReservationSummary[]
}

export async function getBreakfastConfigsForMonth(
  tenantId: string,
  start: string,
  end: string
): Promise<MonthBreakfastSummary[]> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('breakfast_configuration')
    .select('breakfast_date, total_guests')
    .eq('tenant_id', tenantId)
    .gte('breakfast_date', start)
    .lte('breakfast_date', end)
  return (data ?? []) as MonthBreakfastSummary[]
}
