'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Coffee, Flag, Loader2, UtensilsCrossed } from 'lucide-react'
import { useFeatureFlag } from '@/lib/feature-flags-context'
import type { QuickAddParseData } from '@/lib/quick-add-types'
import type { QuickAddReviewPayload } from '@/components/quick-add-review'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export type QuickAddMultiSaveResult = { success: true } | { success: false; error: string }

export type QuickAddMultiReviewProps = {
  items: QuickAddParseData[]
  onSaveOne: (payload: QuickAddReviewPayload) => Promise<QuickAddMultiSaveResult>
  onAllDone: () => void
  onBack: () => void
}

type RowStatus =
  | { state: 'idle' }
  | { state: 'saving' }
  | { state: 'saved' }
  | { state: 'error'; error: string }

function payloadFromItem(item: QuickAddParseData): QuickAddReviewPayload {
  const base = {
    dayId: item.dayId,
    contextDate: item.contextDate,
    notes: item.defaults.notes ?? '',
    allergens: item.allergens,
  }
  if (item.kind === 'activity') {
    const cov = item.defaults.expectedCovers.trim()
    const n = cov ? parseInt(cov, 10) : NaN
    return {
      ...base,
      kind: 'activity',
      title: item.defaults.title.trim(),
      startTime: item.defaults.startTime,
      endTime: item.defaults.endTime,
      ...(Number.isFinite(n) && n >= 0 ? { expectedCovers: n } : {}),
    }
  }
  if (item.kind === 'reservation') {
    const c = item.defaults.guestCount.trim()
    const n = c ? parseInt(c, 10) : NaN
    return {
      ...base,
      kind: 'reservation',
      guestName: item.defaults.guestName.trim(),
      startTime: item.defaults.startTime,
      endTime: item.defaults.endTime,
      tableBreakdown: item.tableBreakdown,
      ...(Number.isFinite(n) && n >= 1 ? { guestCount: n } : {}),
    }
  }
  const c = item.defaults.guestCount.trim()
  const n = c ? parseInt(c, 10) : NaN
  return {
    ...base,
    kind: 'breakfast',
    groupName: item.defaults.groupName.trim(),
    startTime: item.defaults.startTime,
    tableBreakdown: item.tableBreakdown,
    ...(Number.isFinite(n) && n >= 1 ? { guestCount: n } : {}),
  }
}

function itemTitle(item: QuickAddParseData): string {
  if (item.kind === 'activity') return item.defaults.title || ''
  if (item.kind === 'reservation') return item.defaults.guestName || ''
  return item.defaults.groupName || ''
}

function itemCount(item: QuickAddParseData): string {
  if (item.kind === 'activity') return item.defaults.expectedCovers
  return item.defaults.guestCount
}

function KindIcon({ kind }: { kind: QuickAddParseData['kind'] }) {
  if (kind === 'activity') return <Flag className="h-4 w-4 text-emerald-600" aria-hidden="true" />
  if (kind === 'reservation')
    return <UtensilsCrossed className="h-4 w-4 text-amber-600" aria-hidden="true" />
  return <Coffee className="h-4 w-4 text-blue-600" aria-hidden="true" />
}

