import { redirect } from 'next/navigation';
import { getUser } from '@/app/actions/auth';
import { NewTenantForm } from './new-tenant-form';

export default async function NewTenantPage() {
  const user = await getUser();
  if (!user) redirect('/auth/sign-up?next=/new');

  return <NewTenantForm />;
}
