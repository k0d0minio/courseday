import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { Toaster } from 'sonner';
import { Logo } from '@/components/logo';
import { UserMenu } from '@/components/user-menu';
import { ThemeToggle } from '@/components/theme-toggle';
import { SettingsDropdown } from '@/components/settings-dropdown';
import { getUser } from '@/app/actions/auth';
import { getTenantFromHeaders } from '@/lib/tenant';
import { TenantProvider } from '@/lib/tenant-context';
import { AuthProvider } from '@/lib/AuthProvider';
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
      .select('name, accent_color')
      .eq('id', tenant.id)
      .single();
    const name = data?.name as string | undefined;
    const accentColor = (data?.accent_color as string | null) ?? '#e5e7eb';
    return {
      title: name ? `${name} · Courseday` : 'Courseday',
      manifest: '/pwa/manifest',
      themeColor: accentColor,
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
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:rounded focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:ring-2 focus:ring-ring"
          >
            {t('skipToContent')}
          </a>
          <div className="tenant-themed min-h-screen flex flex-col" dir={dir} style={accentStyle}>
            <header className="border-b px-6 h-14 flex items-center justify-between">
              <Logo logoUrl={row?.logo_url} tenantName={row?.name} />
              <div className="flex items-center gap-1">
                {/* Theme toggle — visible to all signed-in users */}
                {user && <ThemeToggle />}
                {/* Settings dropdown — editors only, desktop */}
                {editor && (
                  <span className="hidden sm:inline-flex">
                    <SettingsDropdown />
                  </span>
                )}
                <NotificationBell initialCount={unreadCount} />
                {user && <UserMenu user={user} signOutLabel={t('signOut')} />}
              </div>
            </header>
            <main id="main-content" className="flex-1 pb-16 sm:pb-0">{children}</main>
          </div>
          <MobileNav today={today} isEditor={editor} />
          <Toaster richColors closeButton />
          <PwaRegister />
          <PwaInstallPrompt />
        </AuthProvider>
      </TenantProvider>
      </FeatureFlagProvider>
    </NextIntlClientProvider>
  );
}
