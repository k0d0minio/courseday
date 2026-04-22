import { getTranslations } from 'next-intl/server';
import { requireTenantEditor } from '@/lib/guards';
import { getTenantFromHeaders } from '@/lib/tenant';
import { getFeatureFlags } from '@/app/actions/feature-flags';
import { StaffManagement } from '@/components/staff-management';

export default async function StaffSettingsPage() {
  await requireTenantEditor();
  const t = await getTranslations('Tenant.settings');
  const tenant = await getTenantFromHeaders();
  const flags = await getFeatureFlags(tenant.id);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold mb-6">{t('tabStaff')}</h1>
      {flags.staff_schedule ? (
        <StaffManagement />
      ) : (
        <p className="text-sm text-muted-foreground">{t('staffScheduleDisabled')}</p>
      )}
    </div>
  );
}
