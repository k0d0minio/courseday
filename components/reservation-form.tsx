'use client';

import { useEffect, useState, useTransition, type RefObject } from 'react';
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { z } from 'zod';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { TableBreakdownBuilder } from '@/components/table-breakdown-builder';
import { AllergenMultiSelect } from '@/components/allergen-multi-select';
import { MoreOptionsSection } from '@/components/more-options-section';
import { filterAllergenCodes, type AllergenCode } from '@/lib/allergens';
import type { Reservation } from '@/types/index';
import { mutateWithOfflineQueue } from '@/lib/day-mutation-client';
import { useTenant } from '@/lib/tenant-context';
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
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

// ---------------------------------------------------------------------------
// Schema & types
// ---------------------------------------------------------------------------

const formSchema = z.object({
  guestName: z.string().optional(),
  guestCount: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  isOpen: boolean;
  onClose: () => void;
  dayId: string;
  editItem?: Reservation | null;
  onSuccess: (item: Reservation) => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReservationForm({
  isOpen,
  onClose,
  dayId,
  editItem,
  onSuccess,
  returnFocusRef,
}: Props) {
  const t = useTranslations('Tenant.reservationForm');
  const tAllergens = useTranslations('Tenant.allergens');
  const isMobile = useIsMobile();
  const [isPending, startTransition] = useTransition();
  const [tableBreakdown, setTableBreakdown] = useState<number[]>([]);
  const [allergens, setAllergens] = useState<AllergenCode[]>([]);
  const isEditing = !!editItem;
  const { tenantSlug } = useTenant();

  const { register, handleSubmit, reset } = useForm<FormData>({
    resolver: standardSchemaResolver(formSchema),
    defaultValues: defaultValues(editItem),
  });

  useEffect(() => {
    reset(defaultValues(editItem));
    const tb = editItem?.table_breakdown;
    setTableBreakdown(Array.isArray(tb) ? (tb as number[]) : []);
    setAllergens(filterAllergenCodes(editItem?.allergens));
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
        tableBreakdown: tableBreakdown.length > 0 ? tableBreakdown : undefined,
        allergens: allergens.length > 0 ? allergens : undefined,
      };

      const result = await mutateWithOfflineQueue<Reservation>({
        entity: 'reservations',
        operation: isEditing ? 'update' : 'create',
        tenantSlug,
        dayId,
        payload: isEditing ? { ...payload, id: editItem!.id } : payload,
      });

      if (!result.success) { toast.error(result.error); return; }

      if (result.pending && !isEditing) {
        const optimistic: Reservation = {
          id: `pending-${result.clientMutationId}`,
          tenant_id: '',
          day_id: dayId,
          guest_name: payload.guestName ?? null,
          guest_count: payload.guestCount ?? null,
          start_time: payload.startTime ?? null,
          end_time: payload.endTime ?? null,
          notes: payload.notes ?? null,
          table_breakdown: payload.tableBreakdown ?? null,
          allergens: payload.allergens ?? [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        onSuccess(optimistic);
      } else if (result.pending && isEditing) {
        onSuccess({
          ...editItem!,
          guest_name: payload.guestName ?? null,
          guest_count: payload.guestCount ?? null,
          start_time: payload.startTime ?? null,
          end_time: payload.endTime ?? null,
          notes: payload.notes ?? null,
          table_breakdown: payload.tableBreakdown ?? null,
          allergens: payload.allergens ?? [],
          updated_at: new Date().toISOString(),
        });
      } else {
        onSuccess(result.data);
      }
      toast.success(result.pending ? t('saved') : isEditing ? t('updated') : t('saved'));
      onClose();
    });
  }

  const formBody = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="rf-name">{t('guestNameLabel')}</Label>
        <Input id="rf-name" {...register('guestName')} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="rf-count">{t('partySizeLabel')}</Label>
        <Input id="rf-count" type="number" min={1} {...register('guestCount')} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="rf-start">{t('startTimeLabel')}</Label>
          <Input id="rf-start" type="time" {...register('startTime')} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="rf-end">{t('endTimeLabel')}</Label>
          <Input id="rf-end" type="time" {...register('endTime')} />
        </div>
      </div>

      <div className="space-y-1">
        <Label>{t('tableLayoutLabel')}</Label>
        <TableBreakdownBuilder value={tableBreakdown} onChange={setTableBreakdown} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="rf-notes">{t('notesLabel')}</Label>
        <Textarea id="rf-notes" rows={2} {...register('notes')} />
      </div>

      <MoreOptionsSection>
        <div className="space-y-1">
          <Label htmlFor="rf-allergens">{tAllergens('label')}</Label>
          <AllergenMultiSelect value={allergens} onChange={setAllergens} />
        </div>
      </MoreOptionsSection>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>{t('cancel')}</Button>
        <Button type="submit" disabled={isPending}>{isPending ? t('saving') : t('save')}</Button>
      </div>
    </form>
  );

  const title = isEditing ? t('editTitle') : t('addTitle');

  if (isMobile) {
    return (
      <Drawer
        open={isOpen}
        onOpenChange={(v) => {
          if (!v) {
            onClose();
            if (returnFocusRef?.current) {
              queueMicrotask(() => returnFocusRef.current?.focus());
            }
          }
        }}
      >
        <DrawerContent>
          <DrawerHeader><DrawerTitle>{title}</DrawerTitle></DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto max-h-[70vh]">{formBody}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        className="sm:max-w-md max-h-[90vh] overflow-y-auto"
        onCloseAutoFocus={(e) => {
          if (returnFocusRef?.current) {
            e.preventDefault();
            returnFocusRef.current.focus();
          }
        }}
      >
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        {formBody}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultValues(editItem?: Reservation | null): FormData {
  if (!editItem) return { guestName: '', guestCount: '', startTime: '', endTime: '', notes: '' };
  return {
    guestName: editItem.guest_name ?? '',
    guestCount: editItem.guest_count != null ? String(editItem.guest_count) : '',
    startTime: editItem.start_time ?? '',
    endTime: editItem.end_time ?? '',
    notes: editItem.notes ?? '',
  };
}
