import { notFound, redirect } from 'next/navigation'
import { format, addDays, parseISO, startOfISOWeek } from 'date-fns'
import { getTenantFromHeaders } from '@/lib/tenant'
import { requireTenantMember } from '@/lib/guards'
import { getFeatureFlags } from '@/app/actions/feature-flags'
import { ensureDaysRange } from '@/app/actions/days'
import { getWeekShifts } from '@/app/actions/shifts'
import { getTenantAssigneesList } from '@/app/[tenant]/day/[date]/queries'
import { RosterGrid } from '@/components/roster-grid'
import { getWeeklyLaborCost } from '@/lib/labor-cost'
import { LaborCostSummaryCard } from '@/components/labor-cost-week'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const YMD_REGEX = /^\d{4}-\d{2}-\d{2}$/

export default async function ScheduleWeekPage({
  params,
}: {
  params: Promise<{ weekStart: string }>
}) {
  const { weekStart } = await params

  if (!YMD_REGEX.test(weekStart)) {
    const monday = format(startOfISOWeek(new Date()), 'yyyy-MM-dd')
    redirect(`/schedule/${monday}`)
  }

  const [tenant, { role }] = await Promise.all([
    getTenantFromHeaders(),
    requireTenantMember(),
  ] as const)

  const flags = await getFeatureFlags(tenant.id)
  if (!flags.staff_schedule) notFound()

  const weekEnd = format(addDays(parseISO(weekStart), 6), 'yyyy-MM-dd')

  const [daysResult, shifts, assignees, laborCost] = await Promise.all([
    ensureDaysRange(weekStart, weekEnd),
    getWeekShifts(weekStart),
    getTenantAssigneesList(tenant.id),
    getWeeklyLaborCost(tenant.id, weekStart).catch(() => null),
  ])

  const days = daysResult.success ? daysResult.data : []
  const isEditor = role === 'editor'

  return (
    <div className="space-y-4">
      {isEditor && laborCost && <LaborCostSummaryCard data={laborCost} />}
      <RosterGrid
        weekStart={weekStart}
        weekEnd={weekEnd}
        days={days}
        shifts={shifts}
        assignees={assignees}
        isEditor={isEditor}
      />
    </div>
  )
}