export function QuickAddMultiReview({
  items,
  onSaveOne,
  onAllDone,
  onBack,
}: QuickAddMultiReviewProps) {
  const t = useTranslations('Tenant.quickAdd')
  const showReservations = useFeatureFlag('reservations')
  const showBreakfast = useFeatureFlag('breakfast_config')

  const [accepted, setAccepted] = useState<boolean[]>(() => items.map(() => true))
  const [statuses, setStatuses] = useState<RowStatus[]>(() => items.map(() => ({ state: 'idle' })))
  const [isSaving, setIsSaving] = useState(false)

  const allowed = useMemo(
    () => items.map((it) => isItemAllowed(it, showReservations, showBreakfast)),
    [items, showReservations, showBreakfast]
  )

  const acceptedCount = accepted.reduce(
    (n, on, i) => (on && allowed[i] && statuses[i]!.state !== 'saved' ? n + 1 : n),
    0
  )

  function toggleAccept(idx: number) {
    if (isSaving) return
    setAccepted((a) => a.map((v, i) => (i === idx ? !v : v)))
    setStatuses((s) => s.map((v, i) => (i === idx && v.state === 'error' ? { state: 'idle' } : v)))
  }

  async function handleCreate() {
    if (isSaving || acceptedCount === 0) return
    setIsSaving(true)

    const next = [...statuses]
    let allSaved = true
    for (let i = 0; i < items.length; i++) {
      if (!accepted[i] || !allowed[i]) {
        if (next[i]!.state !== 'saved') allSaved = false
        continue
      }
      if (next[i]!.state === 'saved') continue

      next[i] = { state: 'saving' }
      setStatuses([...next])
      const payload = payloadFromItem(items[i]!)
      const result = await onSaveOne(payload)
      if (result.success) {
        next[i] = { state: 'saved' }
      } else {
        next[i] = { state: 'error', error: result.error }
        allSaved = false
        // Auto-uncheck failed row so user can retry without un-checking manually.
        setAccepted((a) => a.map((v, j) => (j === i ? false : v)))
      }
      setStatuses([...next])
    }

    setIsSaving(false)

    const allDone = next.every((s, i) => s.state === 'saved' || !accepted[i] || !allowed[i])
    const anySaved = next.some((s) => s.state === 'saved')
    if (allDone && anySaved && allSaved) onAllDone()
  }

  return (
    <div className="space-y-3" aria-label={t('multiReviewTitle')}>
      <p className="text-muted-foreground text-sm">
        {t('multiReviewDescription', { count: items.length })}
      </p>

      <ul className="divide-border divide-y rounded-md border">
        {items.map((item, idx) => {
          const status = statuses[idx]!
          const isAllowed = allowed[idx]!
          const on = accepted[idx]! && isAllowed
          const title = itemTitle(item) || t(`primary${capKind(item.kind)}` as PrimaryKey)
          const time = item.defaults.startTime || ''
          const count = itemCount(item)
          const rowId = `qa-multi-row-${idx}`
          const checkedId = `qa-multi-accept-${idx}`
          return (
            <li
              key={`${item.kind}-${idx}`}
              id={rowId}
              className={cn(
                'flex items-start gap-3 px-3 py-2.5',
                status.state === 'saved' && 'bg-emerald-50/60 opacity-70 dark:bg-emerald-950/20',
                status.state === 'error' && 'bg-destructive/5'
              )}
            >
              <div className="mt-1 shrink-0">
                <KindIcon kind={item.kind} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{title}</span>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {t(`kind${capKind(item.kind)}` as KindKey)}
                  </span>
                </div>
                <div className="text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                  {time && (
                    <span>
                      {t('startTimeLabel')}: {time}
                    </span>
                  )}
                  {count && (
                    <span>
                      {item.kind === 'activity' ? t('expectedCoversLabel') : t('guestCountLabel')}:{' '}
                      {count}
                    </span>
                  )}
                  {item.dateAmbiguous && <span>{t('dateAmbiguousShort')}</span>}
                </div>
                {!isAllowed && (
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                    {t('multiKindDisabled')}
                  </p>
                )}
                {status.state === 'error' && (
                  <p role="alert" className="text-destructive mt-1 text-xs">
                    {status.error}
                  </p>
                )}
                {status.state === 'saved' && (
                  <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
                    {t('multiRowSaved')}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2 pt-1">
                {status.state === 'saving' && (
                  <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                )}
                <Label htmlFor={checkedId} className="sr-only">
                  {t('multiAcceptToggle', { title })}
                </Label>
                <Switch
                  id={checkedId}
                  checked={on}
                  onCheckedChange={() => toggleAccept(idx)}
                  disabled={isSaving || !isAllowed || status.state === 'saved'}
                  aria-label={t('multiAcceptToggle', { title })}
                />
              </div>
            </li>
          )
        })}
      </ul>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onBack} disabled={isSaving}>
          {t('back')}
        </Button>
        <Button type="button" onClick={handleCreate} disabled={isSaving || acceptedCount === 0}>
          {isSaving ? (
            <>
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              {t('saving')}
            </>
          ) : (
            t('multiCreateButton', { count: acceptedCount })
          )}
        </Button>
      </div>
    </div>
  )
}

type KindKey = 'kindActivity' | 'kindReservation' | 'kindBreakfast'
type PrimaryKey = 'primaryActivity' | 'primaryReservation' | 'primaryBreakfast'

function capKind(k: QuickAddParseData['kind']): 'Activity' | 'Reservation' | 'Breakfast' {
  if (k === 'activity') return 'Activity'
  if (k === 'reservation') return 'Reservation'
  return 'Breakfast'
}

function isItemAllowed(
  item: QuickAddParseData,
  showReservations: boolean,
  showBreakfast: boolean
): boolean {
  if (item.kind === 'activity') return true
  if (item.kind === 'reservation') return showReservations
  return showBreakfast
}
