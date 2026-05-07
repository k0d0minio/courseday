import { getTranslations } from 'next-intl/server'
import { ClipboardList, ChefHat, Eye } from 'lucide-react'
import { Eyebrow, SectionShell, SectionTitle } from '@/components/landing/section-shell'

export async function RolesSection() {
  const t = await getTranslations('Platform.landing.roles')

  const roles = [
    { icon: ClipboardList, title: t('receptionTitle'), body: t('receptionBody') },
    { icon: ChefHat, title: t('fnbTitle'), body: t('fnbBody') },
    { icon: Eye, title: t('floorTitle'), body: t('floorBody') },
  ]

  return (
    <SectionShell tone="soft">
      <div className="flex flex-col gap-4">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <SectionTitle>{t('title')}</SectionTitle>
      </div>
      <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
        {roles.map(({ icon: Icon, title, body }) => (
          <article
            key={title}
            className="bg-background rounded-xl border border-black/5 p-7 dark:border-white/5"
          >
            <span className="flex size-11 items-center justify-center rounded-lg bg-[var(--brand)] text-[var(--brand-foreground)]">
              <Icon className="size-5" />
            </span>
            <h3 className="font-display mt-5 text-xl font-medium">{title}</h3>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{body}</p>
          </article>
        ))}
      </div>
    </SectionShell>
  )
}
