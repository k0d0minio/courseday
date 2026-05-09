'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { ClipboardCopy, Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { generateDailyBrief, regenerateBriefSection } from '@/app/actions/daily-brief'
import type { BriefSection, DailyBriefRecord } from '@/types/daily-brief'
import { formatDailyBriefMarkdown } from '@/lib/daily-brief-format'

const REGENERATE_DEBOUNCE_MS = 2000

type Props = {
  dateIso: string
  dayId: string
  initialBrief: DailyBriefRecord | null
  isEditor: boolean
  briefStale?: boolean
  briefIsEmpty?: boolean
}

type SectionState = {
  loading: boolean
  error: string | null
}

const REGEN_SECTIONS: BriefSection[] = ['vipNotes', 'risks', 'suggestedActions']

function initialSectionState(): Record<BriefSection, SectionState> {
  return {
    vipNotes: { loading: false, error: null },
    risks: { loading: false, error: null },
    suggestedActions: { loading: false, error: null },
  }
}

export function DailyBriefCard({
  dateIso,
  dayId,
  initialBrief,
  isEditor,
  briefStale: initialBriefStale = false,
  briefIsEmpty = false,
}: Props) {
  const t = useTranslations('Tenant.dailyBrief')
  const router = useRouter()
  const [brief, setBrief] = useState<DailyBriefRecord | null>(initialBrief)
  const [stale, setStale] = useState(initialBriefStale)
  const [loading, setLoading] = useState(false)
  const [sections, setSections] = useState<Record<BriefSection, SectionState>>(initialSectionState)
  const lastRegenerateAt = useRef(0)

  useEffect(() => {
    setBrief(initialBrief)
    setStale(initialBriefStale)
    setSections(initialSectionState())
  }, [initialBrief, initialBriefStale, dayId])

  const runRegenerate = useCallback(async () => {
    const now = Date.now()
    if (now - lastRegenerateAt.current < REGENERATE_DEBOUNCE_MS) {
      toast.message(t('debounced'))
      return
    }
    lastRegenerateAt.current = now

    setLoading(true)
    try {
      const result = await generateDailyBrief(dateIso)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setBrief(result.data)
      setStale(false)
      setSections(initialSectionState())
      toast.success(t('generated'))
      router.refresh()
    } finally {
      setLoading(false)
    }
  }, [dateIso, router, t])

  const runRegenerateSection = useCallback(
    async (section: BriefSection) => {
      setSections((prev) => ({
        ...prev,
        [section]: { loading: true, error: null },
      }))
      try {
        const result = await regenerateBriefSection(dateIso, section)
        if (!result.success) {
          setSections((prev) => ({
            ...prev,
            [section]: { loading: false, error: result.error },
          }))
          return
        }
        setBrief(result.data)
        setSections((prev) => ({
          ...prev,
          [section]: { loading: false, error: null },
        }))
        toast.success(t('sectionRegenerated'))
      } catch {
        setSections((prev) => ({
          ...prev,
          [section]: { loading: false, error: t('sectionRegenFailed') },
        }))
      }
    },
    [dateIso, t]
  )

  const copyMarkdown = useCallback(() => {
    if (!brief) return
    const md = formatDailyBriefMarkdown(brief.content)
    void navigator.clipboard.writeText(md).then(
      () => toast.success(t('copied')),
      () => toast.error(t('copyFailed'))
    )
  }, [brief, t])

  const hasBrief = brief !== null
  const anySectionLoading = REGEN_SECTIONS.some((s) => sections[s].loading)

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
              onClick={() => void runRegenerate()}
              disabled={loading || anySectionLoading}
            >
              {loading ? (
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
        {stale && isEditor && (
          <div className="flex items-center justify-between gap-2 rounded-md border border-amber-200/60 bg-amber-50 px-2.5 py-2 dark:border-amber-900/50 dark:bg-amber-950/40">
            <p className="text-xs text-amber-800/90 dark:text-amber-200/90">{t('stale')}</p>
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() => void runRegenerate()}
              disabled={loading}
              className="shrink-0"
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              {t('regenerate')}
            </Button>
          </div>
        )}

        {briefIsEmpty && <p className="text-muted-foreground text-sm">{t('empty')}</p>}

        {!hasBrief && !briefIsEmpty && !loading && (
          <p className="text-muted-foreground text-sm">{t('emptyViewer')}</p>
        )}

        {loading && !hasBrief && (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('generating')}
          </p>
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
                  sectionState={sections.vipNotes}
                  onRegenerate={isEditor ? () => void runRegenerateSection('vipNotes') : undefined}
                />
                <AllergenBlock rollup={brief.content.allergenRollup} t={t} />
                <ListBlock
                  title={t('risks')}
                  items={brief.content.risks}
                  sectionState={sections.risks}
                  onRegenerate={isEditor ? () => void runRegenerateSection('risks') : undefined}
                />
                <ListBlock
                  title={t('actions')}
                  items={brief.content.suggestedActions}
                  sectionState={sections.suggestedActions}
                  onRegenerate={
                    isEditor ? () => void runRegenerateSection('suggestedActions') : undefined
                  }
                />
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
    </section>
  )
}

function ListBlock({
  title,
  items,
  sectionState,
  onRegenerate,
}: {
  title: string
  items: string[]
  sectionState?: SectionState
  onRegenerate?: () => void
}) {
  const isLoading = sectionState?.loading ?? false
  const error = sectionState?.error ?? null

  if (items.length === 0 && !onRegenerate) return null
  return (
    <div className={isLoading ? 'opacity-60' : ''}>
      <div className="text-foreground mb-1 flex items-center justify-between gap-2 font-medium">
        <span>{title}</span>
        {onRegenerate && (
          <Button
            type="button"
            size="iconMicro"
            variant="ghost"
            onClick={onRegenerate}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>
      {error && <p className="text-destructive mb-1 text-xs">{error}</p>}
      {items.length > 0 && (
        <ul className="text-muted-foreground list-disc space-y-0.5 pl-5">
          {items.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      )}
    </div>
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
