'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { setShiftActuals } from '@/app/actions/shifts'
import type { ShiftWithAssignee } from '@/types/index'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

type Props = {
  open: boolean
  onClose: () => void
  item: ShiftWithAssignee
  onSaved: (updated: ShiftWithAssignee) => void
}

function toDatetimeLocal(ts: string | null | undefined): string {
  if (!ts) return ''
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function ShiftActualsDialog({ open, onClose, item, onSaved }: Props) {
  const t = useTranslations('Tenant.staff.actuals')
  const [isPending, startTransition] = useTransition()
  const [actualStart, setActualStart] = useState(toDatetimeLocal(item.actual_start))
  const [actualEnd, setActualEnd] = useState(toDatetimeLocal(item.actual_end))

  function handleSave() {
    startTransition(async () => {
      const result = await setShiftActuals(item.id, {
        actual_start: actualStart ? new Date(actualStart).toISOString() : null,
        actual_end: actualEnd ? new Date(actualEnd).toISOString() : null,
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(t('saved'))
      onSaved({ ...item, ...result.data })
      onClose()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="actual-start">{t('actualStart')}</Label>
            <Input
              id="actual-start"
              type="datetime-local"
              value={actualStart}
              onChange={(e) => setActualStart(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="actual-end">{t('actualEnd')}</Label>
            <Input
              id="actual-end"
              type="datetime-local"
              value={actualEnd}
              onChange={(e) => setActualEnd(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? t('saving') : t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
