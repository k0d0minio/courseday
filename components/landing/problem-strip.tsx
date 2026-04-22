import { getTranslations } from 'next-intl/server';
import { Eyebrow, SectionShell, SectionTitle } from '@/components/landing/section-shell';

export async function ProblemStrip() {
  const t = await getTranslations('Platform.landing.problem');

  const items = [
    { title: t('pain1Title'), body: t('pain1Body') },
    { title: t('pain2Title'), body: t('pain2Body') },
    { title: t('pain3Title'), body: t('pain3Body') },
  ];

  return (
    <SectionShell tone="soft">
      <div className="flex flex-col gap-4">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <SectionTitle>{t('title')}</SectionTitle>
      </div>
      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {items.map((it) => (
          <article
            key={it.title}
            className="rounded-xl border border-black/5 bg-background/70 p-6 backdrop-blur-sm dark:border-white/5"
          >
            <h3 className="font-display text-xl font-medium leading-snug">{it.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{it.body}</p>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}
