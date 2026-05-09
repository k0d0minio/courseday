import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-server'
import { buildIcal } from '@/lib/ical'
import type { IcalShift } from '@/lib/ical'
import { addDays, format } from 'date-fns'

export const runtime = 'nodejs'

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const serviceClient = createSupabaseServiceClient()

  // Look up membership by token
  const { data: membership, error } = await serviceClient
    .from('memberships')
    .select('id, user_id, tenant_id')
    .eq('ical_token', token)
    .maybeSingle()

  if (error || !membership) {
    return new NextResponse('Not Found', { status: 404 })
  }

  // Check staff_schedule feature flag for this tenant
  const { data: flagRow } = await serviceClient
    .from('feature_flags')
    .select('enabled')
    .eq('tenant_id', membership.tenant_id)
    .eq('flag_key', 'staff_schedule')
    .maybeSingle()

  // Missing row = enabled by default
  const flagEnabled = flagRow ? flagRow.enabled : true
  if (!flagEnabled) {
    return new NextResponse('Not Found', { status: 404 })
  }

  // Fetch shifts for next 90 days
  const today = format(new Date(), 'yyyy-MM-dd')
  const until = format(addDays(new Date(), 90), 'yyyy-MM-dd')

  const { data: days } = await serviceClient
    .from('day')
    .select('id, date_iso')
    .eq('tenant_id', membership.tenant_id)
    .gte('date_iso', today)
    .lte('date_iso', until)

  const dayRows = days ?? []
  const shifts: IcalShift[] = []

  if (dayRows.length > 0) {
    const dayMap = new Map<string, string>(dayRows.map((d) => [d.id, d.date_iso as string]))
    const dayIds = dayRows.map((d) => d.id)

    const { data: shiftRows } = await serviceClient
      .from('shift')
      .select('id, day_id, start_time, end_time, role, notes')
      .eq('tenant_id', membership.tenant_id)
      .eq('user_id', membership.user_id)
      .in('day_id', dayIds)
      .order('start_time', { nullsFirst: true })

    for (const s of shiftRows ?? []) {
      shifts.push({
        id: s.id,
        date_iso: dayMap.get(s.day_id) ?? '',
        start_time: s.start_time ?? null,
        end_time: s.end_time ?? null,
        role_label: (s.role as string | null) ?? null,
        notes: (s.notes as string | null) ?? null,
      })
    }
  }

  const ical = buildIcal(shifts, '-//Courseday//Shift Feed//EN')

  return new NextResponse(ical, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'private, max-age=300',
    },
  })
}
