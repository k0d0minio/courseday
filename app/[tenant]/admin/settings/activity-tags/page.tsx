import { getTranslations } from 'next-intl/server'
import { requireTenantEditor } from '@/lib/guards'
import { ActivityTagManagement } from '@/components/activity-tag-management'

export default async function ActivityTagsSettingsPage() {
  await requireTenantEditor()
  const t = await getTranslations('Tenant.settings')

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold">{t('tabActivityTags')}</h1>
      <ActivityTagManagement />
    </div>
  )
}
