'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { getMemberSchedule, saveMemberSchedule } from '@/app/actions/member-schedules'
import type { ScheduleRow } from '@/app/actions/member-schedules'
import type { Member } from '@/app/actions/memberships'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type DraftRow = ScheduleRow & { key: string }

function rowKey(r: DraftRow) {
  return r.key
}

interface MemberScheduleEditorProps {
  member: Member | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MemberScheduleEditor({ member, open, onOpenChange }: MemberScheduleEditorProps) {
  const t = useTranslations('Tenant.members')
  const [rows, setRows] = useState<DraftRow[]>([])
  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()

  const DAY_OPTIONS = [0, 1, 2, 3, 4, 5, 6] as const

  useEffect(() => {
    if (!open || !member) return
    setLoading(true)
    getMemberSchedule(member.id).then((res) => {
      if (res.success) {
        setRows(res.data.map((r, i) => ({ ...r, key: `loaded-${i}-${Date.now()}` })))
      } else {
        toast.error(res.error)
      }
      setLoading(false)
    })
  }, [open, member])

  function addRow() {
    setRows((prev) => [
      ...prev,
      { day_of_week: 1, start_time: '09:00', end_time: '17:00', key: `new-${Date.now()}` },
    ])
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key))
  }

  function updateRow(key: string, patch: Partial<ScheduleRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  function handleSave() {
    if (!member) return
    startTransition(async () => {
      const result = await saveMemberSchedule(
        member.id,
        rows.map(({ day_of_week, start_time, end_time }) => ({ day_of_week, start_time, end_time }))
      )
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(t('scheduleSaved'))
      onOpenChange(false)
    })
  }

  const memberName = member
    ? [member.first_name, member.last_name].filter(Boolean).join(' ') || member.email
    : ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t('scheduleTitle')} — {memberName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-muted-foreground py-6 text-center text-sm">{t('loading')}</p>
        ) : (
          <div className="space-y-3 py-2">
            {rows.length === 0 && (
              <p className="text-muted-foreground py-4 text-center text-sm">{t('noSchedule')}</p>
            )}
            {rows.map((row) => (
              <div key={rowKey(row)} className="flex items-center gap-2">
                <Select
                  value={String(row.day_of_week)}
                  onValueChange={(v) => updateRow(row.key, { day_of_week: Number(v) })}
                >
                  <SelectTrigger className="!h-9 w-32 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_OPTIONS.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {t(`days.${d}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="time"
                  value={row.start_time}
                  onChange={(e) => updateRow(row.key, { start_time: e.target.value })}
                  className="h-9 w-28"
                  aria-label={t('startTime')}
                />
                <span className="text-muted-foreground text-sm">–</span>
                <Input
                  type="time"
                  value={row.end_time ?? ''}
                  onChange={(e) => updateRow(row.key, { end_time: e.target.value || null })}
                  className="h-9 w-28"
                  aria-label={t('endTime')}
                />
                <Button
                  variant="ghost"
                  size="iconSm"
                  onClick={() => removeRow(row.key)}
                  aria-label={t('removeRow')}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addRow}>
              <Plus className="size-4" />
              {t('addShift')}
            </Button>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {t('cancelAction')}
          </Button>
          <Button onClick={handleSave} disabled={isPending || loading}>
            {isPending ? t('saving') : t('save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
