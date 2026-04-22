'use client';

import { useState, useTransition } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { deleteReservation } from '@/app/actions/reservations';
import { TableBreakdownDisplay } from '@/components/table-breakdown-display';
import { AllergenBadgeRow } from '@/components/allergen-badge';
import { filterAllergenCodes } from '@/lib/allergens';
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
  const t = useTranslations('Tenant.reservation');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();

  const breakdown = Array.isArray(item.table_breakdown)
    ? (item.table_breakdown as number[])
    : [];
  const allergens = filterAllergenCodes(item.allergens);

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteReservation(item.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(t('deleted'));
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
              {/* Name + count */}
              <div className="flex items-baseline gap-2">
                <p className="font-medium">
                  {item.guest_name ?? t('fallbackName')}
                </p>
                {item.guest_count != null && (
                  <span className="text-sm text-muted-foreground">
                    {t('guests', { count: item.guest_count })}
                  </span>
                )}
              </div>

              {/* Time range */}
              {(item.start_time || item.end_time) && (
                <p className="text-sm text-muted-foreground">
                  {formatTimeRange(item.start_time, item.end_time)}
                </p>
              )}

              {/* Table layout */}
              {breakdown.length > 0 && (
                <TableBreakdownDisplay breakdown={breakdown} />
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

            {isEditor && (
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => onEdit(item)} aria-label={`Edit: ${item.guest_name ?? t('fallbackName')}`}>
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleteOpen(true)} aria-label={`Delete: ${item.guest_name ?? t('fallbackName')}`}>
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
  );
}

function formatTimeRange(start: string | null, end: string | null): string {
  const fmt = (s: string) => s.slice(0, 5);
  if (start && end) return `${fmt(start)} \u2013 ${fmt(end)}`;
  if (start) return fmt(start);
  if (end) return fmt(end);
  return '';
}
