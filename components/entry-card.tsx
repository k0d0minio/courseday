'use client';

import { useState, useTransition } from 'react';
import { Pencil, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { deleteProgramItem, deleteRecurrenceGroup } from '@/app/actions/program-items';
import type { ProgramItemWithRelations } from '@/types/index';
import { Badge } from '@/components/ui/badge';
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
  item: ProgramItemWithRelations;
  isEditor: boolean;
  onEdit: (item: ProgramItemWithRelations) => void;
  onDeleted: (id: string, mode: 'single' | 'all') => void;
};

export function EntryCard({ item, isEditor, onEdit, onDeleted }: Props) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();
  const isRecurring = !!item.recurrence_group_id;

  function handleDelete(mode: 'single' | 'all') {
    startDeleteTransition(async () => {
      const result =
        mode === 'all' && item.recurrence_group_id
          ? await deleteRecurrenceGroup(item.recurrence_group_id)
          : await deleteProgramItem(item.id);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(mode === 'all' ? 'All occurrences deleted.' : 'Entry deleted.');
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
              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-1.5">
                <TypeBadge type={item.type} />
                {item.is_tour_operator && (
                  <Badge variant="outline" className="text-amber-600 border-amber-300">
                    Tour operator
                  </Badge>
                )}
                {isRecurring && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <RefreshCw className="h-3 w-3" /> Recurring
                  </span>
                )}
              </div>

              {/* Title */}
              <p className="font-medium leading-snug truncate">{item.title}</p>

              {/* Time range */}
              {(item.start_time || item.end_time) && (
                <p className="text-sm text-muted-foreground">
                  {formatTimeRange(item.start_time, item.end_time)}
                </p>
              )}

              {/* Guest count / capacity */}
              {(item.guest_count != null || item.capacity != null) && (
                <p className="text-sm text-muted-foreground">
                  {formatGuests(item.guest_count, item.capacity)}
                </p>
              )}

              {/* Venue type */}
              {item.venue_type && (
                <p className="text-sm text-muted-foreground">
                  {item.venue_type.name}
                </p>
              )}

              {/* Point of contact */}
              {item.point_of_contact && (
                <p className="text-sm text-muted-foreground">
                  {item.point_of_contact.name}
                </p>
              )}

              {/* Table breakdown */}
              {item.table_breakdown && item.table_breakdown.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {formatTableBreakdown(item.table_breakdown)}
                </p>
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
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete entry?</AlertDialogTitle>
            <AlertDialogDescription>
              {isRecurring
                ? 'This is a recurring entry. Choose what to delete.'
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

// ---------------------------------------------------------------------------
// Sub-components / helpers
// ---------------------------------------------------------------------------

function TypeBadge({ type }: { type: 'golf' | 'event' }) {
  if (type === 'golf') {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
        Golf
      </Badge>
    );
  }
  return (
    <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">
      Event
    </Badge>
  );
}

function formatTimeRange(start: string | null, end: string | null): string {
  if (start && end) return `${start} – ${end}`;
  if (start) return `From ${start}`;
  if (end) return `Until ${end}`;
  return '';
}

function formatGuests(count: number | null, capacity: number | null): string {
  if (count != null && capacity != null) return `${count} / ${capacity} guests`;
  if (count != null) return `${count} guests`;
  if (capacity != null) return `Capacity: ${capacity}`;
  return '';
}

function formatTableBreakdown(breakdown: number[]): string {
  return breakdown
    .map((seats, i) => `Table ${i + 1} (${seats})`)
    .join(' | ');
}
