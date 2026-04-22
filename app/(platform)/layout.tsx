import Link from 'next/link';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/language-switcher';
import { LandingFooter } from '@/components/landing/landing-footer';

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();
  const t = await getTranslations('Platform.nav');

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-40 border-b border-black/5 bg-background/80 backdrop-blur-md dark:border-white/5">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
            <Link href="/" className="inline-flex items-center" aria-label="Courseday">
              <Logo />
            </Link>
            <nav className="flex items-center gap-1 sm:gap-2">
              <Link href="/#faq" className="hidden sm:inline">
                <Button variant="ghost" size="sm">
                  {t('faq')}
                </Button>
              </Link>
              <Link href="/auth/sign-in" className="hidden sm:inline-flex">
                <Button variant="ghost" size="sm">
                  {t('signIn')}
                </Button>
              </Link>
              <LanguageSwitcher />
              <Link href="/book-a-demo">
                <Button size="sm">{t('bookDemo')}</Button>
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <LandingFooter />
      </div>
    </NextIntlClientProvider>
  );
}
