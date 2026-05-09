'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { format, addDays, parseISO, startOfISOWeek } from 'date-fns'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ShiftForm } from '@/components/shift-form'
import type { Day, ShiftAssignee, ShiftWithAssignee } from '@/types/index'

type Props = {
  weekStart: string
  weekEnd: string
  days: Day[]
  shifts: ShiftWithAssignee[]
  assignees: ShiftAssignee[]
  isEditor: boolean
}

export function RosterGrid({ weekStart, weekEnd, days, shifts, assignees, isEditor }: Props) {
  const t = useTranslations('Tenant.staff.roster')
  const router = useRouter()

  const [localShifts, setLocalShifts] = useState<ShiftWithAssignee[]>(shifts)
  const [formOpen, setFormOpen] = useState(false)
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [editShift, setEditShift] = useState<ShiftWithAssignee | null>(null)

  // Build day list sorted by date_iso (should already be sorted from DB)
  const sortedDays = [...days].sort((a, b) => a.date_iso.localeCompare(b.date_iso))

  // Group shifts by user_id + day_id
  const shiftsByUserDay = new Map<string, ShiftWithAssignee[]>()
  for (const s of localShifts) {
    const key = `${s.user_id}::${s.day_id}`
    const existing = shiftsByUserDay.get(key) ?? []
    shiftsByUserDay.set(key, [...existing, s])
  }

  function navigate(direction: 'prev' | 'next' | 'today') {
    let target: string
    if (direction === 'today') {
      target = format(startOfISOWeek(new Date()), 'yyyy-MM-dd')
    } else {
      const delta = direction === 'prev' ? -7 : 7
      target = format(addDays(parseISO(weekStart), delta), 'yyyy-MM-dd')
    }
    router.push(`/schedule/${target}`)
  }

  function openAdd(dayId: string, userId: string) {
    setEditShift(null)
    setSelectedDayId(dayId)
    setSelectedUserId(userId)
    setFormOpen(true)
  }

  function openEdit(shift: ShiftWithAssignee) {
    setEditShift(shift)
    setSelectedDayId(shift.day_id)
    setSelectedUserId(null)
    setFormOpen(true)
  }

  function handleSaved(item: ShiftWithAssignee) {
    setLocalShifts((prev) => {
      const idx = prev.findIndex((s) => s.id === item.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = item
        return next.sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''))
      }
      return [...prev, item].sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''))
    })
  }

  // Week header label e.g. "May 4 – May 10, 2026"
  const startDate = parseISO(weekStart)
  const endDate = parseISO(weekEnd)
  const startLabel = format(startDate, 'MMM d')
  const endLabel = format(endDate, 'MMM d, yyyy')
  const weekLabel = `${startLabel} – ${endLabel}`

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{t('title')}</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="iconSm"
            onClick={() => navigate('prev')}
            title={t('prevWeek')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium tabular-nums">{weekLabel}</span>
          <Button
            variant="ghost"
            size="iconSm"
            onClick={() => navigate('next')}
            title={t('nextWeek')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('today')}>
            <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
            {t('today')}
          </Button>
        </div>
      </div>

      {/* Grid */}
      {assignees.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('noStaff')}</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="bg-muted/40">
                <th className="w-40 border-b px-4 py-2 text-left font-medium">
                  {t('staffColumn')}
                </th>
                {sortedDays.map((day) => {
                  const date = parseISO(day.date_iso)
                  return (
                    <th
                      key={day.id}
                      className="border-b border-l px-2 py-2 text-center font-medium"
                    >
                      <div>{format(date, 'EEE')}</div>
                      <div className="text-muted-foreground font-normal">{format(date, 'd')}</div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {assignees.map((assignee, rowIdx) => (
                <tr key={assignee.user_id} className={rowIdx % 2 === 0 ? '' : 'bg-muted/20'}>
                  <td className="border-b px-4 py-2 font-medium">
                    <div className="truncate" title={assignee.display_name}>
                      {assignee.display_name}
                    </div>
                    {assignee.email && assignee.email !== assignee.display_name && (
                      <div className="text-muted-foreground truncate text-xs">{assignee.email}</div>
                    )}
                  </td>
                  {sortedDays.map((day) => {
                    const cellShifts = shiftsByUserDay.get(`${assignee.user_id}::${day.id}`) ?? []
                    return (
                      <td key={day.id} className="group border-b border-l px-1 py-1 align-top">
                        <div className="flex min-h-[3rem] flex-col gap-1">
                          {cellShifts.map((shift) => (
                            // eslint-disable-next-line no-restricted-syntax
                            <button
                              key={shift.id}
                              onClick={isEditor ? () => openEdit(shift) : undefined}
                              className={`w-full rounded px-1.5 py-1 text-left text-xs ${
                                isEditor
                                  ? 'bg-accent/60 hover:bg-accent cursor-pointer transition-colors'
                                  : 'bg-accent/60 cursor-default'
                              }`}
                            >
                              {shift.start_time || shift.end_time ? (
                                <span className="font-medium">
                                  {shift.start_time?.slice(0, 5)}
                                  {shift.end_time ? `–${shift.end_time.slice(0, 5)}` : ''}
                                </span>
                              ) : null}
                              {shift.role ? (
                                <span className="text-muted-foreground ml-1">{shift.role}</span>
                              ) : null}
                            </button>
                          ))}
                          {isEditor && cellShifts.length === 0 && (
                            // eslint-disable-next-line no-restricted-syntax
                            <button
                              onClick={() => openAdd(day.id, assignee.user_id)}
                              className="text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/40 flex h-full min-h-[3rem] w-full cursor-pointer items-center justify-center rounded transition-colors"
                              aria-label={t('addShiftAria', {
                                name: assignee.display_name,
                                date: day.date_iso,
                              })}
                            >
                              +
                            </button>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Single ShiftForm instance shared across all cells */}
      {isEditor && selectedDayId && (
        <ShiftForm
          isOpen={formOpen}
          onClose={() => setFormOpen(false)}
          dayId={selectedDayId}
          assignees={assignees}
          editItem={editShift}
          onSuccess={handleSaved}
          defaultUserId={selectedUserId ?? undefined}
        />
      )}
    </div>
  )
}
