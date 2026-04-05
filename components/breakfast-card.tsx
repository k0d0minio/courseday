'use client';

import { useState, useTransition } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteBreakfastConfiguration } from '@/app/actions/breakfast';
import { TableBreakdownDisplay } from '@/components/table-breakdown-display';
import type { BreakfastConfiguration } from '@/types/index';
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
  item: BreakfastConfiguration;
  isEditor: boolean;
  onEdit: (item: BreakfastConfiguration) => void;
  onDeleted: (id: string) => void;
};

export function BreakfastCard({ item, isEditor, onEdit, onDeleted }: Props) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();

  const breakdown = Array.isArray(item.table_breakdown)
    ? (item.table_breakdown as number[])
    : [];

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteBreakfastConfiguration(item.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('Breakfast deleted.');
      setDeleteOpen(false);
      onDeleted(item.id);
    });
  }

  return (
    <>
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-1.5">
              {/* Group name + guest count */}
              <div className="flex items-baseline gap-2">
                <p className="font-medium">
                  {item.group_name ?? 'Unnamed group'}
                </p>
                {item.total_guests > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {item.total_guests} {item.total_guests === 1 ? 'guest' : 'guests'}
                  </span>
                )}
              </div>

              {/* Service time */}
              {item.start_time && (
                <p className="text-sm text-muted-foreground">
                  Service at {item.start_time.slice(0, 5)}
                </p>
              )}

              {/* Table layout */}
              {breakdown.length > 0 && (
                <TableBreakdownDisplay breakdown={breakdown} />
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
            <AlertDialogTitle>Delete breakfast?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the breakfast configuration
              {item.group_name ? <> for <strong>{item.group_name}</strong></> : ''}.
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
