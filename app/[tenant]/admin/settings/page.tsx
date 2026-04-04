import { requireTenantEditor } from '@/lib/guards';
import { SettingsClient } from './client';

export default async function SettingsPage() {
  await requireTenantEditor();

  return <SettingsClient />;
}
