import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';

export async function FinalCta() {
  const t = await getTranslations('Platform.landing.finalCta');

  return (
    <section className="relative overflow-hidden bg-[var(--brand)] text-[var(--brand-foreground)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_120%,color-mix(in_oklch,var(--brand-foreground)_25%,transparent),transparent_70%)]"
      />
      <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 py-24 text-center sm:py-32">
        <h2 className="font-display text-3xl font-medium tracking-tight sm:text-5xl text-balance">
          {t('title')}
        </h2>
        <p className="max-w-xl text-base opacity-80 sm:text-lg">{t('body')}</p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Link href="/demo">
            <Button
              size="lg"
              className="bg-[var(--brand-foreground)] text-[var(--brand)] hover:bg-[var(--brand-foreground)]/90"
            >
              {t('ctaDemo')}
            </Button>
          </Link>
          <Link href="/new">
            <Button
              size="lg"
              variant="outline"
              className="border-[var(--brand-foreground)]/40 bg-transparent text-[var(--brand-foreground)] hover:bg-[var(--brand-foreground)]/10 hover:text-[var(--brand-foreground)]"
            >
              {t('ctaTrial')}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
