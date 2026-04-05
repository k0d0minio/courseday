import type { Metadata } from 'next';
import Link from 'next/link';
import { Toaster } from 'sonner';
import { Settings } from 'lucide-react';
import { Logo } from '@/components/logo';
import { UserMenu } from '@/components/user-menu';
import { getUser } from '@/app/actions/auth';
import { getTenantFromHeaders } from '@/lib/tenant';
import { TenantProvider } from '@/lib/tenant-context';
import { AuthProvider } from '@/lib/AuthProvider';
import { AdminIndicator } from '@/components/admin-indicator';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { isEditor } from '@/lib/membership';
import { PwaRegister } from '@/components/pwa-register';
import { PwaInstallPrompt } from '@/components/pwa-install-prompt';

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
      manifest: '/manifest.webmanifest',
      appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: name ?? 'Golf Schedule',
      },
      icons: {
        apple: '/icon.svg',
      },
    };
  } catch {
    return {
      title: 'Golf Schedule',
      manifest: '/manifest.webmanifest',
      appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'Golf Schedule',
      },
      icons: {
        apple: '/icon.svg',
      },
    };
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

  const supabase = await createSupabaseServerClient();
  const { data: tenantRow } = await supabase
    .from('tenants')
    .select('accent_color, logo_url, name')
    .eq('id', tenant.id)
    .single();

  const row = tenantRow as { accent_color?: string | null; logo_url?: string | null; name?: string | null } | null;
  const accentColor = row?.accent_color;
  const accentStyle = accentColor
    ? ({ '--tenant-accent': accentColor } as React.CSSProperties)
    : undefined;

  const editor = await isEditor(tenant.id);

  return (
    <TenantProvider tenantId={tenant.id} tenantSlug={tenant.slug}>
      <AuthProvider>
        <div className="min-h-screen flex flex-col" style={accentStyle}>
          <header className="border-b px-6 h-14 flex items-center justify-between">
            <Logo logoUrl={row?.logo_url} tenantName={row?.name} />
            <div className="flex items-center gap-2">
              {editor && (
                <Link
                  href="/admin/settings?tab=branding"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Branding settings"
                >
                  <Settings className="h-4 w-4" />
                </Link>
              )}
              {user && <UserMenu user={user} />}
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </div>
        <AdminIndicator />
        <Toaster richColors closeButton />
        <PwaRegister />
        <PwaInstallPrompt />
      </AuthProvider>
    </TenantProvider>
  );
}
