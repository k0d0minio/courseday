import { getTranslations } from 'next-intl/server';
import { Eyebrow, SectionShell, SectionTitle } from '@/components/landing/section-shell';

export async function HowItWorks() {
  const t = await getTranslations('Platform.landing.howItWorks');

  const steps = [
    { num: '01', title: t('step1Title'), body: t('step1Body') },
    { num: '02', title: t('step2Title'), body: t('step2Body') },
    { num: '03', title: t('step3Title'), body: t('step3Body') },
  ];

  return (
    <SectionShell>
      <div className="flex flex-col gap-4">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <SectionTitle>{t('title')}</SectionTitle>
      </div>
      <ol className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-3">
        {steps.map((s) => (
          <li key={s.num} className="flex flex-col gap-3">
            <span className="font-display text-3xl font-medium text-[var(--brand)]">{s.num}</span>
            <div className="h-px w-10 bg-[var(--brand)]/40" />
            <h3 className="font-display text-xl font-medium leading-snug">{s.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
          </li>
        ))}
      </ol>
    </SectionShell>
  );
}
