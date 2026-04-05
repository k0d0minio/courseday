import { getTranslations } from 'next-intl/server';
import { requireTenantEditor } from '@/lib/guards';
import { ActivityTagManagement } from '@/components/activity-tag-management';

export default async function ActivityTagsSettingsPage() {
  await requireTenantEditor();
  const t = await getTranslations('Tenant.settings');

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold mb-6">{t('tabActivityTags')}</h1>
      <ActivityTagManagement />
    </div>
  );
}
