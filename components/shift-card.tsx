'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteShift } from '@/app/actions/shifts';
import type { ShiftWithStaffMember } from '@/types/index';
import { Button } from '@/components/ui/button';
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
  dayId: string;
  item: ShiftWithStaffMember;
  isEditor: boolean;
  onEdit?: (item: ShiftWithStaffMember) => void;
  onDeleted?: (id: string) => void;
};

function formatShiftTimes(start: string | null, end: string | null): string {
  const fmt = (s: string) => s.slice(0, 5);
  if (start && end) return `${fmt(start)} \u2013 ${fmt(end)}`;
  if (start) return fmt(start);
  if (end) return fmt(end);
  return '';
}

export function ShiftCard({ dayId, item, isEditor, onEdit, onDeleted }: Props) {
  const t = useTranslations('Tenant.staff.card');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const timeLabel = formatShiftTimes(item.start_time, item.end_time);
  const roleLabel = item.role?.trim() || item.staff_member.role?.trim();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteShift(item.id, dayId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      onDeleted?.(item.id);
      toast.success(t('deleted'));
      setConfirmOpen(false);
    });
  }

  return (
    <>
      <div className="rounded-lg border bg-card p-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="font-semibold">{item.staff_member.name}</p>
            {(roleLabel || timeLabel) && (
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
                {roleLabel && <span>{roleLabel}</span>}
                {timeLabel && <span>{timeLabel}</span>}
              </div>
            )}
          </div>
          {isEditor && (
            <div className="flex shrink-0 gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onEdit?.(item)}
                aria-label={t('editAria')}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => setConfirmOpen(true)}
                aria-label={t('deleteAria')}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        {item.notes && (
          <p className="text-sm text-muted-foreground italic">{item.notes}</p>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending}>
              {isPending ? t('deleting') : t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
