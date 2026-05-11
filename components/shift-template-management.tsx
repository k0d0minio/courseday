'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { toast } from 'sonner'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  listShiftTemplates,
  createShiftTemplate,
  updateShiftTemplate,
  deleteShiftTemplate,
} from '@/app/actions/shift-templates'
import { makeShiftTemplateSchema, type ShiftTemplateFormData } from '@/lib/shift-template-schema'
import type { ShiftTemplate } from '@/types/index'
import type { ShiftAssignee } from '@/types/index'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// ---------------------------------------------------------------------------
// Form dialog
// ---------------------------------------------------------------------------

function TemplateDialog({
  open,
  onOpenChange,
  initial,
  assignees,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial: ShiftTemplate | null
  assignees: ShiftAssignee[]
  onSaved: (template: ShiftTemplate) => void
}) {
  const t = useTranslations('Tenant.staff.templates')
  const tValidation = useTranslations('Tenant.validation')
  const schema = useMemo(() => makeShiftTemplateSchema(tValidation), [tValidation])
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ShiftTemplateFormData>({
    resolver: standardSchemaResolver(schema),
    defaultValues: toFormValues(initial),
  })

  useEffect(() => {
    reset(toFormValues(initial))
  }, [initial, open, reset])

  function onSubmit(data: ShiftTemplateFormData) {
    startTransition(async () => {
      const result = initial
        ? await updateShiftTemplate(initial.id, data)
        : await createShiftTemplate(data)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success(initial ? t('updated') : t('saved'))
      onSaved(result.data)
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? t('editTitle') : t('addTitle')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="st-name">{t('nameLabel')} *</Label>
            <Input id="st-name" {...register('name')} />
            {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="st-role">{t('roleLabel')}</Label>
            <Input id="st-role" {...register('role')} placeholder={t('rolePlaceholder')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="st-start">{t('startLabel')}</Label>
              <Input id="st-start" type="time" {...register('start_time')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="st-end">{t('endLabel')}</Label>
              <Input id="st-end" type="time" {...register('end_time')} />
            </div>
          </div>

          {assignees.length > 0 && (
            <div className="space-y-2">
              <Label>{t('defaultUserLabel')}</Label>
              <Controller
                name="default_user_id"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || ''}
                    onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('defaultUserPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      {assignees.map((a) => (
                        <SelectItem key={a.user_id} value={a.user_id}>
                          {a.display_name}
                          {a.job_title ? (
                            <span className="text-muted-foreground ml-1 text-xs">
                              {a.job_title}
                            </span>
                          ) : null}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="st-notes">{t('notesLabel')}</Label>
            <Textarea id="st-notes" rows={2} {...register('notes')} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t('saving') : t('save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ShiftTemplateManagement({ assignees = [] }: { assignees?: ShiftAssignee[] }) {
  const t = useTranslations('Tenant.staff.templates')
  const [templates, setTemplates] = useState<ShiftTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ShiftTemplate | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ShiftTemplate | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, startDeleteTransition] = useTransition()

  useEffect(() => {
    listShiftTemplates().then((result) => {
      if (result.success) setTemplates(result.data)
      else toast.error(result.error)
      setLoading(false)
    })
  }, [])

  function handleSaved(template: ShiftTemplate) {
    setTemplates((prev) => {
      const idx = prev.findIndex((t) => t.id === template.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = template
        return next
      }
      return [...prev, template].sort((a, b) => a.name.localeCompare(b.name))
    })
  }

  function confirmDelete() {
    if (!deleteTarget) return
    startDeleteTransition(async () => {
      const result = await deleteShiftTemplate(deleteTarget.id)
      if (!result.success) {
        setDeleteError(result.error)
        return
      }
      setTemplates((prev) => prev.filter((t) => t.id !== deleteTarget.id))
      toast.success(t('deleted'))
      setDeleteTarget(null)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => {
            setEditing(null)
            setDialogOpen(true)
          }}
        >
          <Plus className="mr-1 h-4 w-4" />
          {t('add')}
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">{t('loading')}</p>
      ) : templates.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('empty')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('nameCol')}</TableHead>
              <TableHead>{t('roleCol')}</TableHead>
              <TableHead>{t('timeCol')}</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((tmpl) => (
              <TableRow key={tmpl.id}>
                <TableCell className="font-medium">{tmpl.name}</TableCell>
                <TableCell>{tmpl.role || '—'}</TableCell>
                <TableCell>
                  {tmpl.start_time || tmpl.end_time
                    ? [tmpl.start_time, tmpl.end_time].filter(Boolean).join(' – ')
                    : '—'}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="iconSm"
                      onClick={() => {
                        setEditing(tmpl)
                        setDialogOpen(true)
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="iconSm"
                      onClick={() => {
                        setDeleteTarget(tmpl)
                        setDeleteError(null)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <TemplateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        assignees={assignees}
        onSaved={handleSaved}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => {
          if (!v) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteError ? (
                <span className="text-destructive">{deleteError}</span>
              ) : (
                t('deleteDescription', { name: deleteTarget?.name ?? '' })
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            {!deleteError && (
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? t('deleting') : t('delete')}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toFormValues(template: ShiftTemplate | null): ShiftTemplateFormData {
  if (!template) {
    return { name: '', role: '', start_time: '', end_time: '', default_user_id: '', notes: '' }
  }
  return {
    name: template.name,
    role: template.role ?? '',
    start_time: template.start_time ? template.start_time.slice(0, 5) : '',
    end_time: template.end_time ? template.end_time.slice(0, 5) : '',
    default_user_id: template.default_user_id ?? '',
    notes: template.notes ?? '',
  }
}
