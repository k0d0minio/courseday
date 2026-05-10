'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ClipboardCopy, Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { experimental_useObject as useObject } from '@ai-sdk/react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatDailyBriefMarkdown } from '@/lib/daily-brief-format'
import { dailyBriefContentSchema } from '@/lib/daily-brief-schema'
import type { WeatherData } from '@/app/actions/weather'
import type { DailyBriefContent, DailyBriefRecord } from '@/types/daily-brief'

const REGENERATE_DEBOUNCE_MS = 2000

type Props = {
  weather: WeatherData | null
  showWeather: boolean
  initialBrief: DailyBriefRecord | null
  showBrief: boolean
  briefStale: boolean
  briefIsEmpty: boolean
  /**
   * True when the day has at least one activity / reservation / breakfast.
   * Combined with `isEditor`, this triggers a one-shot client-side brief
   * generation when no brief exists yet — replaces the previous blocking
   * `ensureDailyBrief` call on the server render path.
   */
  dayHasContent: boolean
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

/** Fades in a section when it first receives content during streaming. */
function StreamSection({ show, children }: { show: boolean; children: React.ReactNode }) {
  if (!show) return null
  return <div className="animate-in fade-in duration-300">{children}</div>
}

export function DayInfoBanner({
  weather,
  showWeather,
  initialBrief,
  showBrief,
  briefStale,
  briefIsEmpty,
  dayHasContent,
  dateIso,
  dayId,
  isEditor,
}: Props) {
  const t = useTranslations('Tenant.dailyBrief')
  const router = useRouter()
  const [brief, setBrief] = useState<DailyBriefRecord | null>(initialBrief)
  const [stale, setStale] = useState(briefStale)
  const [dialogOpen, setDialogOpen] = useState(false)
  const lastGenerateAt = useRef(0)
  const autoFiredFor = useRef<string | null>(null)

  const {
    object: streamedObject,
    submit,
    isLoading,
    error: streamError,
  } = useObject({
    api: '/api/daily-brief/stream',
    schema: dailyBriefContentSchema,
    onFinish({ object }: { object: DailyBriefContent | undefined }) {
      if (object) {
        setBrief({
          // id and generated_at will be refreshed from server; use placeholders
          id: '',
          content: {
            headline: object.headline ?? '',
            summary: object.summary ?? '',
            covers: object.covers ?? { breakfast: 0, activities: 0, reservations: 0 },
            vipNotes: object.vipNotes ?? [],
            allergenRollup: object.allergenRollup ?? [],
            risks: object.risks ?? [],
            suggestedActions: object.suggestedActions ?? [],
          },
          generated_at: new Date().toISOString(),
          model: '',
          prompt_version: 'v1',
        })
        setStale(false)
        toast.success(t('generated'))
        // Refresh to hydrate from DB (gets real id, model, generated_at)
        router.refresh()
      }
    },
    onError(err: Error) {
      toast.error(err.message || 'Brief generation failed.')
    },
  })

  useEffect(() => {
    setBrief(initialBrief)
    setStale(briefStale)
  }, [initialBrief, briefStale, dayId])

  const runGenerate = useCallback(() => {
    const now = Date.now()
    if (now - lastGenerateAt.current < REGENERATE_DEBOUNCE_MS) {
      toast.message(t('debounced'))
      return
    }
    lastGenerateAt.current = now
    submit({ dateIso })
  }, [dateIso, submit, t])

  const copyMarkdown = useCallback(() => {
    if (!brief) return
    const md = formatDailyBriefMarkdown(brief.content)
    void navigator.clipboard.writeText(md).then(
      () => toast.success(t('copied')),
      () => toast.error(t('copyFailed'))
    )
  }, [brief, t])

  // Auto-generate when the page loads with no brief yet (editor only).
  useEffect(() => {
    if (!showBrief || !isEditor) return
    if (brief) return
    if (!dayHasContent) return
    if (isLoading) return
    if (autoFiredFor.current === dayId) return
    autoFiredFor.current = dayId
    runGenerate()
  }, [showBrief, isEditor, brief, dayHasContent, isLoading, dayId, runGenerate])

  // Dismiss stream error on re-render if brief was set
  useEffect(() => {
    if (streamError) toast.error(streamError.message || 'Brief generation failed.')
  }, [streamError, t])

  const hasWeather = showWeather && weather !== null
  const hasBrief = brief !== null
  // Show streaming partial content while loading and no settled brief
  const streaming = isLoading && !hasBrief
  const streamedHeadline = streamedObject?.headline
  const streamedSummary = streamedObject?.summary

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
          <div
            className={`min-w-0 flex-1 ${hasWeather ? 'border-l pl-3' : ''}`}
            onClick={() => setDialogOpen(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setDialogOpen(true)}
          >
            <p className="truncate text-sm font-medium">{brief.content.headline}</p>
            <p className="text-muted-foreground line-clamp-1 text-xs">{brief.content.summary}</p>
          </div>
        )}

        {showBrief && streaming && (
          <div
            className={`min-w-0 flex-1 ${hasWeather ? 'border-l pl-3' : ''}`}
            onClick={() => setDialogOpen(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setDialogOpen(true)}
          >
            {streamedHeadline ? (
              <p className="animate-in fade-in truncate text-sm font-medium duration-300">
                {streamedHeadline}
              </p>
            ) : (
              <div className="bg-muted h-4 w-40 animate-pulse rounded" />
            )}
            {streamedSummary ? (
              <p className="text-muted-foreground animate-in fade-in line-clamp-1 text-xs duration-300">
                {streamedSummary}
              </p>
            ) : (
              <div className="bg-muted mt-1 h-3 w-24 animate-pulse rounded" />
            )}
          </div>
        )}

        {showBrief && !hasBrief && !streaming && !briefIsEmpty && !hasWeather && (
          <div className="flex-1" />
        )}

        {showBrief && briefIsEmpty && (
          <div className={`min-w-0 flex-1 ${hasWeather ? 'border-l pl-3' : ''}`}>
            <p className="text-muted-foreground text-sm">{t('empty')}</p>
          </div>
        )}

        {showBrief && (hasBrief || streaming) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground shrink-0"
            onClick={() => setDialogOpen(true)}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : stale ? (
              <RefreshCw className="h-4 w-4 text-amber-500" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {showBrief && (hasBrief || streaming) && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                {t('title')}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {stale && !isLoading && (
                <p className="rounded-md border border-amber-200/60 bg-amber-50 px-2.5 py-2 text-xs text-amber-800/90 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200/90">
                  {t('stale')}
                </p>
              )}

              <div className="flex items-center gap-2">
                {hasBrief && (
                  <Button type="button" variant="outline" size="sm" onClick={copyMarkdown}>
                    <ClipboardCopy className="mr-1 h-4 w-4" />
                    {t('copy')}
                  </Button>
                )}
                {isEditor && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={runGenerate}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-1 h-4 w-4" />
                    )}
                    {t('regenerate')}
                  </Button>
                )}
              </div>

              {/* Progressive streaming content */}
              {isLoading && <StreamingBriefContent object={streamedObject} t={t} />}

              {/* Settled brief */}
              {hasBrief && !isLoading && <SettledBriefContent brief={brief} t={t} />}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

type StreamPartial =
  | {
      headline?: string
      summary?: string
      covers?: { breakfast?: number; activities?: number; reservations?: number }
    }
  | undefined

function StreamingBriefContent({
  object,
  t,
}: {
  object: StreamPartial
  t: ReturnType<typeof useTranslations<'Tenant.dailyBrief'>>
}) {
  const covers = object?.covers
  return (
    <div className="space-y-3">
      {object?.headline ? (
        <p className="animate-in fade-in text-base leading-snug font-semibold duration-300">
          {object.headline}
        </p>
      ) : (
        <div className="bg-muted h-5 w-3/4 animate-pulse rounded" />
      )}

      {object?.summary ? (
        <p className="text-muted-foreground animate-in fade-in text-sm whitespace-pre-wrap duration-300">
          {object.summary}
        </p>
      ) : (
        <div className="space-y-1">
          <div className="bg-muted h-4 w-full animate-pulse rounded" />
          <div className="bg-muted h-4 w-5/6 animate-pulse rounded" />
        </div>
      )}

      <StreamSection show={Boolean(covers)}>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="bg-muted/50 rounded-md py-2">
            <div className="text-muted-foreground text-xs">{t('coversBreakfast')}</div>
            <div className="font-semibold tabular-nums">{covers?.breakfast ?? '—'}</div>
          </div>
          <div className="bg-muted/50 rounded-md py-2">
            <div className="text-muted-foreground text-xs">{t('coversActivities')}</div>
            <div className="font-semibold tabular-nums">{covers?.activities ?? '—'}</div>
          </div>
          <div className="bg-muted/50 rounded-md py-2">
            <div className="text-muted-foreground text-xs">{t('coversReservations')}</div>
            <div className="font-semibold tabular-nums">{covers?.reservations ?? '—'}</div>
          </div>
        </div>
      </StreamSection>
    </div>
  )
}

function SettledBriefContent({
  brief,
  t,
}: {
  brief: DailyBriefRecord
  t: ReturnType<typeof useTranslations<'Tenant.dailyBrief'>>
}) {
  return (
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
          <div className="font-semibold tabular-nums">{brief.content.covers.breakfast}</div>
        </div>
        <div className="bg-muted/50 rounded-md py-2">
          <div className="text-muted-foreground text-xs">{t('coversActivities')}</div>
          <div className="font-semibold tabular-nums">{brief.content.covers.activities}</div>
        </div>
        <div className="bg-muted/50 rounded-md py-2">
          <div className="text-muted-foreground text-xs">{t('coversReservations')}</div>
          <div className="font-semibold tabular-nums">{brief.content.covers.reservations}</div>
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
          {brief.generated_at && brief.model && (
            <p className="text-muted-foreground pt-1 text-xs">
              {t('meta', {
                time: new Date(brief.generated_at).toLocaleString(),
                model: brief.model,
              })}
            </p>
          )}
        </div>
      </details>
    </div>
  )
}
