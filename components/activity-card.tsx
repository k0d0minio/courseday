'use client';

import { useState, useTransition } from 'react';
import { Pencil, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { deleteActivity, deleteActivityRecurrenceGroup } from '@/app/actions/activities';
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
  onDeleted: (id: string, mode: 'single' | 'all') => void;
};

export function ActivityCard({ item, isEditor, onEdit, onDeleted }: Props) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();
  const isRecurring = !!item.recurrence_group_id;

  function handleDelete(mode: 'single' | 'all') {
    startDeleteTransition(async () => {
      const result =
        mode === 'all' && item.recurrence_group_id
          ? await deleteActivityRecurrenceGroup(item.recurrence_group_id)
          : await deleteActivity(item.id);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(mode === 'all' ? 'All occurrences deleted.' : 'Activity deleted.');
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
                  <RefreshCw className="h-3 w-3" /> Recurring
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
                  {formatTimeRange(item.start_time, item.end_time)}
                </p>
              )}

              {/* Expected covers */}
              {item.expected_covers != null && (
                <p className="text-sm text-muted-foreground">
                  {item.expected_covers} covers
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

              {/* Notes */}
              {item.notes && (
                <p className="text-sm text-muted-foreground italic">{item.notes}</p>
              )}
            </div>

            {/* Right: actions */}
            {isEditor && (
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete activity?</AlertDialogTitle>
            <AlertDialogDescription>
              {isRecurring
                ? 'This is a recurring activity. Choose what to delete.'
                : <>This will permanently delete <strong>{item.title}</strong>.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={isRecurring ? 'flex-col sm:flex-row gap-2' : undefined}>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            {isRecurring ? (
              <>
                <AlertDialogAction
                  onClick={() => handleDelete('single')}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? 'Deleting…' : 'Delete this occurrence'}
                </AlertDialogAction>
                <AlertDialogAction
                  onClick={() => handleDelete('all')}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? 'Deleting…' : 'Delete all occurrences'}
                </AlertDialogAction>
              </>
            ) : (
              <AlertDialogAction
                onClick={() => handleDelete('single')}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function formatTimeRange(start: string | null, end: string | null): string {
  if (start && end) return `${start} – ${end}`;
  if (start) return `From ${start}`;
  if (end) return `Until ${end}`;
  return '';
}
