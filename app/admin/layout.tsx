import Link from 'next/link'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { BarChart3, Building2, Lightbulb } from 'lucide-react'
import { Toaster } from 'sonner'
import { getUser } from '@/app/actions/auth'
import { ThemeToggle } from '@/components/theme-toggle'
import { UserMenu } from '@/components/user-menu'
import { requireSuperadmin } from '@/lib/superadmin'
import { rootDomain } from '@/lib/utils'

const NAV_LINKS = [
  { href: '#overview', label: 'Overview', icon: BarChart3 },
  { href: '#tenants', label: 'Tenants', icon: Building2 },
  { href: '#feature-requests', label: 'Feature Requests', icon: Lightbulb },
] as const

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireSuperadmin()
  const [user, locale, messages] = await Promise.all([getUser(), getLocale(), getMessages()])

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="bg-background min-h-screen">
        <header className="border-b">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="text-sm font-semibold tracking-wide uppercase">
                Superadmin
              </Link>
              <Link
                href="/"
                className="text-muted-foreground hover:text-foreground hidden text-sm transition-colors sm:inline"
              >
                {rootDomain}
              </Link>
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              {user && <UserMenu user={user} signOutLabel="Sign out" />}
            </div>
          </div>
        </header>

        <nav className="bg-background/95 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-40 border-b backdrop-blur">
          <div className="mx-auto flex h-12 max-w-7xl items-center gap-2 overflow-x-auto px-4 sm:px-6">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <a
                key={href}
                href={href}
                className="text-muted-foreground hover:text-foreground hover:bg-accent inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors"
              >
                <Icon className="h-4 w-4" />
                {label}
              </a>
            ))}
          </div>
        </nav>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>

        <Toaster richColors closeButton />
      </div>
    </NextIntlClientProvider>
  )
}
