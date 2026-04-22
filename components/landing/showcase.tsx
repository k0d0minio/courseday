import { getTranslations } from 'next-intl/server';
import { Calendar, Utensils, Coffee, Users } from 'lucide-react';
import { Eyebrow, SectionShell, SectionTitle } from '@/components/landing/section-shell';
import { ProductMockup } from '@/components/landing/product-mockup';

export async function Showcase() {
  const t = await getTranslations('Platform.landing.showcase');

  const callouts = [
    { icon: Calendar, title: t('programmeTitle'), body: t('programmeBody') },
    { icon: Utensils, title: t('reservationsTitle'), body: t('reservationsBody') },
    { icon: Coffee, title: t('breakfastsTitle'), body: t('breakfastsBody') },
    { icon: Users, title: t('coversTitle'), body: t('coversBody') },
  ];

  return (
    <SectionShell>
      <div className="flex flex-col gap-4">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <SectionTitle>{t('title')}</SectionTitle>
        <p className="max-w-2xl text-base text-muted-foreground leading-relaxed">{t('body')}</p>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center">
        <ProductMockup />
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-1">
          {callouts.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
                <Icon className="size-5" />
              </span>
              <div>
                <div className="font-display text-lg font-medium leading-snug">{title}</div>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </SectionShell>
  );
}
