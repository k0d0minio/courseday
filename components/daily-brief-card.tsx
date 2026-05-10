'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { ClipboardCopy, Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { experimental_useObject as useObject } from '@ai-sdk/react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { dailyBriefContentSchema } from '@/lib/daily-brief-schema'
import type { DailyBriefContent, DailyBriefRecord, RegenerableSection } from '@/types/daily-brief'
import { formatDailyBriefMarkdown } from '@/lib/daily-brief-format'
import { regenerateBriefSection } from '@/app/actions/daily-brief'

const REGENERATE_DEBOUNCE_MS = 2000

type Props = {
  dateIso: string
  dayId: string
  initialBrief: DailyBriefRecord | null
  isEditor: boolean
  briefStale?: boolean
  briefIsEmpty?: boolean
  /**
   * Display name of the editor who last overrode the headline / summary —
   * resolved server-side from membership. Used for the "edited by …"
   * tooltip; when null we still show the badge but with a generic label.
   */
  overrideAuthorName?: string | null
}

export function DailyBriefCard({
  dateIso,
  dayId,
  initialBrief,
  isEditor,
  briefStale: initialBriefStale = false,
  briefIsEmpty = false,
  overrideAuthorName = null,
}: Props) {
  const t = useTranslations('Tenant.dailyBrief')
  const router = useRouter()
  const [brief, setBrief] = useState<DailyBriefRecord | null>(initialBrief)
  const [stale, setStale] = useState(initialBriefStale)
  const lastRegenerateAt = useRef(0)
  const [regeneratingSection, setRegeneratingSection] = useState<RegenerableSection | null>(null)
  const [sectionErrors, setSectionErrors] = useState<Partial<Record<RegenerableSection, string>>>(
    {}
  )

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
          headline_override: null,
          summary_override: null,
          overridden_by: null,
          overridden_at: null,
        })
        setStale(false)
        toast.success(t('generated'))
        router.refresh()
      }
    },
    onError(err: Error) {
      toast.error(err.message || 'Brief generation failed.')
    },
  })

  useEffect(() => {
    setBrief(initialBrief)
    setStale(initialBriefStale)
  }, [initialBrief, initialBriefStale, dayId])

  useEffect(() => {
    if (streamError) toast.error(streamError.message || 'Brief generation failed.')
  }, [streamError])

  const runRegenerate = useCallback(() => {
    const now = Date.now()
    if (now - lastRegenerateAt.current < REGENERATE_DEBOUNCE_MS) {
      toast.message(t('debounced'))
      return
    }
    lastRegenerateAt.current = now
    submit({ dateIso })
  }, [dateIso, submit, t])

  const copyMarkdown = useCallback(() => {
    if (!brief) return
    const md = formatDailyBriefMarkdown(brief.content, {
      headline_override: brief.headline_override,
      summary_override: brief.summary_override,
    })
    void navigator.clipboard.writeText(md).then(
      () => toast.success(t('copied')),
      () => toast.error(t('copyFailed'))
    )
  }, [brief, t])

  const runSectionRegenerate = useCallback(
    (section: RegenerableSection) => {
      if (regeneratingSection) return
      setRegeneratingSection(section)
      setSectionErrors((prev) => {
        const next = { ...prev }
        delete next[section]
        return next
      })
      void regenerateBriefSection(dateIso, section).then((result) => {
        if (result.success) {
          setBrief(result.data)
          setStale(false)
          toast.success(t('sectionRegenerated'))
          router.refresh()
        } else {
          setSectionErrors((prev) => ({ ...prev, [section]: result.error }))
          toast.error(result.error || t('sectionRegenFailed'))
        }
        setRegeneratingSection(null)
      })
    },
    [dateIso, regeneratingSection, router, t]
  )

  const hasBrief = brief !== null
  const streaming = isLoading && !hasBrief
  const covers = streamedObject?.covers

  return (
    <section className="bg-card text-card-foreground overflow-hidden rounded-xl border shadow-sm">
      <div className="bg-muted/30 flex flex-wrap items-start justify-between gap-3 border-b p-4">
        <div className="min-w-0 space-y-1">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            {t('title')}
          </h2>
          <p className="text-muted-foreground text-xs">{t('subtitle')}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {hasBrief && (
            <Button type="button" variant="outline" size="sm" onClick={copyMarkdown}>
              <ClipboardCopy className="mr-1 h-4 w-4" />
              {t('copy')}
            </Button>
          )}
          {isEditor && hasBrief && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={runRegenerate}
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
      </div>

      <div className="space-y-3 p-4">
        {stale && isEditor && !isLoading && (
          <div className="flex items-center justify-between gap-2 rounded-md border border-amber-200/60 bg-amber-50 px-2.5 py-2 dark:border-amber-900/50 dark:bg-amber-950/40">
            <p className="text-xs text-amber-800/90 dark:text-amber-200/90">{t('stale')}</p>
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={runRegenerate}
              disabled={isLoading}
              className="shrink-0"
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              {t('regenerate')}
            </Button>
          </div>
        )}

        {briefIsEmpty && <p className="text-muted-foreground text-sm">{t('empty')}</p>}

        {!hasBrief && !briefIsEmpty && !isLoading && (
          <p className="text-muted-foreground text-sm">{t('emptyViewer')}</p>
        )}

        {/* Progressive streaming skeleton */}
        {streaming && (
          <div className="space-y-3" role="status" aria-live="polite" aria-label={t('generating')}>
            {streamedObject?.headline ? (
              <p className="animate-in fade-in text-base leading-snug font-semibold duration-300">
                {streamedObject.headline}
              </p>
            ) : (
              <Skeleton className="h-5 w-3/4" />
            )}

            {streamedObject?.summary ? (
              <p className="text-muted-foreground animate-in fade-in text-sm whitespace-pre-wrap duration-300">
                {streamedObject.summary}
              </p>
            ) : (
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            )}

            {covers ? (
              <div className="animate-in fade-in grid grid-cols-3 gap-2 text-center text-sm duration-300">
                <div className="bg-muted/50 rounded-md py-2">
                  <div className="text-muted-foreground text-xs">{t('coversBreakfast')}</div>
                  <div className="font-semibold tabular-nums">{covers.breakfast ?? '—'}</div>
                </div>
                <div className="bg-muted/50 rounded-md py-2">
                  <div className="text-muted-foreground text-xs">{t('coversActivities')}</div>
                  <div className="font-semibold tabular-nums">{covers.activities ?? '—'}</div>
                </div>
                <div className="bg-muted/50 rounded-md py-2">
                  <div className="text-muted-foreground text-xs">{t('coversReservations')}</div>
                  <div className="font-semibold tabular-nums">{covers.reservations ?? '—'}</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-12 rounded-md" />
                <Skeleton className="h-12 rounded-md" />
                <Skeleton className="h-12 rounded-md" />
              </div>
            )}

            <div className="space-y-1.5 pt-1">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-3 w-11/12" />
              <Skeleton className="h-3 w-10/12" />
              <Skeleton className="h-3 w-9/12" />
            </div>
          </div>
        )}

        {hasBrief && (
          <div className="space-y-3">
            <div>
              <p className="text-base leading-snug font-semibold">
                {brief.headline_override?.trim() || brief.content.headline}
              </p>
              <p className="text-muted-foreground mt-2 text-sm whitespace-pre-wrap">
                {brief.summary_override?.trim() || brief.content.summary}
              </p>
              {(brief.headline_override || brief.summary_override) && (
                <EditedBadge
                  authorName={overrideAuthorName}
                  overriddenAt={brief.overridden_at}
                  t={t}
                />
              )}
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
                <ListBlock
                  title={t('vip')}
                  items={brief.content.vipNotes}
                  onRegenerate={isEditor ? () => runSectionRegenerate('vipNotes') : undefined}
                  regenerateLabel={isEditor ? t('regenerateVip') : undefined}
                  isRegenerating={regeneratingSection === 'vipNotes'}
                  regenerateDisabled={!isEditor || regeneratingSection !== null}
                  errorMessage={sectionErrors.vipNotes}
                />
                <AllergenBlock rollup={brief.content.allergenRollup} t={t} />
                <ListBlock
                  title={t('risks')}
                  items={brief.content.risks}
                  onRegenerate={isEditor ? () => runSectionRegenerate('risks') : undefined}
                  regenerateLabel={isEditor ? t('regenerateRisks') : undefined}
                  isRegenerating={regeneratingSection === 'risks'}
                  regenerateDisabled={!isEditor || regeneratingSection !== null}
                  errorMessage={sectionErrors.risks}
                />
                <ListBlock
                  title={t('actions')}
                  items={brief.content.suggestedActions}
                  onRegenerate={
                    isEditor ? () => runSectionRegenerate('suggestedActions') : undefined
                  }
                  regenerateLabel={isEditor ? t('regenerateActions') : undefined}
                  isRegenerating={regeneratingSection === 'suggestedActions'}
                  regenerateDisabled={!isEditor || regeneratingSection !== null}
                  errorMessage={sectionErrors.suggestedActions}
                />
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
            {brief.generated_at && (
              <p className="text-muted-foreground text-xs">
                {t('updatedAt', {
                  time: formatDistanceToNow(new Date(brief.generated_at), { addSuffix: true }),
                })}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

function ListBlock({
  title,
  items,
  onRegenerate,
  regenerateLabel,
  regenerateDisabled = false,
  isRegenerating = false,
  errorMessage,
}: {
  title: string
  items: string[]
  onRegenerate?: (() => void) | undefined
  regenerateLabel?: string | undefined
  regenerateDisabled?: boolean
  isRegenerating?: boolean
  errorMessage?: string | undefined
}) {
  if (items.length === 0 && !onRegenerate) return null
  return (
    <div>
      <div className="text-foreground mb-1 flex items-center gap-1 font-medium">
        <span>{title}</span>
        {onRegenerate && (
          <Button
            type="button"
            size="iconXxs"
            variant="ghost"
            onClick={onRegenerate}
            disabled={regenerateDisabled || isRegenerating}
            aria-label={regenerateLabel ?? title}
            title={regenerateLabel ?? title}
          >
            {isRegenerating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>
      {items.length > 0 && (
        <ul
          className={`text-muted-foreground list-disc space-y-0.5 pl-5 transition-opacity ${
            isRegenerating ? 'opacity-50' : ''
          }`}
        >
          {items.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      )}
      {errorMessage && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errorMessage}</p>
      )}
    </div>
  )
}

function EditedBadge({
  authorName,
  overriddenAt,
  t,
}: {
  authorName: string | null
  overriddenAt: string | null
  t: (key: string, values?: Record<string, string | number>) => string
}) {
  const tooltip = authorName
    ? overriddenAt
      ? t('editedByAt', { name: authorName, time: new Date(overriddenAt).toLocaleString() })
      : t('editedBy', { name: authorName })
    : t('editedBadge')
  return (
    <span
      className="bg-muted text-muted-foreground mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
      title={tooltip}
    >
      {t('edited')}
    </span>
  )
}

function AllergenBlock({
  rollup,
  t,
}: {
  rollup: DailyBriefRecord['content']['allergenRollup']
  t: (key: string, values?: Record<string, string | number>) => string
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
