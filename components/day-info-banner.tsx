'use client'

import { useCallback, useRef, useState } from 'react'
import { ClipboardCopy, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { generateDailyBrief } from '@/app/actions/daily-brief'
import { formatDailyBriefMarkdown } from '@/lib/daily-brief-format'
import type { WeatherData } from '@/app/actions/weather'
import type { DailyBriefRecord } from '@/types/daily-brief'

const REGENERATE_DEBOUNCE_MS = 2000

type Props = {
  weather: WeatherData | null
  showWeather: boolean
  initialBrief: DailyBriefRecord | null
  showBrief: boolean
  dateIso: string
  dayId: string
  isEditor: boolean
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <div>
      <div className="text-foreground mb-1 font-medium">{title}</div>
      <ul className="text-muted-foreground list-disc space-y-0.5 pl-5">
        {items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </div>
  )
}

function AllergenBlock({
  rollup,
  t,
}: {
  rollup: DailyBriefRecord['content']['allergenRollup']
  t: ReturnType<typeof useTranslations<'Tenant.dailyBrief'>>
}) {
  if (rollup.length === 0) return null
  return (
    <div>
      <div className="text-foreground mb-1 font-medium">{t('allergens')}</div>
      <ul className="text-muted-foreground list-disc space-y-0.5 pl-5">
        {rollup.map((a) => (
          <li key={a.code}>
            <span className="font-mono text-xs">{a.code}</span>
            {a.inActivities ? ` · ${t('srcActivity', { n: a.inActivities })}` : ''}
            {a.inReservations ? ` · ${t('srcReservation', { n: a.inReservations })}` : ''}
            {a.inBreakfast ? ` · ${t('srcBreakfast', { n: a.inBreakfast })}` : ''}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function DayInfoBanner({
  weather,
  showWeather,
  initialBrief,
  showBrief,
  dateIso,
  isEditor,
}: Props) {
  const t = useTranslations('Tenant.dailyBrief')
  const router = useRouter()
  const [brief, setBrief] = useState<DailyBriefRecord | null>(initialBrief)
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const lastGenerateAt = useRef(0)

  const hasWeather = showWeather && weather !== null
  const hasBrief = brief !== null

  const runGenerate = useCallback(async () => {
    const now = Date.now()
    if (now - lastGenerateAt.current < REGENERATE_DEBOUNCE_MS) {
      toast.message(t('debounced'))
      return
    }
    lastGenerateAt.current = now
    setLoading(true)
    try {
      const result = await generateDailyBrief(dateIso)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setBrief(result.data)
      toast.success(t('generated'))
      router.refresh()
    } finally {
      setLoading(false)
    }
  }, [dateIso, router, t])

  const copyMarkdown = useCallback(() => {
    if (!brief) return
    const md = formatDailyBriefMarkdown(brief.content)
    void navigator.clipboard.writeText(md).then(
      () => toast.success(t('copied')),
      () => toast.error(t('copyFailed'))
    )
  }, [brief, t])

  if (!hasWeather && !showBrief) return null

  return (
    <>
      <div className="bg-muted/30 flex items-center gap-3 rounded-lg border px-4 py-3">
        {hasWeather && (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="shrink-0 text-3xl leading-none" aria-hidden="true">
              {weather!.emoji}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">{weather!.description}</p>
              <p className="text-muted-foreground text-xs">
                {weather!.tempMax}° / {weather!.tempMin}°C
                {weather!.precipitationProbability > 0 && (
                  <> · {weather!.precipitationProbability}% rain</>
                )}
              </p>
            </div>
          </div>
        )}

        {showBrief && hasBrief && (
          <div className={`min-w-0 flex-1 ${hasWeather ? 'border-l pl-3' : ''}`}>
            <p className="truncate text-sm font-medium">{brief.content.headline}</p>
            <p className="text-muted-foreground line-clamp-1 text-xs">{brief.content.summary}</p>
          </div>
        )}

        {showBrief && !hasWeather && !hasBrief && <div className="flex-1" />}

        {showBrief && isEditor && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground shrink-0"
            onClick={() => setDialogOpen(true)}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {showBrief && isEditor && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                {t('title')}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <p className="rounded-md border border-amber-200/60 bg-amber-50 px-2.5 py-2 text-xs text-amber-800/90 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200/90">
                {t('costWarning')}
              </p>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void runGenerate()}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-1 h-4 w-4" />
                  )}
                  {hasBrief ? t('regenerate') : t('generate')}
                </Button>
                {hasBrief && (
                  <Button type="button" variant="outline" size="sm" onClick={copyMarkdown}>
                    <ClipboardCopy className="mr-1 h-4 w-4" />
                    {t('copy')}
                  </Button>
                )}
              </div>

              {loading && !hasBrief && (
                <p className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('generating')}
                </p>
              )}

              {!hasBrief && !loading && (
                <p className="text-muted-foreground text-sm">{t('emptyEditor')}</p>
              )}

              {brief && (
                <div className="space-y-3">
                  <div>
                    <p className="text-base leading-snug font-semibold">{brief.content.headline}</p>
                    <p className="text-muted-foreground mt-2 text-sm whitespace-pre-wrap">
                      {brief.content.summary}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="bg-muted/50 rounded-md py-2">
                      <div className="text-muted-foreground text-xs">{t('coversBreakfast')}</div>
                      <div className="font-semibold tabular-nums">
                        {brief.content.covers.breakfast}
                      </div>
                    </div>
                    <div className="bg-muted/50 rounded-md py-2">
                      <div className="text-muted-foreground text-xs">{t('coversActivities')}</div>
                      <div className="font-semibold tabular-nums">
                        {brief.content.covers.activities}
                      </div>
                    </div>
                    <div className="bg-muted/50 rounded-md py-2">
                      <div className="text-muted-foreground text-xs">{t('coversReservations')}</div>
                      <div className="font-semibold tabular-nums">
                        {brief.content.covers.reservations}
                      </div>
                    </div>
                  </div>

                  <details className="group text-sm">
                    <summary className="text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center gap-1 py-1 font-medium [&::-webkit-details-marker]:hidden">
                      <span className="group-open:hidden">{t('more')}</span>
                      <span className="hidden group-open:inline">{t('less')}</span>
                    </summary>
                    <div className="space-y-3 pt-2">
                      <ListBlock title={t('vip')} items={brief.content.vipNotes} />
                      <AllergenBlock rollup={brief.content.allergenRollup} t={t} />
                      <ListBlock title={t('risks')} items={brief.content.risks} />
                      <ListBlock title={t('actions')} items={brief.content.suggestedActions} />
                      <p className="text-muted-foreground pt-1 text-xs">
                        {t('meta', {
                          time: new Date(brief.generated_at).toLocaleString(),
                          model: brief.model,
                        })}
                      </p>
                    </div>
                  </details>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
