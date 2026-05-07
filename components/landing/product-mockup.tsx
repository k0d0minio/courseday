import { getTranslations } from 'next-intl/server'
import { cn } from '@/lib/utils'

export async function ProductMockup({ className }: { className?: string }) {
  const t = await getTranslations('Platform.landing.showcase')

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-black/5 bg-[var(--surface-soft)] shadow-[0_24px_80px_-40px_rgba(20,60,35,0.35)]',
        'dark:border-white/5 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.6)]',
        className
      )}
      aria-hidden="true"
    >
      {/* Chrome */}
      <div className="flex items-center gap-1.5 border-b border-black/5 bg-black/[0.02] px-4 py-2.5 dark:border-white/5 dark:bg-white/[0.02]">
        <span className="size-2.5 rounded-full bg-red-400/70" />
        <span className="size-2.5 rounded-full bg-yellow-400/70" />
        <span className="size-2.5 rounded-full bg-green-400/70" />
        <span className="text-muted-foreground ml-4 text-[11px] tracking-wide">
          yourclub.courseday.app
        </span>
      </div>

      {/* Body */}
      <div className="grid grid-cols-12 gap-0">
        {/* Sidebar */}
        <div className="col-span-3 hidden border-r border-black/5 bg-black/[0.015] p-4 sm:block dark:border-white/5 dark:bg-white/[0.015]">
          <div className="mb-4 flex items-center gap-2">
            <div className="size-6 rounded-md bg-[var(--brand)]" />
            <div className="bg-foreground/15 h-2.5 w-20 rounded" />
          </div>
          <div className="space-y-2">
            <div className="bg-foreground/10 h-2 w-24 rounded" />
            <div className="bg-foreground/10 h-2 w-16 rounded" />
            <div className="bg-foreground/10 h-2 w-20 rounded" />
          </div>
          <div className="mt-6 space-y-2">
            <div className="bg-foreground/10 h-2 w-14 rounded" />
            <div className="bg-foreground/10 h-2 w-24 rounded" />
          </div>
        </div>

        {/* Main */}
        <div className="col-span-12 p-5 sm:col-span-9 sm:p-7">
          <div className="mb-5 flex items-baseline justify-between">
            <div>
              <div className="font-display text-lg leading-tight font-medium">Today</div>
              <div className="text-muted-foreground text-xs">Wed · April</div>
            </div>
            <div className="flex gap-2">
              <div className="rounded-md bg-[var(--brand)]/10 px-2.5 py-1 text-[11px] font-medium text-[var(--brand)]">
                42 covers
              </div>
              <div className="rounded-md bg-[var(--sand)]/40 px-2.5 py-1 text-[11px] font-medium text-[var(--sand-foreground)]">
                3 groups
              </div>
            </div>
          </div>

          {/* Programme */}
          <div className="mb-4">
            <div className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-widest uppercase">
              {t('programmeTitle')}
            </div>
            <div className="space-y-2">
              <MockRow time="08:30" title="Captain's Shotgun" pill="36 covers" pillTone="brand" />
              <MockRow time="11:00" title="Ladies' Section" pill="14 covers" pillTone="brand" />
              <MockRow time="14:00" title="Corporate Group" pill="24 covers" pillTone="brand" />
            </div>
          </div>

          {/* Reservations + Breakfast */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-widest uppercase">
                {t('reservationsTitle')}
              </div>
              <div className="space-y-2">
                <MockRow time="12:30" title="Dupont" pill="4" pillTone="neutral" />
                <MockRow time="13:00" title="Laurent" pill="2" pillTone="neutral" />
                <MockRow time="19:30" title="Verhaegen" pill="6" pillTone="neutral" />
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-widest uppercase">
                {t('breakfastsTitle')}
              </div>
              <div className="space-y-2">
                <MockRow time="07:30" title="Hotel — Eagles" pill="12" pillTone="sand" />
                <MockRow time="08:00" title="Hotel — Birdies" pill="8" pillTone="sand" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MockRow({
  time,
  title,
  pill,
  pillTone,
}: {
  time: string
  title: string
  pill: string
  pillTone: 'brand' | 'sand' | 'neutral'
}) {
  return (
    <div className="bg-background/60 flex items-center gap-3 rounded-md border border-black/5 px-3 py-2 dark:border-white/5">
      <span className="text-muted-foreground w-12 text-[11px] font-medium tabular-nums">
        {time}
      </span>
      <span className="flex-1 truncate text-[13px]">{title}</span>
      <span
        className={cn(
          'rounded px-2 py-0.5 text-[10px] font-semibold',
          pillTone === 'brand' && 'bg-[var(--brand)]/10 text-[var(--brand)]',
          pillTone === 'sand' && 'bg-[var(--sand)]/40 text-[var(--sand-foreground)]',
          pillTone === 'neutral' && 'bg-foreground/5 text-foreground/70'
        )}
      >
        {pill}
      </span>
    </div>
  )
}
