import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { addDays, format } from 'date-fns'
import { requireTenantMember } from '@/lib/guards'
import { getTenantFromHeaders } from '@/lib/tenant'
import { getFeatureFlags } from '@/app/actions/feature-flags'
import { getMyShifts } from '@/app/actions/shifts'
import { MyScheduleList } from '@/components/my-schedule-list'
import { getTenantToday } from '@/lib/day-utils'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function MySchedulePage() {
  const tenant = await getTenantFromHeaders()

  const flags = await getFeatureFlags(tenant.id)
  if (!flags.staff_schedule) notFound()

  await requireTenantMember()

  const supabase = await createSupabaseServerClient()
  const { data: tenantRow } = await supabase
    .from('tenants')
    .select('timezone')
    .eq('id', tenant.id)
    .single()

  const today = getTenantToday(tenantRow?.timezone ?? 'UTC')
  const from = today
  const to = format(addDays(new Date(today + 'T12:00:00'), 28), 'yyyy-MM-dd')

  const [t, shifts] = await Promise.all([
    getTranslations('Tenant.staff.mySchedule'),
    getMyShifts({ from, to }),
  ])

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-6 text-xl font-bold">{t('title')}</h1>
      <MyScheduleList initialShifts={shifts} today={today} />
    </div>
  )
}
