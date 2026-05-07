'use client'

import { useMemo, useState, useTransition } from 'react'
import { Pencil, Trash2, RefreshCw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { setChecklistItemDone } from '@/app/actions/checklists'
import { AllergenBadgeRow } from '@/components/allergen-badge'
import { filterAllergenCodes } from '@/lib/allergens'
import { mutateWithOfflineQueue } from '@/lib/day-mutation-client'
import { useTenant } from '@/lib/tenant-context'
import type { ActivityWithRelations } from '@/types/index'
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
  item: ActivityWithRelations
  isEditor: boolean
  onEdit: (item: ActivityWithRelations) => void
  onDeleted: (id: string, mode: 'single' | 'all' | 'from-here') => void
  /** Called with the edit control element before opening the editor (focus return). */
  onBeforeEdit?: (trigger: HTMLElement) => void
  handoverStatus?: 'new' | 'edited' | null
}

export function ActivityCard({
  item,
  isEditor,
  onEdit,
  onDeleted,
  onBeforeEdit,
  handoverStatus,
}: Props) {
  const t = useTranslations('Tenant.entry')
  const th = useTranslations('Tenant.handover')
  const tChecklist = useTranslations('Tenant.checklists')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [checklistOpen, setChecklistOpen] = useState(false)
  const [isDeleting, startDeleteTransition] = useTransition()
  const [isToggling, startToggleTransition] = useTransition()
  const { tenantSlug } = useTenant()
  const isRecurring = !!item.recurrence_group_id
  const isPending = item.id.startsWith('pending-')
  const allergens = filterAllergenCodes(item.allergens)
  const checklistItems = item.checklist_items ?? []
  const checklistDone = useMemo(
    () => checklistItems.filter((it) => it.is_done).length,
    [checklistItems]
  )

  function handleDelete(mode: 'single' | 'all' | 'from-here') {
    startDeleteTransition(async () => {
      const result = await mutateWithOfflineQueue<void>({
        entity: 'activities',
        operation: 'delete',
        tenantSlug,
        dayId: item.day_id,
        payload: {
          id: item.id,
          mode,
          recurrenceGroupId: item.recurrence_group_id,
        },
      })

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success(
        mode === 'all'
          ? t('allDeleted')
          : mode === 'from-here'
            ? t('fromHereDeleted')
            : t('deleted')
      )
      setDeleteOpen(false)
      onDeleted(item.id, mode)
    })
  }

  function handleChecklistToggle(id: string, done: boolean) {
    if (!isEditor) return
    startToggleTransition(async () => {
      const result = await setChecklistItemDone(id, done)
      if (!result.success) {
        toast.error(result.error)
      }
    })
  }

  return (
    <>
      <Card className={isPending ? 'opacity-70' : undefined}>
        <CardContent className="px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            {/* Left: details */}
            <div className="min-w-0 flex-1 space-y-1.5">
              {isRecurring && (
                <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                  <RefreshCw className="h-3 w-3" /> {t('recurring')}
                </span>
              )}

              {/* Tags */}
              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="bg-muted inline-block rounded px-1.5 py-0.5 text-xs"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Title */}
              <p className="flex flex-wrap items-center gap-2 truncate leading-snug font-medium">
                {item.title}
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

              {/* Time range */}
              {(item.start_time || item.end_time) && (
                <p className="text-muted-foreground text-sm">
                  {formatTimeRange(item.start_time, item.end_time, t)}
                </p>
              )}

              {/* Expected covers */}
              {item.expected_covers != null && (
                <p className="text-muted-foreground text-sm">
                  {t('covers', { count: item.expected_covers })}
                </p>
              )}

              {/* Venue type */}
              {item.venue_type && (
                <p className="text-muted-foreground text-sm">{item.venue_type.name}</p>
              )}

              {/* Point of contact */}
              {item.point_of_contact && (
                <p className="text-muted-foreground text-sm">{item.point_of_contact.name}</p>
              )}

              {/* Allergens */}
              {allergens.length > 0 && <AllergenBadgeRow codes={allergens} />}

              {/* Notes */}
              {item.notes && <p className="text-muted-foreground text-sm italic">{item.notes}</p>}

              {checklistItems.length > 0 && (
                <div className="space-y-2 pt-1">
                  <Button
                    type="button"
                    variant="link"
                    size="inline"
                    onClick={() => setChecklistOpen((v) => !v)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {tChecklist('progress', {
                      done: checklistDone,
                      total: checklistItems.length,
                    })}
                  </Button>
                  {checklistOpen && (
                    <ul className="space-y-1">
                      {checklistItems.map((checkItem) => (
                        <li key={checkItem.id} className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4"
                            checked={checkItem.is_done}
                            disabled={!isEditor || isToggling}
                            onChange={(e) => handleChecklistToggle(checkItem.id, e.target.checked)}
                          />
                          <span
                            className={
                              checkItem.is_done
                                ? 'text-muted-foreground text-sm line-through'
                                : 'text-sm'
                            }
                          >
                            {checkItem.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Right: actions */}
            {isEditor && (
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    onBeforeEdit?.(e.currentTarget)
                    onEdit(item)
                  }}
                  aria-label={`Edit: ${item.title}`}
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteOpen(true)}
                  aria-label={`Delete: ${item.title}`}
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
            <AlertDialogTitle>
              {isRecurring ? t('deleteRecurringTitle') : t('deleteTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isRecurring ? t('deleteRecurringDescription') : t('deleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={isRecurring ? 'flex-col gap-2 sm:flex-row' : undefined}>
            <AlertDialogCancel disabled={isDeleting}>{t('cancel')}</AlertDialogCancel>
            {isRecurring ? (
              <>
                <AlertDialogAction
                  onClick={() => handleDelete('single')}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? t('deleting') : t('deleteThisOnly')}
                </AlertDialogAction>
                <AlertDialogAction
                  onClick={() => handleDelete('from-here')}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? t('deleting') : t('deleteFromHere')}
                </AlertDialogAction>
                <AlertDialogAction
                  onClick={() => handleDelete('all')}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? t('deleting') : t('deleteAllOccurrences')}
                </AlertDialogAction>
              </>
            ) : (
              <AlertDialogAction
                onClick={() => handleDelete('single')}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? t('deleting') : t('delete')}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function formatTimeRange(
  start: string | null,
  end: string | null,
  t: ReturnType<typeof useTranslations<'Tenant.entry'>>
): string {
  const fmt = (s: string) => s.slice(0, 5)
  if (start && end) return t('timeRange', { start: fmt(start), end: fmt(end) })
  if (start) return t('timeFrom', { time: fmt(start) })
  if (end) return t('timeUntil', { time: fmt(end) })
  return ''
}
