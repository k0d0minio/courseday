import { getTranslations } from 'next-intl/server';
import { requireTenantEditor } from '@/lib/guards';
import { StaffManagement } from '@/components/staff-management';

export default async function StaffSettingsPage() {
  await requireTenantEditor();
  const t = await getTranslations('Tenant.settings');

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold mb-6">{t('tabStaff')}</h1>
      <StaffManagement />
    </div>
  );
}
