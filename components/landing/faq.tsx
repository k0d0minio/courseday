import { getTranslations } from 'next-intl/server';
import { Plus } from 'lucide-react';
import { Eyebrow, SectionShell, SectionTitle } from '@/components/landing/section-shell';

export async function Faq() {
  const t = await getTranslations('Platform.landing.faq');

  const items = [
    { q: t('q1'), a: t('a1') },
    { q: t('q2'), a: t('a2') },
    { q: t('q3'), a: t('a3') },
    { q: t('q4'), a: t('a4') },
    { q: t('q5'), a: t('a5') },
    { q: t('q6'), a: t('a6') },
  ];

  return (
    <SectionShell id="faq">
      <div className="flex flex-col gap-4">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <SectionTitle>{t('title')}</SectionTitle>
      </div>
      <div className="mt-10 divide-y divide-black/10 border-y border-black/10 dark:divide-white/10 dark:border-white/10">
        {items.map(({ q, a }) => (
          <details key={q} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left">
              <span className="font-display text-lg font-medium leading-snug">{q}</span>
              <Plus className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-45" />
            </summary>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">{a}</p>
          </details>
        ))}
      </div>
    </SectionShell>
  );
}
