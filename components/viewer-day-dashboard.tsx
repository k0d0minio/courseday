'use client'

import { useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { useTranslations } from 'next-intl'
import { DayNav } from '@/components/day-nav'
import { DayNotes } from '@/components/day-notes'
import { TableBreakdownDisplay } from '@/components/table-breakdown-display'
import { useFeatureFlag } from '@/lib/feature-flags-context'
import type { ActivityWithRelations, Reservation, BreakfastConfiguration } from '@/types/index'
import type { DayNote } from '@/app/actions/day-notes'
import type { WeatherData } from '@/app/actions/weather'
import type { DailyBriefRecord } from '@/types/daily-brief'
import { useAuth } from '@/lib/AuthProvider'
import { useDayViewHotkeys } from '@/lib/keyboard-shortcuts'
import { DailyBriefCard } from '@/components/daily-brief-card'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = {
  date: string
  dayId: string
  today: string
  activities: ActivityWithRelations[]
  reservations: Reservation[]
  breakfastConfigs: BreakfastConfiguration[]
  dayNotes: DayNote[]
  setDayNotes: Dispatch<SetStateAction<DayNote[]>>
  weather: WeatherData | null
  dailyBrief: DailyBriefRecord | null
  briefStale?: boolean
  briefIsEmpty?: boolean
  briefOverrideAuthorName?: string | null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ViewerDayDashboard({
  date,
  dayId,
  today,
  activities,
  reservations,
  breakfastConfigs,
  dayNotes,
  setDayNotes,
  weather,
  dailyBrief,
  briefStale,
  briefIsEmpty,
  briefOverrideAuthorName = null,
}: Props) {
  const { impersonationRole } = useAuth()

  useDayViewHotkeys({ date, today, impersonationRole })

  const td = useTranslations('Tenant.day')
  const tsummary = useTranslations('Tenant.summary')
  const te = useTranslations('Tenant.entry')
  const tb = useTranslations('Tenant.breakfastCard')
  const showReservations = useFeatureFlag('reservations')
  const showBreakfast = useFeatureFlag('breakfast_config')
  const showWeatherReporting = useFeatureFlag('weather_reporting')
  const showDailyBrief = useFeatureFlag('daily_brief')

  const visibleBreakfastConfigs = showBreakfast ? breakfastConfigs : []
  const visibleReservations = showReservations ? reservations : []

  const totalBreakfastCovers = visibleBreakfastConfigs.reduce((s, b) => s + b.total_guests, 0)
  const totalActivityCovers = activities.reduce((s, a) => s + (a.expected_covers ?? 0), 0)
  const totalReservationCovers = visibleReservations.reduce((s, r) => s + (r.guest_count ?? 0), 0)

  const [openBlocks, setOpenBlocks] = useState<Set<'breakfast' | 'activities' | 'reservations'>>(
    new Set()
  )
  const toggleBlock = (key: 'breakfast' | 'activities' | 'reservations') => {
    setOpenBlocks((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
      <DayNav date={date} today={today} />

      {showDailyBrief && (
        <DailyBriefCard
          dateIso={date}
          dayId={dayId}
          initialBrief={dailyBrief}
          isEditor={false}
          briefStale={briefStale ?? false}
          briefIsEmpty={briefIsEmpty ?? false}
          overrideAuthorName={briefOverrideAuthorName}
          weather={showWeatherReporting ? weather : null}
          chromeless
        />
      )}

      <DayNotes
        dayId={dayId}
        initialNotes={dayNotes}
        notes={dayNotes}
        onNotesChange={setDayNotes}
        isEditor={false}
        currentUserId={undefined}
      />

      {/* Expandable stat blocks — click to reveal item list */}
      <div className="space-y-3">
        <div
          className={`grid gap-3 ${showBreakfast && showReservations ? 'grid-cols-3' : showBreakfast || showReservations ? 'grid-cols-2' : 'grid-cols-1'}`}
        >
          {showBreakfast && (
            // eslint-disable-next-line no-restricted-syntax
            <button
              className="bg-card cursor-pointer rounded-lg border px-3 py-4 text-center transition-colors hover:bg-muted/30"
              onClick={() => toggleBlock('breakfast')}
              aria-expanded={openBlocks.has('breakfast')}
            >
              <p className="text-4xl leading-none font-bold tabular-nums">{totalBreakfastCovers}</p>
              <p className="text-muted-foreground mt-2 text-xs leading-tight">
                {tsummary('breakfast')}
              </p>
            </button>
          )}
          {/* eslint-disable-next-line no-restricted-syntax */}
          <button
            className="bg-card cursor-pointer rounded-lg border px-3 py-4 text-center transition-colors hover:bg-muted/30"
            onClick={() => toggleBlock('activities')}
            aria-expanded={openBlocks.has('activities')}
          >
            <p className="text-4xl leading-none font-bold tabular-nums">{totalActivityCovers}</p>
            <p className="text-muted-foreground mt-2 text-xs leading-tight">
              {tsummary('activities')}
            </p>
          </button>
          {showReservations && (
            // eslint-disable-next-line no-restricted-syntax
            <button
              className="bg-card cursor-pointer rounded-lg border px-3 py-4 text-center transition-colors hover:bg-muted/30"
              onClick={() => toggleBlock('reservations')}
              aria-expanded={openBlocks.has('reservations')}
            >
              <p className="text-4xl leading-none font-bold tabular-nums">
                {totalReservationCovers}
              </p>
              <p className="text-muted-foreground mt-2 text-xs leading-tight">
                {tsummary('reservations')}
              </p>
            </button>
          )}
        </div>

        {openBlocks.has('breakfast') && showBreakfast && (
          <section className="space-y-2">
            {visibleBreakfastConfigs.length === 0 ? (
              <p className="text-muted-foreground text-sm">{td('noBreakfasts')}</p>
            ) : (
              visibleBreakfastConfigs.map((item) => (
                <BreakfastRow key={item.id} item={item} t={tb} />
              ))
            )}
          </section>
        )}

        {openBlocks.has('activities') && (
          <section className="space-y-2">
            {activities.length === 0 ? (
              <p className="text-muted-foreground text-sm">{td('noEntries')}</p>
            ) : (
              activities.map((item) => <ActivityRow key={item.id} item={item} t={te} />)
            )}
          </section>
        )}

        {openBlocks.has('reservations') && showReservations && (
          <section className="space-y-2">
            {visibleReservations.length === 0 ? (
              <p className="text-muted-foreground text-sm">{td('noReservations')}</p>
            ) : (
              visibleReservations.map((item) => <ReservationRow key={item.id} item={item} />)
            )}
          </section>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function BreakfastRow({
  item,
  t,
}: {
  item: BreakfastConfiguration
  t: ReturnType<typeof useTranslations<'Tenant.breakfastCard'>>
}) {
  const breakdown = Array.isArray(item.table_breakdown) ? (item.table_breakdown as number[]) : []

  return (
    <div className="bg-card space-y-2 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="flex flex-wrap items-center gap-2 font-semibold">
          {item.group_name ?? t('unnamedGroup')}
        </p>
        <div className="flex shrink-0 items-center gap-3 text-sm">
          {item.start_time && (
            <span className="text-muted-foreground">{item.start_time.slice(0, 5)}</span>
          )}
          {item.total_guests > 0 && (
            <span className="font-medium">{t('guests', { count: item.total_guests })}</span>
          )}
        </div>
      </div>
      {breakdown.length > 0 && <TableBreakdownDisplay breakdown={breakdown} />}
      {item.notes && <p className="text-muted-foreground text-sm italic">{item.notes}</p>}
    </div>
  )
}

function ActivityRow({
  item,
  t,
}: {
  item: ActivityWithRelations
  t: ReturnType<typeof useTranslations<'Tenant.entry'>>
}) {
  return (
    <div className="bg-card space-y-1.5 rounded-lg border p-4">
      {item.tags && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.tags.map((tag) => (
            <span key={tag.id} className="bg-muted inline-block rounded px-1.5 py-0.5 text-xs">
              {tag.name}
            </span>
          ))}
        </div>
      )}
      <p className="flex flex-wrap items-center gap-2 font-semibold">{item.title}</p>
      <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-0.5 text-sm">
        {(item.start_time || item.end_time) && (
          <span>{formatTimeRange(item.start_time, item.end_time, t)}</span>
        )}
        {item.expected_covers != null && (
          <span>{t('covers', { count: item.expected_covers })}</span>
        )}
        {item.venue_type && <span>{item.venue_type.name}</span>}
        {item.point_of_contact && <span>{item.point_of_contact.name}</span>}
      </div>
      {item.notes && <p className="text-muted-foreground text-sm italic">{item.notes}</p>}
    </div>
  )
}

function ReservationRow({ item }: { item: Reservation }) {
  const tr = useTranslations('Tenant.reservation')
  const breakdown = Array.isArray(item.table_breakdown) ? (item.table_breakdown as number[]) : []

  return (
    <div className="bg-card space-y-2 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="flex flex-wrap items-center gap-2 font-semibold">
          {item.guest_name ?? tr('fallbackName')}
        </p>
        <div className="flex shrink-0 items-center gap-3 text-sm">
          {(item.start_time || item.end_time) && (
            <span className="text-muted-foreground">
              {formatTimeRange(item.start_time, item.end_time, null)}
            </span>
          )}
          {item.guest_count != null && (
            <span className="font-medium">{tr('guests', { count: item.guest_count })}</span>
          )}
        </div>
      </div>
      {breakdown.length > 0 && <TableBreakdownDisplay breakdown={breakdown} />}
      {item.notes && <p className="text-muted-foreground text-sm italic">{item.notes}</p>}
    </div>
  )
}

function formatTimeRange(
  start: string | null,
  end: string | null,
  t: ReturnType<typeof useTranslations<'Tenant.entry'>> | null
): string {
  const fmt = (s: string) => s.slice(0, 5)
  if (start && end) {
    return t
      ? t('timeRange', { start: fmt(start), end: fmt(end) })
      : `${fmt(start)} – ${fmt(end)}`
  }
  if (start) return t ? t('timeFrom', { time: fmt(start) }) : fmt(start)
  if (end) return t ? t('timeUntil', { time: fmt(end) }) : fmt(end)
  return ''
}
