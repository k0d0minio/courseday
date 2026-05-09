import type { Metadata } from 'next'
import { cache } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages, getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { Toaster } from 'sonner'
import { Logo } from '@/components/logo'
import { UserMenu } from '@/components/user-menu'
import { ThemeToggle } from '@/components/theme-toggle'
import { SettingsDropdown } from '@/components/settings-dropdown'
import { getUser } from '@/app/actions/auth'
import { getTenantFromHeaders } from '@/lib/tenant'
import { TenantProvider } from '@/lib/tenant-context'
import { AuthProvider } from '@/lib/AuthProvider'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { isEditor } from '@/lib/membership'
import { PwaRegister } from '@/components/pwa-register'
import { PwaInstallPrompt } from '@/components/pwa-install-prompt'
import { FeatureFlagProvider } from '@/lib/feature-flags-context'
import { getFeatureFlags } from '@/app/actions/feature-flags'
import { MobileNav } from '@/components/mobile-nav'
import { NotificationBell } from '@/components/notification-bell'
import { OfflineStatusPill } from '@/components/offline-status-pill'
import { SuperadminReturnPopup } from '@/components/superadmin-return-popup'
import { getUnreadCount } from '@/app/actions/notifications'
import { getTenantToday } from '@/lib/day-utils'
import { getSuperadminImpersonationRole } from '@/lib/superadmin'
import { getTenantPalette, getTenantThemeCssVariables } from '@/lib/theme/palettes'
import { TenantKeyboardShell } from '@/components/tenant-keyboard-shell'
import { GlobalQuickAdd } from '@/components/global-quick-add'

const getTenantRow = cache(async (tenantId: string) => {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('tenants')
    .select('name, theme_palette, accent_color, logo_url, timezone')
    .eq('id', tenantId)
    .single()
  return data as {
    name?: string | null
    theme_palette?: string | null
    accent_color?: string | null
    logo_url?: string | null
    timezone?: string | null
  } | null
})

export async function generateMetadata(): Promise<Metadata> {
  try {
    const tenant = await getTenantFromHeaders()
    const data = await getTenantRow(tenant.id)
    const name = (data?.name ?? tenant.slug) as string
    const palette = getTenantPalette(
      (data?.theme_palette as string | null) ?? null,
      (data?.accent_color as string | null) ?? null
    )
    return {
      title: name,
      manifest: '/pwa/manifest',
      themeColor: palette.legacyAccentHex,
      appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: name,
      },
    }
  } catch {
    return {
      manifest: '/pwa/manifest',
      appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
      },
    }
  }
}

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const [user, tenant, locale, messages] = await Promise.all([
    getUser(),
    getTenantFromHeaders(),
    getLocale(),
    getMessages(),
  ])

  const featureFlags = await getFeatureFlags(tenant.id)

  const row = await getTenantRow(tenant.id)
  const today = getTenantToday(row?.timezone ?? 'UTC')
  const palette = getTenantPalette(row?.theme_palette ?? null, row?.accent_color ?? null)
  const accentStyle = getTenantThemeCssVariables(palette) as React.CSSProperties

  const [editor, superadminImpersonationRole, t, unreadCount] = await Promise.all([
    isEditor(tenant.id),
    user ? getSuperadminImpersonationRole(tenant.id, user.id) : Promise.resolve(null),
    getTranslations('Tenant.nav'),
    getUnreadCount(),
  ])

  // RTL locales — extend when adding Arabic, Hebrew, etc.
  const RTL_LOCALES = new Set<string>([])
  const dir = RTL_LOCALES.has(locale) ? 'rtl' : 'ltr'

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <FeatureFlagProvider flags={featureFlags}>
        <TenantProvider tenantId={tenant.id} tenantSlug={tenant.slug}>
          <AuthProvider>
            <TenantKeyboardShell tenantTodayYmd={today}>
              <a
                href="#main-content"
                className="focus:bg-background focus:ring-ring sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:rounded focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:ring-2"
              >
                {t('skipToContent')}
              </a>
              <div
                className="tenant-themed flex min-h-screen flex-col"
                dir={dir}
                style={accentStyle}
              >
                <header className="flex h-14 items-center justify-between border-b px-6">
                  <Link
                    href="/"
                    className="inline-flex items-center"
                    aria-label={row?.name ?? 'Home'}
                  >
                    <Logo logoUrl={row?.logo_url ?? null} tenantName={row?.name ?? null} />
                  </Link>
                  <div className="flex items-center gap-1">
                    <OfflineStatusPill />
                    {/* Theme toggle — visible to all signed-in users */}
                    {user && <ThemeToggle />}
                    {/* AI quick-add — editors only */}
                    {editor && <GlobalQuickAdd />}
                    {/* Settings dropdown — editors only, desktop */}
                    {editor && (
                      <span className="hidden sm:inline-flex">
                        <SettingsDropdown />
                      </span>
                    )}
                    {/* My schedule link — non-editors on desktop when staff_schedule on */}
                    {!editor && featureFlags.staff_schedule && user && (
                      <span className="hidden sm:inline-flex">
                        <Link
                          href="/my-schedule"
                          className="text-muted-foreground hover:text-foreground px-2 text-sm font-medium transition-colors"
                        >
                          {t('mySchedule')}
                        </Link>
                      </span>
                    )}
                    <NotificationBell initialCount={unreadCount} />
                    {user && (
                      <span className={editor ? undefined : 'hidden sm:inline-flex'}>
                        <UserMenu user={user} signOutLabel={t('signOut')} />
                      </span>
                    )}
                  </div>
                </header>
                <main id="main-content" className="flex-1 pb-16 sm:pb-0">
                  {children}
                </main>
              </div>
              <MobileNav today={today} isEditor={editor} />
              {superadminImpersonationRole && (
                <SuperadminReturnPopup role={superadminImpersonationRole} />
              )}
              <Toaster richColors closeButton />
              <PwaRegister />
              <PwaInstallPrompt />
            </TenantKeyboardShell>
          </AuthProvider>
        </TenantProvider>
      </FeatureFlagProvider>
    </NextIntlClientProvider>
  )
}
