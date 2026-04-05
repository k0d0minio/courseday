'use client';

import { useEffect, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { createReservation, updateReservation } from '@/app/actions/reservations';
import type { Reservation } from '@/types/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ---------------------------------------------------------------------------
// Local form schema
// ---------------------------------------------------------------------------

const formSchema = z.object({
  guestName: z.string().optional(),
  guestCount: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  isOpen: boolean;
  onClose: () => void;
  dayId: string;
  editItem?: Reservation | null;
  onSuccess: (item: Reservation) => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AddReservationModal({
  isOpen,
  onClose,
  dayId,
  editItem,
  onSuccess,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!editItem;

  const {
    register,
    handleSubmit,
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues(editItem),
  });

  useEffect(() => {
    reset(defaultValues(editItem));
  }, [isOpen, editItem, reset]);

  function onSubmit(data: FormData) {
    startTransition(async () => {
      const payload = {
        dayId,
        guestName: data.guestName || undefined,
        guestCount: data.guestCount ? parseInt(data.guestCount, 10) : undefined,
        startTime: data.startTime || undefined,
        endTime: data.endTime || undefined,
        notes: data.notes || undefined,
      };

      const result = isEditing
        ? await updateReservation(editItem!.id, payload)
        : await createReservation(payload);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(isEditing ? 'Reservation updated.' : 'Reservation added.');
      onSuccess(result.data);
      onClose();
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit reservation' : 'Add reservation'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Guest name */}
          <div className="space-y-1">
            <Label htmlFor="res-name">Guest name</Label>
            <Input id="res-name" {...register('guestName')} />
          </div>

          {/* Guest count */}
          <div className="space-y-1">
            <Label htmlFor="res-count">Guest count</Label>
            <Input id="res-count" type="number" min={1} {...register('guestCount')} />
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="res-start">Start time</Label>
              <Input id="res-start" type="time" {...register('startTime')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="res-end">End time</Label>
              <Input id="res-end" type="time" {...register('endTime')} />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label htmlFor="res-notes">Notes</Label>
            <Textarea id="res-notes" rows={2} {...register('notes')} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultValues(editItem?: Reservation | null): FormData {
  if (!editItem) {
    return { guestName: '', guestCount: '', startTime: '', endTime: '', notes: '' };
  }
  return {
    guestName: editItem.guest_name ?? '',
    guestCount: editItem.guest_count != null ? String(editItem.guest_count) : '',
    startTime: editItem.start_time ?? '',
    endTime: editItem.end_time ?? '',
    notes: editItem.notes ?? '',
  };
}
