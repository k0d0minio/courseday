'use client'

import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { Label } from '@/components/ui/label'

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

type QuickAddPartial = DeepPartial<{
  kind: 'activity' | 'reservation' | 'breakfast'
  dateAmbiguous: boolean
  fields: {
    title: string | null
    guestName: string | null
    groupName: string | null
    startTime: string | null
    endTime: string | null
    expectedCovers: number | null
    guestCount: number | null
    notes: string | null
  }
}>

type Props = {
  partial: QuickAddPartial | undefined
  label: string
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`bg-muted h-9 animate-pulse rounded-md ${className}`} />
}

function ValueBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-input bg-background flex h-9 items-center rounded-md border px-3 text-sm">
      {children}
    </div>
  )
}

export function QuickAddStreamingPreview({ partial, label }: Props) {
  const t = useTranslations('Tenant.quickAdd')

  const kind = partial?.kind
  const fields = partial?.fields

  const primaryLabel =
    kind === 'reservation'
      ? t('primaryReservation')
      : kind === 'breakfast'
        ? t('primaryBreakfast')
        : t('primaryActivity')

  const primary =
    kind === 'reservation'
      ? fields?.guestName
      : kind === 'breakfast'
        ? fields?.groupName
        : fields?.title

  const countLabel = kind === 'activity' ? t('expectedCoversLabel') : t('guestCountLabel')
  const count = kind === 'activity' ? fields?.expectedCovers : fields?.guestCount

  const showEndTime = kind !== 'breakfast'

  return (
    <div className="space-y-3" role="status" aria-live="polite" aria-label={label}>
      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {label}
      </p>

      <div className="space-y-1.5">
        <Label>{t('kindLabel')}</Label>
        {kind ? (
          <ValueBox>
            {kind === 'activity'
              ? t('kindActivity')
              : kind === 'reservation'
                ? t('kindReservation')
                : t('kindBreakfast')}
          </ValueBox>
        ) : (
          <Skeleton />
        )}
      </div>

      <div className="space-y-1.5">
        <Label>{primaryLabel}</Label>
        {primary ? <ValueBox>{primary}</ValueBox> : <Skeleton />}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>{t('startTimeLabel')}</Label>
          {fields?.startTime ? <ValueBox>{fields.startTime}</ValueBox> : <Skeleton />}
        </div>
        {showEndTime && (
          <div className="space-y-1.5">
            <Label>{t('endTimeLabel')}</Label>
            {fields?.endTime ? <ValueBox>{fields.endTime}</ValueBox> : <Skeleton />}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>{countLabel}</Label>
        {count != null && count !== '' ? <ValueBox>{String(count)}</ValueBox> : <Skeleton />}
      </div>

      {fields?.notes ? (
        <div className="space-y-1.5">
          <Label>{t('notesLabel')}</Label>
          <ValueBox>{fields.notes}</ValueBox>
        </div>
      ) : null}
    </div>
  )
}
