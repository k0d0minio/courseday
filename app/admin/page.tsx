import type { Metadata } from 'next';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { getFeatureFlagsByTenants } from '@/app/actions/feature-flags';
import { AdminDashboard } from './dashboard';
import { AdminFeatureRequests } from '@/components/admin-feature-requests';
import { rootDomain } from '@/lib/utils';

export const metadata: Metadata = {
  title: `Admin Dashboard | ${rootDomain}`,
};

export default async function AdminPage() {
  const serviceClient = createSupabaseServiceClient();
  const { data: tenants } = await serviceClient
    .from('tenants')
    .select('id, name, slug, language, created_at, status')
    .order('created_at', { ascending: false });

  const tenantList = tenants ?? [];
  const flagsByTenant = await getFeatureFlagsByTenants(tenantList.map((t) => t.id));

  return (
    <div className="space-y-12">
      <AdminDashboard tenants={tenantList} flagsByTenant={flagsByTenant} />

      <div id="feature-requests">
        <h2 className="text-2xl font-bold mb-6">Feature Requests</h2>
        <AdminFeatureRequests tenants={tenantList.map((t) => ({ id: t.id, name: t.name }))} />
      </div>
    </div>
  );
}
