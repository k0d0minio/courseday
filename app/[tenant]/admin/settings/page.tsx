import { getTenantFromHeaders } from '@/lib/tenant';
import { requireEditor } from '@/lib/membership';
import { SettingsClient } from './client';

export default async function SettingsPage() {
  const tenant = await getTenantFromHeaders();
  await requireEditor(tenant.id);

  return <SettingsClient />;
}
