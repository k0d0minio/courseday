import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { Logo } from '@/components/logo';
import { UserMenu } from '@/components/user-menu';
import { getUser } from '@/app/actions/auth';
import { getTenantFromHeaders } from '@/lib/tenant';
import { TenantProvider } from '@/lib/tenant-context';
import { AuthProvider } from '@/lib/AuthProvider';
import { AdminIndicator } from '@/components/admin-indicator';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const tenant = await getTenantFromHeaders();
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenant.id)
      .single();
    const name = data?.name as string | undefined;
    return {
      title: name ? `${name} · Golf Schedule` : 'Golf Schedule',
    };
  } catch {
    return { title: 'Golf Schedule' };
  }
}

export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, tenant] = await Promise.all([
    getUser(),
    getTenantFromHeaders(),
  ]);

  return (
    <TenantProvider tenantId={tenant.id} tenantSlug={tenant.slug}>
      <AuthProvider>
        <div className="min-h-screen flex flex-col">
          <header className="border-b px-6 h-14 flex items-center justify-between">
            <Logo />
            {user && <UserMenu user={user} />}
          </header>
          <main className="flex-1">{children}</main>
        </div>
        <AdminIndicator />
        <Toaster richColors closeButton />
      </AuthProvider>
    </TenantProvider>
  );
}
