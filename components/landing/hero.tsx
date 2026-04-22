import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { ProductMockup } from '@/components/landing/product-mockup';
import { Eyebrow } from '@/components/landing/section-shell';

export async function Hero() {
  const t = await getTranslations('Platform.landing.hero');

  return (
    <section className="relative overflow-hidden">
      {/* Sunrise backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[620px] bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,var(--brand-soft),transparent_70%)]"
      />
      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 py-20 sm:py-28 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:py-32">
        <div className="flex flex-col gap-6">
          <Eyebrow>{t('eyebrow')}</Eyebrow>
          <h1 className="font-display text-4xl font-medium leading-[1.05] tracking-tight text-balance sm:text-5xl lg:text-6xl">
            {t('title')}
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('body')}
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link href="/book-a-demo">
              <Button size="lg">{t('ctaDemo')}</Button>
            </Link>
            <Link href="/new">
              <Button size="lg" variant="outline">
                {t('ctaTrial')}
              </Button>
            </Link>
          </div>
        </div>
        <div className="relative">
          <ProductMockup />
        </div>
      </div>
    </section>
  );
}
