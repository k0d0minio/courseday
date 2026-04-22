import Link from 'next/link';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { BarChart3, Building2, Lightbulb } from 'lucide-react';
import { Toaster } from 'sonner';
import { getUser } from '@/app/actions/auth';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenu } from '@/components/user-menu';
import { requireSuperadmin } from '@/lib/superadmin';
import { rootDomain } from '@/lib/utils';

const NAV_LINKS = [
  { href: '#overview', label: 'Overview', icon: BarChart3 },
  { href: '#tenants', label: 'Tenants', icon: Building2 },
  { href: '#feature-requests', label: 'Feature Requests', icon: Lightbulb },
] as const;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSuperadmin();
  const [user, locale, messages] = await Promise.all([
    getUser(),
    getLocale(),
    getMessages(),
  ]);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="text-sm font-semibold tracking-wide uppercase">
                Superadmin
              </Link>
              <Link
                href="/"
                className="hidden sm:inline text-sm text-muted-foreground hover:text-foreground transition-colors"
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

        <nav className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 h-12 flex items-center gap-2 overflow-x-auto">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <a
                key={href}
                href={href}
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors whitespace-nowrap"
              >
                <Icon className="h-4 w-4" />
                {label}
              </a>
            ))}
          </div>
        </nav>

        <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
          {children}
        </main>

        <Toaster richColors closeButton />
      </div>
    </NextIntlClientProvider>
  );
}
