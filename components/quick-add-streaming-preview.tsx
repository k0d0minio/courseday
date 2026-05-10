'use client'

import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Skeleton as UiSkeleton } from '@/components/ui/skeleton'

type StreamedItem = {
  kind?: 'activity' | 'reservation' | 'breakfast'
  fields?: {
    title?: string | null
    guestName?: string | null
    groupName?: string | null
    startTime?: string | null
    endTime?: string | null
    expectedCovers?: number | null
    guestCount?: number | null
    notes?: string | null
  }
}

type StreamedShape = {
  items?: Array<StreamedItem | undefined>
}

type Props = {
  partial: unknown
  label: string
}

function Skeleton({ className = '' }: { className?: string }) {
  return <UiSkeleton aria-hidden="true" className={`bg-muted h-9 ${className}`} />
}

function ValueBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-input bg-background flex h-9 items-center rounded-md border px-3 text-sm">
      {children}
    </div>
  )
}

function ItemPreview({
  item,
  index,
  total,
}: {
  item: StreamedItem | undefined
  index: number
  total: number
}) {
  const t = useTranslations('Tenant.quickAdd')

  const kind = item?.kind
  const fields = item?.fields

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
    <div className="space-y-3">
      {total > 1 && (
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {`${index + 1} / ${total}`}
        </p>
      )}

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
        {count != null ? <ValueBox>{String(count)}</ValueBox> : <Skeleton />}
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

export function QuickAddStreamingPreview({ partial, label }: Props) {
  const data = (partial ?? {}) as StreamedShape
  const items = Array.isArray(data.items) ? data.items : []
  const visible = items.length === 0 ? [undefined] : items

  return (
    <div className="space-y-4" role="status" aria-live="polite" aria-label={label}>
      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {label}
      </p>
      {visible.map((item, i) => (
        <ItemPreview key={i} item={item} index={i} total={visible.length} />
      ))}
    </div>
  )
}
