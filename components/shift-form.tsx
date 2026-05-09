'use client'

import { useEffect, useTransition } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { createShift, updateShift } from '@/app/actions/shifts'
import { shiftSchema, type ShiftFormData } from '@/lib/shift-schema'
import type { Shift, ShiftAssignee, ShiftWithAssignee } from '@/types/index'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

function attachAssignee(shift: Shift, assignees: ShiftAssignee[]): ShiftWithAssignee {
  const assignee =
    assignees.find((a) => a.user_id === shift.user_id) ??
    ({
      user_id: shift.user_id,
      email: '',
      display_name: '—',
    } satisfies ShiftAssignee)

  return { ...shift, assignee }
}

type Props = {
  isOpen: boolean
  onClose: () => void
  dayId: string
  assignees: ShiftAssignee[]
  editItem: ShiftWithAssignee | null
  onSuccess: (item: ShiftWithAssignee) => void
  /** Pre-select this user when opening the form for a new shift. */
  defaultUserId?: string | undefined
}

export function ShiftForm({
  isOpen,
  onClose,
  dayId,
  assignees,
  editItem,
  onSuccess,
  defaultUserId,
}: Props) {
  const t = useTranslations('Tenant.staff.shiftForm')
  const [isPending, startTransition] = useTransition()
  const isEditing = !!editItem

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ShiftFormData>({
    resolver: standardSchemaResolver(shiftSchema),
    defaultValues: defaultValues(editItem),
  })

  useEffect(() => {
    reset(defaultValues(editItem, defaultUserId))
  }, [editItem, isOpen, defaultUserId, reset])

  function onSubmit(data: ShiftFormData) {
    startTransition(async () => {
      const result = isEditing
        ? await updateShift(editItem!.id, dayId, data)
        : await createShift(dayId, data)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      onSuccess(attachAssignee(result.data, assignees))
      toast.success(isEditing ? t('updated') : t('saved'))
      onClose()
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('editTitle') : t('addTitle')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('staffMemberLabel')}</Label>
            <Controller
              name="user_id"
              control={control}
              render={({ field }) => (
                <Select value={field.value || ''} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('staffPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {assignees.map((a) => (
                      <SelectItem key={a.user_id} value={a.user_id}>
                        {a.display_name}
                        {a.email && a.email !== a.display_name ? (
                          <span className="text-muted-foreground ml-1 text-xs">{a.email}</span>
                        ) : null}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.user_id && <p className="text-destructive text-sm">{errors.user_id.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="shift-role">{t('roleLabel')}</Label>
            <Input id="shift-role" {...register('role')} placeholder={t('rolePlaceholder')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="shift-start">{t('startLabel')}</Label>
              <Input id="shift-start" type="time" {...register('start_time')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shift-end">{t('endLabel')}</Label>
              <Input id="shift-end" type="time" {...register('end_time')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="shift-notes">{t('notesLabel')}</Label>
            <Textarea id="shift-notes" rows={2} {...register('notes')} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isPending || assignees.length === 0}>
              {isPending ? t('saving') : t('save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function defaultValues(editItem: ShiftWithAssignee | null, defaultUserId?: string): ShiftFormData {
  if (!editItem) {
    return {
      user_id: defaultUserId ?? '',
      role: '',
      start_time: '',
      end_time: '',
      notes: '',
    }
  }
  return {
    user_id: editItem.user_id,
    role: editItem.role ?? '',
    start_time: editItem.start_time ? editItem.start_time.slice(0, 5) : '',
    end_time: editItem.end_time ? editItem.end_time.slice(0, 5) : '',
    notes: editItem.notes ?? '',
  }
}
