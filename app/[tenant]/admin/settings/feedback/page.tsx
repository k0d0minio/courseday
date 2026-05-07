import { getTranslations } from 'next-intl/server'
import { requireTenantEditor } from '@/lib/guards'
import { FeatureRequestManagement } from '@/components/feature-request-management'

export default async function FeedbackSettingsPage() {
  await requireTenantEditor()
  const t = await getTranslations('Tenant.settings')

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold">{t('tabFeedback')}</h1>
      <FeatureRequestManagement />
    </div>
  )
}
