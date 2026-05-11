import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-server'
import { getWeekdayName } from '@/lib/day-utils'

export const runtime = 'nodejs'
export const maxDuration = 300

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + n)
  return d
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not set on server.' }, { status: 500 })
  }
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const result = await materialiseShifts()
  return NextResponse.json(result)
}

async function materialiseShifts() {
  const supabase = createSupabaseServiceClient()
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  // Dates for the next 4 weeks (inclusive of today)
  const dates = Array.from({ length: 28 }, (_, i) => addDays(today, i))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tenants, error: tenantsError } = await (supabase.from('tenants') as any).select(
    'id'
  )

  if (tenantsError) return { error: tenantsError.message }

  let created = 0
  let errors = 0

  for (const tenant of tenants as Array<{ id: string }>) {
    try {
      // Get all schedule rows for this tenant, joined with membership user/job_title
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: schedules, error: schedErr } = await (supabase.from('member_schedule') as any)
        .select(
          'day_of_week, start_time, end_time, membership_id, memberships!inner(user_id, job_title)'
        )
        .eq('tenant_id', tenant.id)

      if (schedErr || !schedules?.length) continue

      const rows = schedules as Array<{
        day_of_week: number
        start_time: string
        end_time: string | null
        membership_id: string
        memberships: { user_id: string; job_title: string | null }
      }>

      for (const date of dates) {
        const dow = date.getUTCDay() // 0=Sun … 6=Sat
        const dateIso = toIso(date)

        const matching = rows.filter((r) => r.day_of_week === dow)
        if (!matching.length) continue

        // Upsert day record
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: dayRecord, error: dayErr } = await (supabase.from('day') as any)
          .upsert(
            { tenant_id: tenant.id, date_iso: dateIso, weekday: getWeekdayName(dateIso) },
            { onConflict: 'tenant_id,date_iso' }
          )
          .select('id')
          .single()

        if (dayErr || !dayRecord) continue

        const shiftsToInsert = matching.map((r) => ({
          tenant_id: tenant.id,
          day_id: (dayRecord as { id: string }).id,
          user_id: r.memberships.user_id,
          role: r.memberships.job_title ?? '',
          start_time: r.start_time,
          end_time: r.end_time ?? null,
          auto_generated: true,
        }))

        // ignoreDuplicates = ON CONFLICT DO NOTHING via the unique index
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: insertErr } = await (supabase.from('shift') as any).upsert(shiftsToInsert, {
          onConflict: 'tenant_id,day_id,user_id,start_time',
          ignoreDuplicates: true,
        })

        if (insertErr) {
          errors++
        } else {
          created += shiftsToInsert.length
        }
      }
    } catch {
      errors++
    }
  }

  return { created, errors }
}
