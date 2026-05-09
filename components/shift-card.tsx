'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Pencil, Trash2, Timer } from 'lucide-react'
import { toast } from 'sonner'
import { deleteShift, clockInShift, clockOutShift } from '@/app/actions/shifts'
import type { ShiftWithAssignee } from '@/types/index'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ShiftActualsDialog } from '@/components/shift-actuals-dialog'

type Props = {
  dayId: string
  item: ShiftWithAssignee
  isEditor: boolean
  onEdit?: (item: ShiftWithAssignee) => void
  onDeleted?: (id: string) => void
  onUpdated?: (item: ShiftWithAssignee) => void
}

function formatShiftTimes(start: string | null, end: string | null): string {
  const fmt = (s: string) => s.slice(0, 5)
  if (start && end) return `${fmt(start)} – ${fmt(end)}`
  if (start) return fmt(start)
  if (end) return fmt(end)
  return ''
}

function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function deltaMinutes(start: string, end: string): number {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)
}

function formatDelta(mins: number): string {
  const sign = mins >= 0 ? '+' : '-'
  const abs = Math.abs(mins)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  if (h === 0) return `${sign}${m}min`
  return `${sign}${h}h${m > 0 ? ` ${m}min` : ''}`
}

export function ShiftCard({ dayId, item, isEditor, onEdit, onDeleted, onUpdated }: Props) {
  const t = useTranslations('Tenant.staff.card')
  const tActuals = useTranslations('Tenant.staff.actuals')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [actualsOpen, setActualsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [localItem, setLocalItem] = useState(item)

  const timeLabel = formatShiftTimes(localItem.start_time, localItem.end_time)
  const roleLabel = localItem.role?.trim()

  const hasActualStart = !!localItem.actual_start
  const hasActualEnd = !!localItem.actual_end
  const showActuals = hasActualStart

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteShift(localItem.id, dayId)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      onDeleted?.(localItem.id)
      toast.success(t('deleted'))
      setConfirmOpen(false)
    })
  }

  function handleClockIn() {
    startTransition(async () => {
      const result = await clockInShift(localItem.id)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      const updated = { ...localItem, ...result.data }
      setLocalItem(updated)
      onUpdated?.(updated)
      toast.success(tActuals('clockedIn'))
    })
  }

  function handleClockOut() {
    startTransition(async () => {
      const result = await clockOutShift(localItem.id)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      const updated = { ...localItem, ...result.data }
      setLocalItem(updated)
      onUpdated?.(updated)
      toast.success(tActuals('clockedOut'))
    })
  }

  function handleActualsSaved(updated: ShiftWithAssignee) {
    setLocalItem(updated)
    onUpdated?.(updated)
  }

  const actualLabel = (() => {
    if (!hasActualStart) return null
    const start = formatTimestamp(localItem.actual_start!)
    if (!hasActualEnd) return `${start} –`
    const end = formatTimestamp(localItem.actual_end!)
    const delta = deltaMinutes(localItem.actual_start!, localItem.actual_end!)
    const scheduledDelta =
      localItem.start_time && localItem.end_time
        ? (() => {
            const today = new Date().toISOString().slice(0, 10)
            const sched = deltaMinutes(
              `${today}T${localItem.start_time}`,
              `${today}T${localItem.end_time}`
            )
            return formatDelta(delta - sched)
          })()
        : formatDelta(delta)
    return `${start} – ${end} (Δ ${scheduledDelta})`
  })()

  return (
    <>
      <div className="bg-card space-y-2 rounded-lg border p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="font-semibold">{localItem.assignee.display_name}</p>
            {(roleLabel || timeLabel) && (
              <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 text-sm">
                {roleLabel && <span>{roleLabel}</span>}
                {timeLabel && (
                  <span>
                    {tActuals('scheduled')}: {timeLabel}
                  </span>
                )}
              </div>
            )}
            {showActuals && actualLabel && (
              <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 text-sm">
                <span>
                  {tActuals('actual')}: {actualLabel}
                </span>
              </div>
            )}
          </div>
          {isEditor && (
            <div className="flex shrink-0 gap-1">
              {!hasActualStart && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={handleClockIn}
                  disabled={isPending}
                >
                  {tActuals('clockIn')}
                </Button>
              )}
              {hasActualStart && !hasActualEnd && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={handleClockOut}
                  disabled={isPending}
                >
                  {tActuals('clockOut')}
                </Button>
              )}
              {showActuals && (
                <Button
                  type="button"
                  variant="ghost"
                  size="iconSm"
                  onClick={() => setActualsOpen(true)}
                  aria-label={tActuals('editActualsAria')}
                >
                  <Timer className="h-4 w-4" />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="iconSm"
                onClick={() => onEdit?.(localItem)}
                aria-label={t('editAria')}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="iconSm"
                className="text-destructive"
                onClick={() => setConfirmOpen(true)}
                aria-label={t('deleteAria')}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        {localItem.notes && (
          <p className="text-muted-foreground text-sm italic">{localItem.notes}</p>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending}>
              {isPending ? t('deleting') : t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {actualsOpen && (
        <ShiftActualsDialog
          open={actualsOpen}
          onClose={() => setActualsOpen(false)}
          item={localItem}
          onSaved={handleActualsSaved}
        />
      )}
    </>
  )
}
