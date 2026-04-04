'use client';

import { useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { createReservation, updateReservation } from '@/app/actions/reservations';
import type { Reservation, HotelBooking, ProgramItem } from '@/types/index';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ---------------------------------------------------------------------------
// Local form schema
// ---------------------------------------------------------------------------

const formSchema = z.object({
  guestName: z.string().optional(),
  guestEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  guestPhone: z.string().optional(),
  guestCount: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  notes: z.string().optional(),
  hotelBookingId: z.string().optional(),
  programItemId: z.string().optional(),
  tableIndex: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const NONE = '__none__';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  isOpen: boolean;
  onClose: () => void;
  dayId: string;
  hotelBookings: HotelBooking[];
  programItems: ProgramItem[];
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
  hotelBookings,
  programItems,
  editItem,
  onSuccess,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!editItem;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues(editItem),
  });

  useEffect(() => {
    reset(defaultValues(editItem));
  }, [isOpen, editItem, reset]);

  const watchProgramItemId = watch('programItemId');
  const selectedItem = programItems.find((p) => p.id === watchProgramItemId);
  const hasBreakdown = selectedItem?.table_breakdown && selectedItem.table_breakdown.length > 0;

  // Reset table index when program item changes
  useEffect(() => {
    setValue('tableIndex', '');
  }, [watchProgramItemId, setValue]);

  function onSubmit(data: FormData) {
    startTransition(async () => {
      const payload = {
        dayId,
        guestName: data.guestName || undefined,
        guestEmail: data.guestEmail || undefined,
        guestPhone: data.guestPhone || undefined,
        guestCount: data.guestCount ? parseInt(data.guestCount, 10) : undefined,
        startTime: data.startTime || undefined,
        endTime: data.endTime || undefined,
        notes: data.notes || undefined,
        hotelBookingId: data.hotelBookingId && data.hotelBookingId !== NONE
          ? data.hotelBookingId : null,
        programItemId: data.programItemId && data.programItemId !== NONE
          ? data.programItemId : null,
        tableIndex: data.tableIndex ? parseInt(data.tableIndex, 10) : null,
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

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="res-email">Email</Label>
              <Input id="res-email" type="email" {...register('guestEmail')} />
              {errors.guestEmail && (
                <p className="text-sm text-destructive">{errors.guestEmail.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="res-phone">Phone</Label>
              <Input id="res-phone" {...register('guestPhone')} />
            </div>
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

          {/* Hotel booking link */}
          {hotelBookings.length > 0 && (
            <div className="space-y-1">
              <Label>Linked hotel booking</Label>
              <Select
                value={watch('hotelBookingId') ?? NONE}
                onValueChange={(v) => setValue('hotelBookingId', v === NONE ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {hotelBookings.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.guest_name} ({b.guest_count} guests)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Program item link */}
          {programItems.length > 0 && (
            <div className="space-y-1">
              <Label>Linked program item</Label>
              <Select
                value={watch('programItemId') ?? NONE}
                onValueChange={(v) => setValue('programItemId', v === NONE ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {programItems
                    .filter((p) => p.table_breakdown && p.table_breakdown.length > 0)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              {/* Table index */}
              {hasBreakdown && (
                <div className="mt-2 space-y-1">
                  <Label>Table</Label>
                  <Select
                    value={watch('tableIndex') ?? ''}
                    onValueChange={(v) => setValue('tableIndex', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select table" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedItem!.table_breakdown!.map((seats, i) => (
                        <SelectItem key={i} value={String(i)}>
                          Table {i + 1} ({seats} places)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

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
    return {
      guestName: '', guestEmail: '', guestPhone: '',
      guestCount: '', startTime: '', endTime: '', notes: '',
      hotelBookingId: '', programItemId: '', tableIndex: '',
    };
  }
  return {
    guestName: editItem.guest_name ?? '',
    guestEmail: editItem.guest_email ?? '',
    guestPhone: editItem.guest_phone ?? '',
    guestCount: editItem.guest_count != null ? String(editItem.guest_count) : '',
    startTime: editItem.start_time ?? '',
    endTime: editItem.end_time ?? '',
    notes: editItem.notes ?? '',
    hotelBookingId: editItem.hotel_booking_id ?? '',
    programItemId: editItem.program_item_id ?? '',
    tableIndex: editItem.table_index != null ? String(editItem.table_index) : '',
  };
}
