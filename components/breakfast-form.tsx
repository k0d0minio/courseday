'use client';

import { useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { z } from 'zod';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { TableBreakdownBuilder } from '@/components/table-breakdown-builder';
import { AllergenMultiSelect } from '@/components/allergen-multi-select';
import { MoreOptionsSection } from '@/components/more-options-section';
import { filterAllergenCodes, type AllergenCode } from '@/lib/allergens';
import type { BreakfastConfiguration } from '@/types/index';
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
  groupName: z.string().optional(),
  guestCount: z.string().optional(),
  startTime: z.string().optional(),
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
  editItem?: BreakfastConfiguration | null;
  onSuccess: (config: BreakfastConfiguration) => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BreakfastForm({ isOpen, onClose, dayId, editItem, onSuccess }: Props) {
  const t = useTranslations('Tenant.breakfastForm');
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
      const guestCount = data.guestCount ? parseInt(data.guestCount, 10) : undefined;

      const payload = {
        dayId,
        groupName: data.groupName || undefined,
        guestCount,
        tableBreakdown: tableBreakdown.length > 0 ? tableBreakdown : undefined,
        startTime: data.startTime || undefined,
        notes: data.notes || undefined,
        allergens: allergens.length > 0 ? allergens : undefined,
      };
      const result = await mutateWithOfflineQueue<BreakfastConfiguration>({
        entity: 'breakfast',
        operation: isEditing ? 'update' : 'create',
        tenantSlug,
        dayId,
        payload: isEditing ? { ...payload, id: editItem!.id } : payload,
      });

      if (!result.success) { toast.error(result.error); return; }

      if (result.pending && !isEditing) {
        onSuccess({
          id: `pending-${result.clientMutationId}`,
          tenant_id: '',
          day_id: dayId,
          breakfast_date: '',
          group_name: payload.groupName ?? null,
          table_breakdown: payload.tableBreakdown ?? null,
          total_guests:
            (payload.tableBreakdown ?? []).reduce((sum, count) => sum + count, 0) ||
            payload.guestCount ||
            0,
          start_time: payload.startTime ?? null,
          notes: payload.notes ?? null,
          allergens: payload.allergens ?? [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } else if (result.pending && isEditing) {
        onSuccess({
          ...editItem!,
          group_name: payload.groupName ?? null,
          table_breakdown: payload.tableBreakdown ?? null,
          total_guests:
            (payload.tableBreakdown ?? []).reduce((sum, count) => sum + count, 0) ||
            payload.guestCount ||
            0,
          start_time: payload.startTime ?? null,
          notes: payload.notes ?? null,
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

  const title = isEditing ? t('editTitle') : t('addTitle');

  const formBody = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="bf-group">{t('groupNameLabel')}</Label>
        <Input id="bf-group" placeholder={t('groupNamePlaceholder')} {...register('groupName')} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="bf-count">{t('guestCountLabel')}</Label>
        <Input id="bf-count" type="number" min={1} placeholder={t('guestCountHint')} {...register('guestCount')} />
      </div>

      <div className="space-y-1">
        <Label>{t('tableLayoutLabel')}</Label>
        <TableBreakdownBuilder value={tableBreakdown} onChange={setTableBreakdown} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="bf-time">{t('serviceTimeLabel')}</Label>
        <Input id="bf-time" type="time" {...register('startTime')} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="bf-notes">{t('notesLabel')}</Label>
        <Textarea id="bf-notes" rows={2} {...register('notes')} />
      </div>

      <MoreOptionsSection>
        <div className="space-y-1">
          <Label htmlFor="bf-allergens">{tAllergens('label')}</Label>
          <AllergenMultiSelect value={allergens} onChange={setAllergens} />
        </div>
      </MoreOptionsSection>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>{t('cancel')}</Button>
        <Button type="submit" disabled={isPending}>{isPending ? t('saving') : t('save')}</Button>
      </div>
    </form>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
        <DrawerContent>
          <DrawerHeader><DrawerTitle>{title}</DrawerTitle></DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto max-h-[70vh]">{formBody}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        {formBody}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultValues(editItem?: BreakfastConfiguration | null): FormData {
  if (!editItem) return { groupName: '', guestCount: '', startTime: '', notes: '' };
  return {
    groupName: editItem.group_name ?? '',
    guestCount: editItem.total_guests > 0 ? String(editItem.total_guests) : '',
    startTime: editItem.start_time ?? '',
    notes: editItem.notes ?? '',
  };
}
