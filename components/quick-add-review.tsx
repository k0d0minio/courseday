'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { useFeatureFlag } from '@/lib/feature-flags-context'
import { ALLERGENS, type AllergenCode } from '@/lib/allergens'
import type { QuickAddGapId, QuickAddParseData } from '@/lib/quick-add-types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Toggle } from '@/components/ui/toggle'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type QuickAddReviewKind = 'activity' | 'reservation' | 'breakfast'

export type QuickAddReviewActivityPayload = {
  kind: 'activity'
  dayId: string
  contextDate: string
  title: string
  startTime: string
  endTime: string
  expectedCovers?: number
  notes: string
  allergens: AllergenCode[]
}

export type QuickAddReviewReservationPayload = {
  kind: 'reservation'
  dayId: string
  contextDate: string
  guestName: string
  guestCount?: number
  startTime: string
  endTime: string
  notes: string
  allergens: AllergenCode[]
  tableBreakdown: number[]
}

export type QuickAddReviewBreakfastPayload = {
  kind: 'breakfast'
  dayId: string
  contextDate: string
  groupName: string
  guestCount?: number
  startTime: string
  notes: string
  allergens: AllergenCode[]
  tableBreakdown: number[]
}

export type QuickAddReviewPayload =
  | QuickAddReviewActivityPayload
  | QuickAddReviewReservationPayload
  | QuickAddReviewBreakfastPayload

export type QuickAddReviewProps = {
  data: QuickAddParseData
  rawText: string
  onConfirm: (payload: QuickAddReviewPayload) => void | Promise<void>
  onBack: () => void
  isPending?: boolean
  error?: string | null
}

type State = {
  kind: QuickAddReviewKind
  primary: string
  startTime: string
  endTime: string
  count: string
  notes: string
  allergens: AllergenCode[]
  tableBreakdown: number[]
  date: string
}

function initialState(data: QuickAddParseData): State {
  if (data.kind === 'activity') {
    return {
      kind: 'activity',
      primary: data.defaults.title,
      startTime: data.defaults.startTime,
      endTime: data.defaults.endTime,
      count: data.defaults.expectedCovers,
      notes: data.defaults.notes,
      allergens: data.allergens,
      tableBreakdown: [],
      date: data.contextDate,
    }
  }
  if (data.kind === 'reservation') {
    return {
      kind: 'reservation',
      primary: data.defaults.guestName,
      startTime: data.defaults.startTime,
      endTime: data.defaults.endTime,
      count: data.defaults.guestCount,
      notes: data.defaults.notes,
      allergens: data.allergens,
      tableBreakdown: data.tableBreakdown,
      date: data.contextDate,
    }
  }
  return {
    kind: 'breakfast',
    primary: data.defaults.groupName,
    startTime: data.defaults.startTime,
    endTime: '',
    count: data.defaults.guestCount,
    notes: data.defaults.notes,
    allergens: data.allergens,
    tableBreakdown: data.tableBreakdown,
    date: data.contextDate,
  }
}

