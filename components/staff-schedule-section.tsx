'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Upload } from 'lucide-react'
import { ShiftCard } from '@/components/shift-card'
import { ShiftForm } from '@/components/shift-form'
import { ShiftImportDialog } from '@/components/shift-import-dialog'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { ShiftAssignee, ShiftWithAssignee } from '@/types/index'

type ForecastBreakdownItem = { source: string; count: number }

type Props = {
  dayId: string
  shifts: ShiftWithAssignee[]
  assignees: ShiftAssignee[]
  isEditor: boolean
  onShiftsChange: React.Dispatch<React.SetStateAction<ShiftWithAssignee[]>>
  forecastRecommended: number
  forecastBreakdown: ForecastBreakdownItem[]
  addTriggerRef?: React.MutableRefObject<(() => void) | null>
}

function parseMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

function shiftScheduledMinutes(s: ShiftWithAssignee): number {
  if (!s.start_time || !s.end_time) return 0
  return Math.max(0, parseMinutes(s.end_time) - parseMinutes(s.start_time))
}

function shiftActualMinutes(s: ShiftWithAssignee): number {
  if (!s.actual_start || !s.actual_end) return 0
  return Math.max(
    0,
    Math.round((new Date(s.actual_end).getTime() - new Date(s.actual_start).getTime()) / 60000)
  )
}

function fmtHours(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (m === 0) return `${h}h`
  return `${h}h${m}m`
}

export function StaffScheduleSection({
  dayId,
  shifts,
  assignees,
  isEditor,
  onShiftsChange,
  forecastRecommended,
  forecastBreakdown,
  addTriggerRef,
}: Props) {
  const t = useTranslations('Tenant.staff.section')
  const tForecast = useTranslations('Tenant.staff.forecast')
  const [formOpen, setFormOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editShift, setEditShift] = useState<ShiftWithAssignee | null>(null)

  const totalScheduled = shifts.reduce((sum, s) => sum + shiftScheduledMinutes(s), 0)
  const totalActual = shifts.reduce((sum, s) => sum + shiftActualMinutes(s), 0)
  const hasActuals = shifts.some((s) => s.actual_start)

  const openAdd = useCallback(() => {
    setEditShift(null)
    setFormOpen(true)
  }, [])

  useEffect(() => {
    if (addTriggerRef) {
      addTriggerRef.current = openAdd
      return () => {
        addTriggerRef.current = null
      }
    }
  }, [addTriggerRef, openAdd])

  function openEdit(item: ShiftWithAssignee) {
    setEditShift(item)
    setFormOpen(true)
  }

  function handleSaved(item: ShiftWithAssignee) {
    onShiftsChange((prev) => {
      const idx = prev.findIndex((s) => s.id === item.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = item
        return next.sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''))
      }
      return [...prev, item].sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''))
    })
  }

  function handleDeleted(id: string) {
    onShiftsChange((prev) => prev.filter((s) => s.id !== id))
  }

  function handleUpdated(item: ShiftWithAssignee) {
    onShiftsChange((prev) => prev.map((s) => (s.id === item.id ? item : s)))
  }

  const scheduledCount = shifts.length
  const isAdequate = scheduledCount >= forecastRecommended

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <h2 className="font-semibold">{t('title')}</h2>
          {shifts.length > 0 && (
            <p className="text-muted-foreground text-xs">
              {t('scheduledSummary', { hours: fmtHours(totalScheduled) })}
              {hasActuals && ` · ${t('actualSummary', { hours: fmtHours(totalActual) })}`}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isEditor && (
            <Button type="button" variant="outline" size="xs" onClick={() => setImportOpen(true)}>
              <Upload className="mr-1.5 size-3.5" />
              {t('importShifts')}
            </Button>
          )}
          {isEditor && forecastRecommended > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      'inline-flex cursor-default items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                      isAdequate
                        ? 'border-green-200 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : 'border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                    )}
                  >
                    {tForecast('badge', {
                      recommended: forecastRecommended,
                      scheduled: scheduledCount,
                    })}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <ul className="space-y-0.5">
                    {forecastBreakdown.map((item) => (
                      <li key={item.source}>
                        {tForecast(item.source as 'activities' | 'reservations' | 'breakfast')}:{' '}
                        {tForecast('covers', { count: item.count })}
                      </li>
                    ))}
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
      {assignees.length === 0 && isEditor && (
        <p className="text-muted-foreground text-sm">{t('noStaffHint')}</p>
      )}
      {shifts.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('empty')}</p>
      ) : (
        <div className="space-y-2">
          {shifts.map((item) => (
            <ShiftCard
              key={item.id}
              dayId={dayId}
              item={item}
              isEditor={isEditor}
              onEdit={openEdit}
              onDeleted={handleDeleted}
              onUpdated={handleUpdated}
            />
          ))}
        </div>
      )}

      {isEditor && (
        <>
          <ShiftForm
            isOpen={formOpen}
            onClose={() => setFormOpen(false)}
            dayId={dayId}
            assignees={assignees}
            editItem={editShift}
            onSuccess={handleSaved}
          />
          <ShiftImportDialog
            isOpen={importOpen}
            onClose={() => setImportOpen(false)}
            onSuccess={() => setImportOpen(false)}
          />
        </>
      )}
    </section>
  )
}
