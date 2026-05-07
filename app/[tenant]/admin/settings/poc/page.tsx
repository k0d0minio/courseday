import { getTranslations } from 'next-intl/server'
import { requireTenantEditor } from '@/lib/guards'
import { PocManagement } from '@/components/poc-management'

export default async function PocSettingsPage() {
  await requireTenantEditor()
  const t = await getTranslations('Tenant.settings')

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold">{t('tabPoc')}</h1>
      <PocManagement />
    </div>
  )
}
