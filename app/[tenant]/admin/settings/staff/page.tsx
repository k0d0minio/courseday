import { getTranslations } from 'next-intl/server'
import { requireTenantEditor } from '@/lib/guards'
import { getTenantFromHeaders } from '@/lib/tenant'
import { getFeatureFlags } from '@/app/actions/feature-flags'
import { StaffManagement } from '@/components/staff-management'

export default async function StaffSettingsPage() {
  await requireTenantEditor()
  const t = await getTranslations('Tenant.settings')
  const tenant = await getTenantFromHeaders()
  const flags = await getFeatureFlags(tenant.id)

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold">{t('tabStaff')}</h1>
      {flags.staff_schedule ? (
        <StaffManagement />
      ) : (
        <p className="text-muted-foreground text-sm">{t('staffScheduleDisabled')}</p>
      )}
    </div>
  )
}
