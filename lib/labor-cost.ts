import { createSupabaseServerClient } from '@/lib/supabase-server'
import { addDays, format, parseISO } from 'date-fns'

export interface LaborCostMember {
  user_id: string
  name: string
  scheduledMinutes: number
  cost: number
  hasRate: boolean
  actualMinutes: number
  actualCost: number
}

export interface WeeklyLaborCost {
  totalScheduledMinutes: number
  totalScheduledCost: number
  perMember: LaborCostMember[]
  currency: string
  totalActualCost?: number
}

function parseHHMM(t: string): number {
  const parts = t.split(':')
  const h = parseInt(parts[0] ?? '0', 10)
  const m = parseInt(parts[1] ?? '0', 10)
  return h * 60 + m
}

export function scheduledMinutesFromTimes(
  startTime: string | null,
  endTime: string | null
): number {
  if (!startTime || !endTime) return 0
  const start = parseHHMM(startTime)
  let end = parseHHMM(endTime)
  if (end < start) end += 24 * 60
  return Math.max(0, end - start)
}

export function actualMinutesFromTimestamps(
  actualStart: string | null,
  actualEnd: string | null
): number {
  if (!actualStart || !actualEnd) return 0
  const diff = new Date(actualEnd).getTime() - new Date(actualStart).getTime()
  return Math.max(0, Math.round(diff / 60000))
}

type MemberRow = {
  user_id: string
  first_name: string | null
  last_name: string | null
  hourly_rate: number | null
  currency: string | null
}

type ShiftRow = {
  user_id: string
  start_time: string | null
  end_time: string | null
  actual_start?: string | null
  actual_end?: string | null
}

export async function getWeeklyLaborCost(
  tenantId: string,
  weekStartISO: string
): Promise<WeeklyLaborCost> {
  const weekEnd = format(addDays(parseISO(weekStartISO), 6), 'yyyy-MM-dd')
  const supabase = await createSupabaseServerClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: memberships } = await (supabase.from('memberships') as any)
    .select('user_id, first_name, last_name, hourly_rate, currency')
    .eq('tenant_id', tenantId)

  const memberRows: MemberRow[] = (memberships ?? []) as MemberRow[]

  const currency = memberRows.find((m) => m.currency)?.currency ?? 'EUR'

  const { data: days } = await supabase
    .from('day')
    .select('id')
    .eq('tenant_id', tenantId)
    .gte('date_iso', weekStartISO)
    .lte('date_iso', weekEnd)

  const dayIds = (days ?? []).map((d) => d.id)

  const emptyResult = (rows: MemberRow[]): WeeklyLaborCost => ({
    totalScheduledMinutes: 0,
    totalScheduledCost: 0,
    perMember: rows.map((m) => ({
      user_id: m.user_id,
      name: memberName(m),
      scheduledMinutes: 0,
      cost: 0,
      hasRate: m.hourly_rate !== null,
      actualMinutes: 0,
      actualCost: 0,
    })),
    currency,
  })

  if (dayIds.length === 0) return emptyResult(memberRows)

  const { data: shifts } = await supabase
    .from('shift')
    .select('*')
    .eq('tenant_id', tenantId)
    .in('day_id', dayIds)

  const shiftRows: ShiftRow[] = (shifts ?? []) as unknown as ShiftRow[]

  const acc = new Map<string, { scheduled: number; actual: number }>()
  for (const m of memberRows) {
    acc.set(m.user_id, { scheduled: 0, actual: 0 })
  }
  for (const s of shiftRows) {
    const entry = acc.get(s.user_id) ?? { scheduled: 0, actual: 0 }
    entry.scheduled += scheduledMinutesFromTimes(s.start_time, s.end_time)
    entry.actual += actualMinutesFromTimestamps(s.actual_start ?? null, s.actual_end ?? null)
    acc.set(s.user_id, entry)
  }

  let totalScheduledMinutes = 0
  let totalScheduledCost = 0
  let totalActualCost = 0
  let hasAnyActuals = false

  const perMember: LaborCostMember[] = memberRows.map((m) => {
    const entry = acc.get(m.user_id) ?? { scheduled: 0, actual: 0 }
    const hasRate = m.hourly_rate !== null
    const rate = m.hourly_rate ?? 0
    const cost = (entry.scheduled / 60) * rate
    const actualCost = (entry.actual / 60) * rate

    totalScheduledMinutes += entry.scheduled
    totalScheduledCost += cost
    if (entry.actual > 0) hasAnyActuals = true
    totalActualCost += actualCost

    return {
      user_id: m.user_id,
      name: memberName(m),
      scheduledMinutes: entry.scheduled,
      cost,
      hasRate,
      actualMinutes: entry.actual,
      actualCost,
    }
  })

  const result: WeeklyLaborCost = {
    totalScheduledMinutes,
    totalScheduledCost,
    perMember,
    currency,
  }

  if (hasAnyActuals) {
    result.totalActualCost = totalActualCost
  }

  return result
}

function memberName(m: MemberRow): string {
  const full = [m.first_name, m.last_name].filter(Boolean).join(' ')
  return full || m.user_id.slice(0, 8)
}
