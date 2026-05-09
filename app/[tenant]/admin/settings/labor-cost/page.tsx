import { notFound } from 'next/navigation'
import { format, startOfISOWeek, parseISO, isValid } from 'date-fns'
import { getTranslations } from 'next-intl/server'
import { requireTenantEditor } from '@/lib/guards'
import { getTenantFromHeaders } from '@/lib/tenant'
import { getFeatureFlags } from '@/app/actions/feature-flags'
import { getWeeklyLaborCost } from '@/lib/labor-cost'
import { LaborCostWeek } from '@/components/labor-cost-week'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const YMD_REGEX = /^\d{4}-\d{2}-\d{2}$/

function resolveWeekStart(raw: string | undefined): string {
  if (raw && YMD_REGEX.test(raw)) {
    const parsed = parseISO(raw)
    if (isValid(parsed)) {
      return format(startOfISOWeek(parsed), 'yyyy-MM-dd')
    }
  }
  return format(startOfISOWeek(new Date()), 'yyyy-MM-dd')
}

export default async function LaborCostPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const [tenant, { user }] = await Promise.all([
    getTenantFromHeaders(),
    requireTenantEditor(),
  ] as const)

  const flags = await getFeatureFlags(tenant.id)
  if (!flags.staff_schedule) notFound()

  const { week } = await searchParams
  const weekStart = resolveWeekStart(week)

  const [data, t] = await Promise.all([
    getWeeklyLaborCost(tenant.id, weekStart),
    getTranslations('Tenant.staff.laborCost'),
  ])

  void user

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold">{t('title')}</h1>
      <LaborCostWeek weekStart={weekStart} data={data} basePath={`/admin/settings/labor-cost`} />
    </div>
  )
}
