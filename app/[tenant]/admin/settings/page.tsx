import { redirect } from 'next/navigation';

// /admin/settings → redirect to default section
export default function SettingsPage() {
  redirect('/admin/settings/poc');
}