export function QuickAddReview({
  data,
  rawText,
  onConfirm,
  onBack,
  isPending,
  error,
}: QuickAddReviewProps) {
  const t = useTranslations('Tenant.quickAdd')
  const tAllergens = useTranslations('Tenant.allergens')
  const tNames = useTranslations('Tenant.allergens.names')
  const showReservations = useFeatureFlag('reservations')
  const showBreakfast = useFeatureFlag('breakfast_config')

  const [state, setState] = useState<State>(() => initialState(data))
  // Once the user manually overrides the kind, we no longer carry over the
  // original parse's gap-field highlights.
  const [userChangedKind, setUserChangedKind] = useState(false)

  const errId = useId()
  const dateId = useId()
  const primaryId = useId()
  const startId = useId()
  const endId = useId()
  const countId = useId()
  const notesId = useId()
  const kindId = useId()

  // Reset state when the underlying parsed data changes.
  const dataKey = `${data.kind}:${data.dayId}:${data.contextDate}:${rawText}`
  const lastDataKey = useRef(dataKey)
  useEffect(() => {
    if (lastDataKey.current !== dataKey) {
      lastDataKey.current = dataKey

      setUserChangedKind(false)

      setState(initialState(data))
    }
  }, [dataKey, data])

  const gapSet = useMemo<ReadonlySet<QuickAddGapId>>(() => {
    if (userChangedKind) return new Set()
    if (state.kind !== data.kind) return new Set()
    return new Set<QuickAddGapId>(data.gapFieldKeys)
  }, [data.gapFieldKeys, data.kind, state.kind, userChangedKind])

  function gapClass(field: QuickAddGapId): string {
    return gapSet.has(field) ? '-m-0.5 rounded-md p-0.5 ring-2 ring-amber-500/40' : ''
  }

  const allowedKinds: QuickAddReviewKind[] = useMemo(() => {
    const out: QuickAddReviewKind[] = ['activity']
    if (showReservations) out.push('reservation')
    if (showBreakfast) out.push('breakfast')
    return out
  }, [showReservations, showBreakfast])

  function changeKind(next: QuickAddReviewKind) {
    if (!allowedKinds.includes(next)) return
    setUserChangedKind(true)
    setState((s) => ({ ...s, kind: next }))
  }

  function toggleAllergen(code: AllergenCode) {
    setState((s) => {
      const has = s.allergens.includes(code)
      const next: AllergenCode[] = has
        ? s.allergens.filter((c) => c !== code)
        : ALLERGENS.filter((a) => s.allergens.includes(a.code) || a.code === code).map(
            (a) => a.code
          )
      return { ...s, allergens: next }
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isPending) return

    const countNumber = state.count.trim() ? parseInt(state.count, 10) : undefined
    const expectedCovers =
      typeof countNumber === 'number' && Number.isFinite(countNumber) && countNumber >= 0
        ? countNumber
        : undefined
    const guestCount =
      typeof countNumber === 'number' && Number.isFinite(countNumber) && countNumber >= 1
        ? countNumber
        : undefined

    // The dayId from parse maps to data.contextDate; if user edited the date,
    // QuickAddInput re-resolves the dayId before saving. We still send the
    // current date here so the caller can re-resolve.
    const base = {
      contextDate: state.date,
      // dayId stays as-is when date is unchanged; caller re-resolves otherwise.
      dayId: data.dayId,
      notes: state.notes.trim(),
      allergens: state.allergens,
    }

    if (state.kind === 'activity') {
      const payload: QuickAddReviewActivityPayload = {
        ...base,
        kind: 'activity',
        title: state.primary.trim(),
        startTime: state.startTime,
        endTime: state.endTime,
        ...(expectedCovers !== undefined ? { expectedCovers } : {}),
      }
      onConfirm(payload)
      return
    }
    if (state.kind === 'reservation') {
      const payload: QuickAddReviewReservationPayload = {
        ...base,
        kind: 'reservation',
        guestName: state.primary.trim(),
        startTime: state.startTime,
        endTime: state.endTime,
        tableBreakdown: state.tableBreakdown,
        ...(guestCount !== undefined ? { guestCount } : {}),
      }
      onConfirm(payload)
      return
    }
    const payload: QuickAddReviewBreakfastPayload = {
      ...base,
      kind: 'breakfast',
      groupName: state.primary.trim(),
      startTime: state.startTime,
      tableBreakdown: state.tableBreakdown,
      ...(guestCount !== undefined ? { guestCount } : {}),
    }
    onConfirm(payload)
  }

  const primaryLabel =
    state.kind === 'activity'
      ? t('primaryActivity')
      : state.kind === 'reservation'
        ? t('primaryReservation')
        : t('primaryBreakfast')

  const countLabel = state.kind === 'activity' ? t('expectedCoversLabel') : t('guestCountLabel')

  const primaryGapKey: QuickAddGapId =
    state.kind === 'activity' ? 'title' : state.kind === 'reservation' ? 'guestName' : 'groupName'
  const countGapKey: QuickAddGapId = state.kind === 'activity' ? 'expectedCovers' : 'guestCount'

  const showEndTime = state.kind !== 'breakfast'

  const canSave = !isPending && state.primary.trim().length > 0 && allowedKinds.includes(state.kind)

  return (
    <form onSubmit={handleSubmit} className="space-y-3" aria-label={t('reviewTitle')}>
      <p className="text-muted-foreground text-sm">{t('reviewDescription')}</p>

      <div className="space-y-1.5">
        <Label htmlFor={kindId}>{t('kindLabel')}</Label>
        <Select
          value={state.kind}
          onValueChange={(v) => changeKind(v as QuickAddReviewKind)}
          disabled={isPending ?? false}
        >
          <SelectTrigger id={kindId} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="activity">{t('kindActivity')}</SelectItem>
            {showReservations && (
              <SelectItem value="reservation">{t('kindReservation')}</SelectItem>
            )}
            {showBreakfast && <SelectItem value="breakfast">{t('kindBreakfast')}</SelectItem>}
          </SelectContent>
        </Select>
      </div>

      {data.dateAmbiguous && (
        <div className="space-y-1.5">
          <Label htmlFor={dateId}>{t('dateLabel')}</Label>
          <Input
            id={dateId}
            type="date"
            value={state.date}
            onChange={(e) => setState((s) => ({ ...s, date: e.target.value }))}
            disabled={isPending ?? false}
          />
        </div>
      )}

      <div className={cn('space-y-1.5', gapClass(primaryGapKey))}>
        <Label htmlFor={primaryId}>{primaryLabel}</Label>
        <Input
          id={primaryId}
          value={state.primary}
          onChange={(e) => setState((s) => ({ ...s, primary: e.target.value }))}
          disabled={isPending ?? false}
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className={cn('space-y-1.5', gapClass('startTime'))}>
          <Label htmlFor={startId}>{t('startTimeLabel')}</Label>
          <Input
            id={startId}
            type="time"
            value={state.startTime}
            onChange={(e) => setState((s) => ({ ...s, startTime: e.target.value }))}
            disabled={isPending ?? false}
          />
        </div>
        {showEndTime && (
          <div className="space-y-1.5">
            <Label htmlFor={endId}>{t('endTimeLabel')}</Label>
            <Input
              id={endId}
              type="time"
              value={state.endTime}
              onChange={(e) => setState((s) => ({ ...s, endTime: e.target.value }))}
              disabled={isPending ?? false}
            />
          </div>
        )}
      </div>

      <div className={cn('space-y-1.5', gapClass(countGapKey))}>
        <Label htmlFor={countId}>{countLabel}</Label>
        <Input
          id={countId}
          type="number"
          min={state.kind === 'activity' ? 0 : 1}
          value={state.count}
          onChange={(e) => setState((s) => ({ ...s, count: e.target.value }))}
          disabled={isPending ?? false}
        />
      </div>

      <div className="space-y-1.5">
        <Label>{tAllergens('label')}</Label>
        <div className="grid grid-cols-2 gap-1" role="group" aria-label={tAllergens('label')}>
          {ALLERGENS.map((a) => {
            const on = state.allergens.includes(a.code)
            return (
              <Toggle
                key={a.code}
                pressed={on}
                onPressedChange={() => toggleAllergen(a.code)}
                variant="outline"
                size="sm"
                disabled={isPending ?? false}
                aria-label={tNames(a.labelKey)}
                className={cn(
                  'h-auto justify-start gap-2 px-2 py-1.5 text-left text-sm font-normal',
                  on && 'border-primary'
                )}
              >
                <span aria-hidden="true" className="text-base leading-none">
                  {a.emoji}
                </span>
                <span className="truncate">{tNames(a.labelKey)}</span>
              </Toggle>
            )
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={notesId}>{t('notesLabel')}</Label>
        <Textarea
          id={notesId}
          rows={2}
          value={state.notes}
          onChange={(e) => setState((s) => ({ ...s, notes: e.target.value }))}
          disabled={isPending ?? false}
        />
      </div>

      {error && (
        <p id={errId} role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onBack} disabled={isPending ?? false}>
          {t('back')}
        </Button>
        <Button type="submit" disabled={!canSave}>
          {isPending ? (
            <>
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              {t('saving')}
            </>
          ) : (
            t('save')
          )}
        </Button>
      </div>
    </form>
  )
}
