'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { toast } from 'sonner'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  getAllVenueTypes,
  createVenueType,
  updateVenueType,
  deleteVenueType,
} from '@/app/actions/venue-type'
import { makeVenueTypeSchema, type VenueTypeFormData } from '@/lib/venue-type-schema'
import type { VenueType } from '@/types/index'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function VenueTypeDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial: VenueType | null
  onSaved: (vt: VenueType) => void
}) {
  const t = useTranslations('Tenant.venueType')
  const tValidation = useTranslations('Tenant.validation')
  const schema = useMemo(() => makeVenueTypeSchema(tValidation), [tValidation])
  const [isPending, startTransition] = useTransition()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VenueTypeFormData>({
    resolver: standardSchemaResolver(schema),
    defaultValues: { name: '' },
  })

  useEffect(() => {
    reset(initial ? { name: initial.name } : { name: '' })
  }, [initial, open, reset])

  function onSubmit(data: VenueTypeFormData) {
    startTransition(async () => {
      const result = initial ? await updateVenueType(initial.id, data) : await createVenueType(data)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success(initial ? t('updated') : t('added'))
      onSaved(result.data)
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit venue type' : 'Add venue type'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vt-name">Name *</Label>
            <Input id="vt-name" {...register('name')} />
            {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function VenueTypeManagement() {
  const t = useTranslations('Tenant.venueType')
  const [venueTypes, setVenueTypes] = useState<VenueType[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<VenueType | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<VenueType | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, startDeleteTransition] = useTransition()

  useEffect(() => {
    getAllVenueTypes().then((result) => {
      if (result.success) {
        setVenueTypes(result.data)
      } else {
        toast.error(result.error)
      }
      setLoading(false)
    })
  }, [])

  function handleSaved(vt: VenueType) {
    setVenueTypes((prev) => {
      const idx = prev.findIndex((v) => v.id === vt.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = vt
        return next
      }
      return [...prev, vt].sort((a, b) => a.name.localeCompare(b.name))
    })
  }

  function confirmDelete() {
    if (!deleteTarget) return
    startDeleteTransition(async () => {
      const result = await deleteVenueType(deleteTarget.id)
      if (!result.success) {
        setDeleteError(result.error)
        return
      }
      setVenueTypes((prev) => prev.filter((v) => v.id !== deleteTarget.id))
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
          <Plus className="mr-1 h-4 w-4" /> Add venue type
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : venueTypes.length === 0 ? (
        <p className="text-muted-foreground text-sm">No venue types yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {venueTypes.map((vt) => (
              <TableRow key={vt.id}>
                <TableCell className="font-medium">{vt.name}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(vt)
                        setDialogOpen(true)
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setDeleteTarget(vt)
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

      <VenueTypeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
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
            <AlertDialogTitle>Delete venue type?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteError ? (
                <span className="text-destructive">{deleteError}</span>
              ) : (
                <>
                  This will permanently delete <strong>{deleteTarget?.name}</strong>.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {!deleteError && (
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
