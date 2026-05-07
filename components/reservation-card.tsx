'use client'

import { useState, useTransition } from 'react'
import { Pencil, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { TableBreakdownDisplay } from '@/components/table-breakdown-display'
import { AllergenBadgeRow } from '@/components/allergen-badge'
import { filterAllergenCodes } from '@/lib/allergens'
import { mutateWithOfflineQueue } from '@/lib/day-mutation-client'
import { useTenant } from '@/lib/tenant-context'
import type { Reservation } from '@/types/index'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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

type Props = {
  item: Reservation
  isEditor: boolean
  onEdit: (item: Reservation) => void
  onDeleted: (id: string) => void
  onBeforeEdit?: (trigger: HTMLElement) => void
  handoverStatus?: 'new' | 'edited' | null
}

export function ReservationCard({
  item,
  isEditor,
  onEdit,
  onDeleted,
  onBeforeEdit,
  handoverStatus,
}: Props) {
  const t = useTranslations('Tenant.reservation')
  const th = useTranslations('Tenant.handover')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, startDeleteTransition] = useTransition()
  const { tenantSlug } = useTenant()

  const breakdown = Array.isArray(item.table_breakdown) ? (item.table_breakdown as number[]) : []
  const allergens = filterAllergenCodes(item.allergens)
  const isPending = item.id.startsWith('pending-')

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await mutateWithOfflineQueue<void>({
        entity: 'reservations',
        operation: 'delete',
        tenantSlug,
        dayId: item.day_id,
        payload: { id: item.id },
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(result.pending ? t('deleted') : t('deleted'))
      setDeleteOpen(false)
      onDeleted(item.id)
    })
  }

  return (
    <>
      <Card className={isPending ? 'opacity-70' : undefined}>
        <CardContent className="px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1.5">
              {/* Name + count */}
              <div className="flex items-baseline gap-2">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {item.guest_name ?? t('fallbackName')}
                  {handoverStatus === 'new' && (
                    <Badge variant="default" className="shrink-0 text-[10px] uppercase">
                      {th('badgeNew')}
                    </Badge>
                  )}
                  {handoverStatus === 'edited' && (
                    <Badge variant="secondary" className="shrink-0 text-[10px] uppercase">
                      {th('badgeEdited')}
                    </Badge>
                  )}
                  {isPending && (
                    <Loader2 className="text-muted-foreground h-3.5 w-3.5 animate-spin" />
                  )}
                </p>
                {item.guest_count != null && (
                  <span className="text-muted-foreground text-sm">
                    {t('guests', { count: item.guest_count })}
                  </span>
                )}
              </div>

              {/* Time range */}
              {(item.start_time || item.end_time) && (
                <p className="text-muted-foreground text-sm">
                  {formatTimeRange(item.start_time, item.end_time)}
                </p>
              )}

              {/* Table layout */}
              {breakdown.length > 0 && <TableBreakdownDisplay breakdown={breakdown} />}

              {/* Allergens */}
              {allergens.length > 0 && <AllergenBadgeRow codes={allergens} />}

              {/* Notes */}
              {item.notes && <p className="text-muted-foreground text-sm italic">{item.notes}</p>}
            </div>

            {isEditor && (
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    onBeforeEdit?.(e.currentTarget)
                    onEdit(item)
                  }}
                  aria-label={`Edit: ${item.guest_name ?? t('fallbackName')}`}
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteOpen(true)}
                  aria-label={`Delete: ${item.guest_name ?? t('fallbackName')}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? t('deleting') : t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function formatTimeRange(start: string | null, end: string | null): string {
  const fmt = (s: string) => s.slice(0, 5)
  if (start && end) return `${fmt(start)} \u2013 ${fmt(end)}`
  if (start) return fmt(start)
  if (end) return fmt(end)
  return ''
}
