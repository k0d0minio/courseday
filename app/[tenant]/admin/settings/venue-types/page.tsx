import { getTranslations } from 'next-intl/server';
import { requireTenantEditor } from '@/lib/guards';
import { VenueTypeManagement } from '@/components/venue-type-management';

export default async function VenueTypesSettingsPage() {
  await requireTenantEditor();
  const t = await getTranslations('Tenant.settings');

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold mb-6">{t('tabVenueTypes')}</h1>
      <VenueTypeManagement />
    </div>
  );
}
