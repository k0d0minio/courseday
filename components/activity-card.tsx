'use client';

import { useState, useTransition } from 'react';
import { Pencil, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { deleteActivity, deleteActivityRecurrenceGroup, deleteActivityFromHere } from '@/app/actions/activities';
import { AllergenBadgeRow } from '@/components/allergen-badge';
import { filterAllergenCodes } from '@/lib/allergens';
import type { ActivityWithRelations } from '@/types/index';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type Props = {
  item: ActivityWithRelations;
  isEditor: boolean;
  onEdit: (item: ActivityWithRelations) => void;
  onDeleted: (id: string, mode: 'single' | 'all' | 'from-here') => void;
};

export function ActivityCard({ item, isEditor, onEdit, onDeleted }: Props) {
  const t = useTranslations('Tenant.entry');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();
  const isRecurring = !!item.recurrence_group_id;
  const allergens = filterAllergenCodes(item.allergens);

  function handleDelete(mode: 'single' | 'all' | 'from-here') {
    startDeleteTransition(async () => {
      let result;
      if (mode === 'all' && item.recurrence_group_id) {
        result = await deleteActivityRecurrenceGroup(item.recurrence_group_id);
      } else if (mode === 'from-here' && item.recurrence_group_id) {
        result = await deleteActivityFromHere(item.id, item.recurrence_group_id);
      } else {
        result = await deleteActivity(item.id);
      }

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(mode === 'all' ? t('allDeleted') : mode === 'from-here' ? t('fromHereDeleted') : t('deleted'));
      setDeleteOpen(false);
      onDeleted(item.id, mode);
    });
  }

  return (
    <>
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex items-start justify-between gap-3">
            {/* Left: details */}
            <div className="flex-1 min-w-0 space-y-1.5">
              {isRecurring && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <RefreshCw className="h-3 w-3" /> {t('recurring')}
                </span>
              )}

              {/* Tags */}
              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-block text-xs bg-muted px-1.5 py-0.5 rounded"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Title */}
              <p className="font-medium leading-snug truncate">{item.title}</p>

              {/* Time range */}
              {(item.start_time || item.end_time) && (
                <p className="text-sm text-muted-foreground">
                  {formatTimeRange(item.start_time, item.end_time, t)}
                </p>
              )}

              {/* Expected covers */}
              {item.expected_covers != null && (
                <p className="text-sm text-muted-foreground">
                  {t('covers', { count: item.expected_covers })}
                </p>
              )}

              {/* Venue type */}
              {item.venue_type && (
                <p className="text-sm text-muted-foreground">{item.venue_type.name}</p>
              )}

              {/* Point of contact */}
              {item.point_of_contact && (
                <p className="text-sm text-muted-foreground">{item.point_of_contact.name}</p>
              )}

              {/* Allergens */}
              {allergens.length > 0 && (
                <AllergenBadgeRow codes={allergens} />
              )}

              {/* Notes */}
              {item.notes && (
                <p className="text-sm text-muted-foreground italic">{item.notes}</p>
              )}
            </div>

            {/* Right: actions */}
            {isEditor && (
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => onEdit(item)} aria-label={`Edit: ${item.title}`}>
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleteOpen(true)} aria-label={`Delete: ${item.title}`}>
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
            <AlertDialogTitle>{isRecurring ? t('deleteRecurringTitle') : t('deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {isRecurring
                ? t('deleteRecurringDescription')
                : t('deleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={isRecurring ? 'flex-col sm:flex-row gap-2' : undefined}>
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
  );
}

function formatTimeRange(
  start: string | null,
  end: string | null,
  t: ReturnType<typeof useTranslations<'Tenant.entry'>>
): string {
  const fmt = (s: string) => s.slice(0, 5);
  if (start && end) return t('timeRange', { start: fmt(start), end: fmt(end) });
  if (start) return t('timeFrom', { time: fmt(start) });
  if (end) return t('timeUntil', { time: fmt(end) });
  return '';
}
