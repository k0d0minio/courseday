'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import {
  getISOWeek,
  getISOWeekYear,
  parseISO,
  startOfISOWeek,
  endOfISOWeek,
  format,
} from 'date-fns'
import { getMyShifts } from '@/app/actions/shifts'
import type { MyShiftWithDate } from '@/app/actions/shifts'
import { Button } from '@/components/ui/button'

type DayGroup = {
  dateIso: string
  shifts: MyShiftWithDate[]
}

type WeekGroup = {
  weekKey: string
  label: string
  days: DayGroup[]
}

function weekLabel(dateIso: string): string {
  const date = parseISO(dateIso)
  const start = startOfISOWeek(date)
  const end = endOfISOWeek(date)
  const sameMonth = start.getMonth() === end.getMonth()
  if (sameMonth) {
    return `${format(start, 'd')}–${format(end, 'd MMM yyyy')}`
  }
  return `${format(start, 'd MMM')} – ${format(end, 'd MMM yyyy')}`
}

function groupByWeek(shifts: MyShiftWithDate[]): WeekGroup[] {
  const weekMap = new Map<string, Map<string, MyShiftWithDate[]>>()

  for (const shift of shifts) {
    const date = parseISO(shift.date_iso)
    const week = getISOWeek(date)
    const year = getISOWeekYear(date)
    const weekKey = `${year}-W${String(week).padStart(2, '0')}`
    if (!weekMap.has(weekKey)) weekMap.set(weekKey, new Map())
    const dayMap = weekMap.get(weekKey)!
    if (!dayMap.has(shift.date_iso)) dayMap.set(shift.date_iso, [])
    dayMap.get(shift.date_iso)!.push(shift)
  }

  return Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekKey, dayMap]) => {
      const days: DayGroup[] = Array.from(dayMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dateIso, dayShifts]) => ({
          dateIso,
          shifts: dayShifts.sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? '')),
        }))
      const firstDate = days[0]?.dateIso ?? weekKey
      return { weekKey, label: weekLabel(firstDate), days }
    })
}

function formatShiftDate(dateIso: string): string {
  const date = parseISO(dateIso)
  return format(date, 'EEEE, d MMM')
}

function formatTimeRange(start: string | null, end: string | null): string {
  const fmt = (t: string) => t.slice(0, 5)
  if (start && end) return `${fmt(start)} – ${fmt(end)}`
  if (start) return fmt(start)
  if (end) return fmt(end)
  return ''
}

type Props = {
  initialShifts: MyShiftWithDate[]
  today: string
  tenantSlug: string
}

export function MyScheduleList({ initialShifts, today, tenantSlug }: Props) {
  const t = useTranslations('Tenant.staff.mySchedule')
  const [pastShifts, setPastShifts] = useState<MyShiftWithDate[]>([])
  const [showPast, setShowPast] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleTogglePast() {
    if (showPast) {
      setShowPast(false)
      return
    }
    if (pastShifts.length > 0) {
      setShowPast(true)
      return
    }
    // Fetch past 8 weeks
    const todayDate = parseISO(today)
    const from = format(
      new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() - 56),
      'yyyy-MM-dd'
    )
    const to = format(
      new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() - 1),
      'yyyy-MM-dd'
    )
    startTransition(async () => {
      const data = await getMyShifts({ from, to })
      setPastShifts(data)
      setShowPast(true)
    })
  }

  const upcomingGroups = groupByWeek(initialShifts)
  const pastGroups = groupByWeek(pastShifts).reverse()

  function renderWeekGroup(group: WeekGroup) {
    return (
      <div key={group.weekKey} className="space-y-3">
        <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          {group.label}
        </p>
        <div className="space-y-2">
          {group.days.map((day) =>
            day.shifts.map((shift) => {
              const timeLabel = formatTimeRange(shift.start_time, shift.end_time)
              const roleLabel = shift.role?.trim()
              return (
                <Link
                  key={shift.id}
                  href={`/${tenantSlug}/day/${day.dateIso}`}
                  className="bg-card hover:bg-accent block space-y-1 rounded-lg border p-4 transition-colors"
                >
                  <p className="text-muted-foreground text-xs font-medium">
                    {formatShiftDate(day.dateIso)}
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    {roleLabel && <span className="text-sm font-medium">{roleLabel}</span>}
                    {timeLabel && (
                      <span className="text-muted-foreground text-sm">{timeLabel}</span>
                    )}
                  </div>
                  {shift.notes && (
                    <p className="text-muted-foreground text-sm italic">{shift.notes}</p>
                  )}
                </Link>
              )
            })
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" onClick={handleTogglePast} disabled={isPending}>
        {isPending ? t('loadingPast') : showPast ? t('hidePast') : t('showPast')}
      </Button>

      {showPast && (
        <div className="space-y-6">
          {pastGroups.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('emptyPast')}</p>
          ) : (
            pastGroups.map(renderWeekGroup)
          )}
          <hr />
        </div>
      )}

      {upcomingGroups.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('empty')}</p>
      ) : (
        upcomingGroups.map(renderWeekGroup)
      )}
    </div>
  )
}
