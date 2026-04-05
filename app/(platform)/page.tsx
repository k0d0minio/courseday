import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export default async function LandingPage() {
  const t = await getTranslations('Platform.landing');

  return (
    <div className="flex flex-col">

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-24 gap-6">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight max-w-2xl leading-tight">
          {t('heroTitle')}
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl">
          {t('heroBody')}
        </p>
        <div className="flex items-center gap-3 pt-2">
          <Link href="/new">
            <Button size="lg">{t('ctaGetStarted')}</Button>
          </Link>
          <Link href="/auth/sign-in">
            <Button size="lg" variant="outline">{t('ctaSignIn')}</Button>
          </Link>
        </div>
      </section>

      <Separator />

      {/* Features */}
      <section className="max-w-5xl mx-auto w-full px-6 py-20 grid sm:grid-cols-3 gap-12">

        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">{t('feature1Label')}</p>
          <h2 className="text-lg font-semibold">{t('feature1Title')}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t('feature1Body')}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">{t('feature2Label')}</p>
          <h2 className="text-lg font-semibold">{t('feature2Title')}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t('feature2Body')}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">{t('feature3Label')}</p>
          <h2 className="text-lg font-semibold">{t('feature3Title')}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t('feature3Body')}
          </p>
        </div>

      </section>

      <Separator />

      {/* Footer CTA */}
      <section className="flex flex-col items-center text-center px-6 py-20 gap-5">
        <h2 className="text-2xl font-semibold tracking-tight">{t('footerTitle')}</h2>
        <p className="text-muted-foreground max-w-sm">
          {t('footerBody')}
        </p>
        <Link href="/new">
          <Button size="lg">{t('footerCta')}</Button>
        </Link>
      </section>

    </div>
  );
}
