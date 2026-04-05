import type { Metadata } from 'next';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { requireSuperadmin } from '@/lib/superadmin';
import { AdminDashboard } from './dashboard';
import { rootDomain } from '@/lib/utils';

export const metadata: Metadata = {
  title: `Admin Dashboard | ${rootDomain}`,
};

export default async function AdminPage() {
  await requireSuperadmin();

  const serviceClient = createSupabaseServiceClient();
  const { data: tenants } = await serviceClient
    .from('tenants')
    .select('id, name, slug, language, created_at')
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <AdminDashboard tenants={tenants ?? []} />
    </div>
  );
}
