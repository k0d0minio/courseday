import { notFound, redirect } from 'next/navigation';
import { getUser } from '@/app/actions/auth';
import { getUserRole } from '@/lib/membership';
import { getTenantFromHeaders } from '@/lib/tenant';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { JoinClient } from './join-client';

export default async function InviteJoinPage() {
  const user = await getUser();
  if (!user) {
    redirect('/auth/sign-in');
  }

  const tenant = await getTenantFromHeaders();
  const role = await getUserRole(tenant.id);
  if (!role) {
    notFound();
  }
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', tenant.id)
    .single();

  const tenantName = (data?.name as string | undefined)?.trim() || tenant.slug;
  const email = user.email ?? '';

  return <JoinClient tenantName={tenantName} email={email} />;
}
