import type { Metadata } from 'next';
import Link from 'next/link';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { Toaster } from 'sonner';
import { Settings } from 'lucide-react';
import * as Sentry from '@sentry/nextjs';
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
import { FeatureFlagProvider } from '@/lib/feature-flags-context';
import { getFeatureFlags } from '@/app/actions/feature-flags';
import { MobileNav } from '@/components/mobile-nav';
import { NotificationBell } from '@/components/notification-bell';
import { getUnreadCount } from '@/app/actions/notifications';
import { getTenantToday } from '@/lib/day-utils';

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
      title: name ? `${name} · Courseday` : 'Courseday',
      manifest: '/pwa/manifest',
      appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: name ?? 'Courseday',
      },
      icons: {
        apple: '/pwa/icon',
      },
    };
  } catch {
    return {
      title: 'Courseday',
      manifest: '/pwa/manifest',
      appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'Courseday',
      },
      icons: {
        apple: '/pwa/icon',
      },
    };
  }
}

export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, tenant, locale, messages] = await Promise.all([
    getUser(),
    getTenantFromHeaders(),
    getLocale(),
    getMessages(),
  ]);

  Sentry.setTag('tenant_id', tenant.id);
  Sentry.setTag('tenant_slug', tenant.slug);
  if (user) {
    Sentry.setUser({ id: user.id, email: user.email });
  }

  const featureFlags = await getFeatureFlags(tenant.id);

  const supabase = await createSupabaseServerClient();
  const { data: tenantRow } = await supabase
    .from('tenants')
    .select('accent_color, logo_url, name, timezone')
    .eq('id', tenant.id)
    .single();

  const row = tenantRow as { accent_color?: string | null; logo_url?: string | null; name?: string | null; timezone?: string | null } | null;
  const today = getTenantToday(row?.timezone ?? 'UTC');
  const accentColor = row?.accent_color;
  const accentStyle = accentColor
    ? ({ '--tenant-accent': accentColor } as React.CSSProperties)
    : undefined;

  const [editor, t, unreadCount] = await Promise.all([
    isEditor(tenant.id),
    getTranslations('Tenant.nav'),
    getUnreadCount(),
  ]);

  // RTL locales — extend when adding Arabic, Hebrew, etc.
  const RTL_LOCALES = new Set<string>([]);
  const dir = RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <FeatureFlagProvider flags={featureFlags}>
      <TenantProvider tenantId={tenant.id} tenantSlug={tenant.slug}>
        <AuthProvider>
          <div className="min-h-screen flex flex-col" dir={dir} style={accentStyle}>
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
                <NotificationBell initialCount={unreadCount} />
                {user && <UserMenu user={user} signOutLabel={t('signOut')} />}
              </div>
            </header>
            <main className="flex-1 pb-16 sm:pb-0">{children}</main>
          </div>
          <MobileNav today={today} isEditor={editor} />
          <AdminIndicator />
          <Toaster richColors closeButton />
          <PwaRegister />
          <PwaInstallPrompt />
        </AuthProvider>
      </TenantProvider>
      </FeatureFlagProvider>
    </NextIntlClientProvider>
  );
}
