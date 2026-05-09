import { getTranslations } from 'next-intl/server'
import { requireTenantEditor } from '@/lib/guards'
import { getTenantFromHeaders } from '@/lib/tenant'
import { getTenantAssigneesList } from '@/app/[tenant]/day/[date]/queries'
import { ShiftTemplateManagement } from '@/components/shift-template-management'

export default async function ShiftTemplatesSettingsPage() {
  await requireTenantEditor()
  const t = await getTranslations('Tenant.settings')
  const tenant = await getTenantFromHeaders()
  const assignees = await getTenantAssigneesList(tenant.id)

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold">{t('tabShiftTemplates')}</h1>
      <ShiftTemplateManagement assignees={assignees} />
    </div>
  )
}
