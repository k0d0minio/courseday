'use client'
// fmt
import { useCallback, useEffect, useRef, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ClipboardCopy, Loader2, Pencil, RefreshCw, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { experimental_useObject as useObject } from '@ai-sdk/react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatDailyBriefMarkdown } from '@/lib/daily-brief-format'
import { dailyBriefContentSchema } from '@/lib/daily-brief-schema'
import { updateBriefOverride } from '@/app/actions/daily-brief'
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
  /**
   * Display name of the editor who last overrode the headline / summary
   * (resolved server-side from membership). Used in the "edited by …"
   * tooltip on the inline-edit badge.
   */
  overrideAuthorName?: string | null
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
  briefStale,
  briefIsEmpty,
  dayHasContent,
  dateIso,
  dayId,
  isEditor,
  overrideAuthorName = null,
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
          // A fresh AI generation discards any prior overrides — the user
          // is prompted to confirm before runGenerate is called.
          headline_override: null,
          summary_override: null,
          overridden_by: null,
          overridden_at: null,
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
    // Editor has manually edited the headline/summary; warn before discarding.
    const hasOverride = Boolean(brief?.headline_override || brief?.summary_override)
    if (hasOverride && !window.confirm(t('regenerateDiscardWarning'))) return
    lastGenerateAt.current = now
    submit({ dateIso })
  }, [brief, dateIso, submit, t])

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

  const saveOverride = useCallback(
    async (overrides: { headline?: string; summary?: string }) => {
      const result = await updateBriefOverride(dateIso, overrides)
      if (result.success) {
        setBrief(result.data)
        toast.success(t('editSaved'))
        router.refresh()
        return true
      }
      toast.error(result.error || t('editSaveFailed'))
      return false
    },
    [dateIso, router, t]
  )

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
            <p className="truncate text-sm font-medium">
              {brief.headline_override?.trim() || brief.content.headline}
            </p>
            <p className="text-muted-foreground line-clamp-1 text-xs">
              {brief.summary_override?.trim() || brief.content.summary}
            </p>
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
              {hasBrief && !isLoading && (
                <SettledBriefContent
                  brief={brief}
                  t={t}
                  isEditor={isEditor}
                  overrideAuthorName={overrideAuthorName}
                  onSaveOverride={saveOverride}
                />
              )}
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
    </div>
  )
}

function SettledBriefContent({
  brief,
  t,
  isEditor,
  overrideAuthorName,
  onSaveOverride,
}: {
  brief: DailyBriefRecord
  t: ReturnType<typeof useTranslations<'Tenant.dailyBrief'>>
  isEditor: boolean
  overrideAuthorName: string | null
  onSaveOverride: (overrides: { headline?: string; summary?: string }) => Promise<boolean>
}) {
  const headlineDisplay = brief.headline_override?.trim() || brief.content.headline
  const summaryDisplay = brief.summary_override?.trim() || brief.content.summary
  const hasOverride = Boolean(brief.headline_override || brief.summary_override)

  return (
    <div className="space-y-3">
      <div>
        <InlineEditableText
          value={headlineDisplay}
          isEditor={isEditor}
          multiline={false}
          ariaLabel={t('editHeadlineLabel')}
          textClassName="text-base leading-snug font-semibold"
          onSave={(next) => onSaveOverride({ headline: next })}
        />
        <div className="mt-2">
          <InlineEditableText
            value={summaryDisplay}
            isEditor={isEditor}
            multiline
            ariaLabel={t('editSummaryLabel')}
            textClassName="text-muted-foreground text-sm whitespace-pre-wrap"
            onSave={(next) => onSaveOverride({ summary: next })}
          />
        </div>
        {hasOverride && (
          <BriefEditedBadge
            authorName={overrideAuthorName}
            overriddenAt={brief.overridden_at}
            t={t}
          />
        )}
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
      {brief.generated_at && (
        <p className="text-muted-foreground text-xs">
          {t('updatedAt', {
            time: formatDistanceToNow(new Date(brief.generated_at), { addSuffix: true }),
          })}
        </p>
      )}
    </div>
  )
}

/**
 * Read-only display by default; reveals a pencil affordance on hover/focus
 * for editors. Click the pencil (or the text itself) → textarea + save/cancel
 * footer with keyboard shortcuts. Esc cancels and reverts; Cmd/Ctrl+Enter
 * saves. Single-line mode disables Enter line breaks (pressing Enter saves).
 */
function InlineEditableText({
  value,
  isEditor,
  multiline,
  ariaLabel,
  textClassName,
  onSave,
}: {
  value: string
  isEditor: boolean
  multiline: boolean
  ariaLabel: string
  textClassName: string
  onSave: (next: string) => Promise<boolean>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (editing) {
      setDraft(value)
      // Defer focus so the element is in the DOM
      requestAnimationFrame(() => {
        textareaRef.current?.focus()
        textareaRef.current?.select()
      })
    }
  }, [editing, value])

  const cancel = useCallback(() => {
    setDraft(value)
    setEditing(false)
  }, [value])

  const commit = useCallback(async () => {
    if (saving) return
    if (draft.trim() === value.trim()) {
      setEditing(false)
      return
    }
    setSaving(true)
    const ok = await onSave(draft)
    setSaving(false)
    if (ok) setEditing(false)
  }, [draft, onSave, saving, value])

  if (!isEditor) {
    return <p className={textClassName}>{value}</p>
  }

  if (!editing) {
    return (
      <div className="group relative flex items-start gap-2">
        <p className={`${textClassName} flex-1`}>{value}</p>
        <Button
          type="button"
          size="iconXs"
          variant="ghost"
          aria-label={ariaLabel}
          title={ariaLabel}
          className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          onClick={() => setEditing(true)}
        >
          <Pencil className="h-3 w-3" />
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <textarea
        ref={textareaRef}
        value={draft}
        rows={multiline ? 4 : 1}
        aria-label={ariaLabel}
        disabled={saving}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault()
            cancel()
            return
          }
          if (e.key === 'Enter') {
            if (!multiline || e.metaKey || e.ctrlKey) {
              e.preventDefault()
              void commit()
            }
          }
        }}
        className={`${textClassName} bg-background w-full resize-y rounded-md border px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50`}
      />
      <div className="text-muted-foreground flex items-center justify-end gap-2 text-xs">
        <span className="mr-auto">
          {multiline ? 'Esc cancels · ⌘/Ctrl+Enter saves' : 'Esc cancels · Enter saves'}
        </span>
        <Button type="button" size="xs" variant="ghost" onClick={cancel} disabled={saving}>
          Cancel
        </Button>
        <Button
          type="button"
          size="xs"
          variant="default"
          onClick={() => void commit()}
          disabled={saving}
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
        </Button>
      </div>
    </div>
  )
}

function BriefEditedBadge({
  authorName,
  overriddenAt,
  t,
}: {
  authorName: string | null
  overriddenAt: string | null
  t: ReturnType<typeof useTranslations<'Tenant.dailyBrief'>>
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
