import { getTranslations } from 'next-intl/server';
import { Eyebrow } from '@/components/landing/section-shell';
import { DemoForm } from './demo-form';

export async function generateMetadata() {
  const t = await getTranslations('Platform.landing.demo');
  return {
    title: t('title'),
    description: t('body'),
  };
}

export default async function DemoPage() {
  const t = await getTranslations('Platform.landing.demo');

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[500px] bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,var(--brand-soft),transparent_70%)]"
      />
      <div className="relative mx-auto grid max-w-5xl grid-cols-1 gap-12 px-6 py-20 sm:py-28 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="flex flex-col gap-4">
          <Eyebrow>{t('eyebrow')}</Eyebrow>
          <h1 className="font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl text-balance">
            {t('title')}
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed">{t('body')}</p>
        </div>
        <div className="rounded-2xl border border-black/5 bg-background p-6 shadow-[0_24px_80px_-48px_rgba(20,60,35,0.35)] sm:p-8 dark:border-white/5">
          <DemoForm
            labels={{
              name: t('nameLabel'),
              email: t('emailLabel'),
              club: t('clubLabel'),
              role: t('roleLabel'),
              rolePlaceholder: t('rolePlaceholder'),
              notes: t('notesLabel'),
              submit: t('submit'),
              submitting: t('submitting'),
              successTitle: t('successTitle'),
              successBody: t('successBody'),
              backHome: t('backHome'),
              errorGeneric: t('errorGeneric'),
            }}
          />
        </div>
      </div>
    </section>
  );
}
