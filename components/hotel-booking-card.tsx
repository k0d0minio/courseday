'use client';

import { useState, useTransition } from 'react';
import { Pencil, Trash2, Coffee } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { deleteHotelBooking } from '@/app/actions/hotel-bookings';
import type { HotelBooking, BreakfastConfiguration } from '@/types/index';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  item: HotelBooking;
  breakfastConfig: BreakfastConfiguration | null;
  isEditor: boolean;
  onEdit: (item: HotelBooking) => void;
  onDeleted: (id: string) => void;
  onEditBreakfast: (config: BreakfastConfiguration) => void;
};

export function HotelBookingCard({
  item,
  breakfastConfig,
  isEditor,
  onEdit,
  onDeleted,
  onEditBreakfast,
}: Props) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteHotelBooking(item.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('Booking deleted.');
      setDeleteOpen(false);
      onDeleted(item.id);
    });
  }

  const checkInFmt = format(parseISO(item.check_in), 'd MMM');
  const checkOutFmt = format(parseISO(item.check_out), 'd MMM yyyy');

  return (
    <>
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <p className="font-medium">{item.guest_name}</p>
                <span className="text-sm text-muted-foreground">
                  {item.guest_count} {item.guest_count === 1 ? 'guest' : 'guests'}
                </span>
                {item.is_tour_operator && (
                  <Badge variant="secondary" className="text-xs">Tour op</Badge>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                {checkInFmt} → {checkOutFmt}
              </p>

              {item.notes && (
                <p className="text-sm text-muted-foreground italic">{item.notes}</p>
              )}

              {breakfastConfig && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Coffee className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {breakfastConfig.total_guests > 0
                      ? `${breakfastConfig.total_guests} breakfasts`
                      : 'Breakfast — no table set'}
                    {breakfastConfig.start_time ? ` · ${breakfastConfig.start_time}` : ''}
                  </span>
                  {isEditor && (
                    <button
                      onClick={() => onEditBreakfast(breakfastConfig)}
                      className="ml-1 text-xs underline underline-offset-2 hover:text-foreground transition-colors"
                    >
                      Edit
                    </button>
                  )}
                </div>
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
            <AlertDialogTitle>Delete booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the booking for{' '}
              <strong>{item.guest_name}</strong> and all associated breakfast
              configurations.
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
