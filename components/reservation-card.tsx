'use client';

import { useState, useTransition } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteReservation } from '@/app/actions/reservations';
import type { Reservation } from '@/types/index';
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
  item: Reservation;
  isEditor: boolean;
  onEdit: (item: Reservation) => void;
  onDeleted: (id: string) => void;
};

export function ReservationCard({ item, isEditor, onEdit, onDeleted }: Props) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteReservation(item.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('Reservation deleted.');
      setDeleteOpen(false);
      onDeleted(item.id);
    });
  }

  return (
    <>
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-1">
              {/* Name + count */}
              <div className="flex items-baseline gap-2">
                <p className="font-medium">
                  {item.guest_name ?? 'Guest'}
                </p>
                {item.guest_count != null && (
                  <span className="text-sm text-muted-foreground">
                    {item.guest_count} {item.guest_count === 1 ? 'guest' : 'guests'}
                  </span>
                )}
              </div>

              {/* Time range */}
              {(item.start_time || item.end_time) && (
                <p className="text-sm text-muted-foreground">
                  {formatTimeRange(item.start_time, item.end_time)}
                </p>
              )}

              {/* Notes */}
              {item.notes && (
                <p className="text-sm text-muted-foreground italic">{item.notes}</p>
              )}
            </div>

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
            <AlertDialogTitle>Delete reservation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the reservation
              {item.guest_name ? <> for <strong>{item.guest_name}</strong></> : ''}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
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
