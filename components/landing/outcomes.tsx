import { getTranslations } from 'next-intl/server';
import { Check } from 'lucide-react';
import { Eyebrow, SectionShell, SectionTitle } from '@/components/landing/section-shell';

export async function Outcomes() {
  const t = await getTranslations('Platform.landing.outcomes');

  const items = [t('item1'), t('item2'), t('item3'), t('item4'), t('item5'), t('item6')];

  return (
    <SectionShell tone="soft">
      <div className="flex flex-col gap-4">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <SectionTitle>{t('title')}</SectionTitle>
      </div>
      <ul className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-start gap-3 rounded-lg border border-black/5 bg-background px-5 py-4 dark:border-white/5"
          >
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-[var(--brand-foreground)]">
              <Check className="size-3" strokeWidth={3} />
            </span>
            <span className="text-sm leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}
