import { getTranslations } from 'next-intl/server'
import { requireTenantEditor } from '@/lib/guards'
import { VenueTypeManagement } from '@/components/venue-type-management'

export default async function VenueTypesSettingsPage() {
  await requireTenantEditor()
  const t = await getTranslations('Tenant.settings')

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold">{t('tabVenueTypes')}</h1>
      <VenueTypeManagement />
    </div>
  )
}
