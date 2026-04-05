import { getTranslations } from 'next-intl/server';
import { requireTenantEditor } from '@/lib/guards';
import { ScheduleTemplateManagement } from '@/components/schedule-template-management';

export default async function TemplatesSettingsPage() {
  await requireTenantEditor();
  const t = await getTranslations('Tenant.settings');

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold mb-6">{t('tabTemplates')}</h1>
      <ScheduleTemplateManagement />
    </div>
  );
}
