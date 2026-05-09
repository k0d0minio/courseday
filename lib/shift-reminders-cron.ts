import { createSupabaseServiceClient } from '@/lib/supabase-server'
import { getFeatureFlags } from '@/app/actions/feature-flags'
import { getTenantToday } from '@/lib/day-utils'
import { addDays, format, parseISO } from 'date-fns'

export type ShiftRemindersCronResult = {
  ok: true
  tenantsProcessed: number
  notificationsSent: number
  errors: string[]
}

export async function runShiftRemindersCron(): Promise<ShiftRemindersCronResult> {
  const supabase = createSupabaseServiceClient()

  const { data: tenants, error: tenantsError } = await supabase
    .from('tenants')
    .select('id, slug, timezone')

  if (tenantsError || !tenants) {
    return {
      ok: true,
      tenantsProcessed: 0,
      notificationsSent: 0,
      errors: [tenantsError?.message ?? 'No tenants.'],
    }
  }

  const errors: string[] = []
  let tenantsProcessed = 0
  let notificationsSent = 0

  for (const tenant of tenants) {
    const flags = await getFeatureFlags(tenant.id)
    if (!flags.staff_schedule) continue

    tenantsProcessed += 1

    const tz = (tenant as { timezone?: string | null }).timezone || 'UTC'
    const today = getTenantToday(tz)
    const tomorrow = format(addDays(parseISO(today), 1), 'yyyy-MM-dd')

    const { data: dayRow } = await supabase
      .from('day')
      .select('id')
      .eq('tenant_id', tenant.id)
      .eq('date_iso', tomorrow)
      .maybeSingle()

    if (!dayRow) continue

    const { data: shifts } = await supabase
      .from('shift')
      .select('user_id, start_time')
      .eq('tenant_id', tenant.id)
      .eq('day_id', dayRow.id)

    if (!shifts?.length) continue

    const rows = (shifts as { user_id: string; start_time: string | null }[]).map((s) => ({
      tenant_id: tenant.id,
      user_id: s.user_id,
      title: `Reminder: shift tomorrow at ${s.start_time ?? '—'}`,
      body: null,
      link: `/my-schedule`,
    }))

    const { error: insertErr } = await supabase.from('notifications').insert(rows)
    if (insertErr) {
      errors.push(`${tenant.slug}: ${insertErr.message}`)
      continue
    }
    notificationsSent += rows.length
  }

  return {
    ok: true,
    tenantsProcessed,
    notificationsSent,
    errors,
  }
}
