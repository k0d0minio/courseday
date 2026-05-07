'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { ShiftCard } from '@/components/shift-card'
import { ShiftForm } from '@/components/shift-form'
import { Button } from '@/components/ui/button'
import type { ShiftAssignee, ShiftWithAssignee } from '@/types/index'

type Props = {
  dayId: string
  shifts: ShiftWithAssignee[]
  assignees: ShiftAssignee[]
  isEditor: boolean
  onShiftsChange: React.Dispatch<React.SetStateAction<ShiftWithAssignee[]>>
}

export function StaffScheduleSection({
  dayId,
  shifts,
  assignees,
  isEditor,
  onShiftsChange,
}: Props) {
  const t = useTranslations('Tenant.staff.section')
  const [formOpen, setFormOpen] = useState(false)
  const [editShift, setEditShift] = useState<ShiftWithAssignee | null>(null)

  function openAdd() {
    setEditShift(null)
    setFormOpen(true)
  }

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

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">{t('title')}</h2>
        {isEditor && (
          <Button
            size="xs"
            onClick={openAdd}
            disabled={assignees.length === 0}
            className="shrink-0"
          >
            <Plus className="size-3.5" /> {t('addShift')}
          </Button>
        )}
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
            />
          ))}
        </div>
      )}

      {isEditor && (
        <ShiftForm
          isOpen={formOpen}
          onClose={() => setFormOpen(false)}
          dayId={dayId}
          assignees={assignees}
          editItem={editShift}
          onSuccess={handleSaved}
        />
      )}
    </section>
  )
}
