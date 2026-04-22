import { getTranslations } from 'next-intl/server';
import { requireTenantEditor } from '@/lib/guards';
import { ChecklistManagement } from '@/components/checklist-management';
import { getTenantFromHeaders } from '@/lib/tenant';
import { getFeatureFlags } from '@/app/actions/feature-flags';

export default async function ChecklistsSettingsPage() {
  await requireTenantEditor();
  const t = await getTranslations('Tenant.settings');
  const tenant = await getTenantFromHeaders();
  const flags = await getFeatureFlags(tenant.id);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold mb-6">{t('tabChecklists')}</h1>
      {flags.checklists ? (
        <ChecklistManagement />
      ) : (
        <p className="text-sm text-muted-foreground">
          Checklists are disabled for this tenant by superadmin.
        </p>
      )}
    </div>
  );
}
