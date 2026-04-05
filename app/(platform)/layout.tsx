import Link from 'next/link';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { getTranslations } from 'next-intl/server';

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
        <header className="border-b px-6 h-14 flex items-center justify-between">
          <Link href="/">
            <Logo />
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/auth/sign-in">
              <Button variant="ghost" size="sm">{t('signIn')}</Button>
            </Link>
            <Link href="/new">
              <Button size="sm">{t('getStarted')}</Button>
            </Link>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </NextIntlClientProvider>
  );
}
