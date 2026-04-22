'use client';

import { useEffect, useTransition } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { createShift, updateShift } from '@/app/actions/shifts';
import { shiftSchema, type ShiftFormData } from '@/lib/shift-schema';
import type { Shift, ShiftWithStaffMember, StaffMember } from '@/types/index';
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

type RolePreset = { id: string; name: string };

function attachStaffMember(shift: Shift, members: StaffMember[]): ShiftWithStaffMember {
  const staff_member =
    members.find((m) => m.id === shift.staff_member_id) ??
    ({
      id: shift.staff_member_id,
      tenant_id: shift.tenant_id,
      name: '—',
      role: '',
      active: false,
      created_at: shift.created_at,
    } satisfies StaffMember);

  return { ...shift, staff_member };
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
  dayId: string;
  staffMembers: StaffMember[];
  rolePresets: RolePreset[];
  editItem: ShiftWithStaffMember | null;
  onSuccess: (item: ShiftWithStaffMember) => void;
};

export function ShiftForm({
  isOpen,
  onClose,
  dayId,
  staffMembers,
  rolePresets,
  editItem,
  onSuccess,
}: Props) {
  const t = useTranslations('Tenant.staff.shiftForm');
  const [isPending, startTransition] = useTransition();
  const isEditing = !!editItem;

  const selectableStaff = staffMembers.filter((m) => m.active || m.id === editItem?.staff_member_id);

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<ShiftFormData>({
    resolver: standardSchemaResolver(shiftSchema),
    defaultValues: defaultValues(editItem),
  });

  useEffect(() => {
    reset(defaultValues(editItem));
  }, [editItem, isOpen, reset]);

  function onSubmit(data: ShiftFormData) {
    startTransition(async () => {
      const result = isEditing
        ? await updateShift(editItem!.id, dayId, data)
        : await createShift(dayId, data);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      onSuccess(attachStaffMember(result.data, staffMembers));
      toast.success(isEditing ? t('updated') : t('saved'));
      onClose();
    });
  }

  const datalistId = 'staff-shift-role-presets';

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('editTitle') : t('addTitle')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('staffMemberLabel')}</Label>
            <Controller
              name="staff_member_id"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('staffPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {selectableStaff.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                        {!m.active ? ` (${t('inactive')})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.staff_member_id && (
              <p className="text-sm text-destructive">{errors.staff_member_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="shift-role">{t('roleLabel')}</Label>
            <Input
              id="shift-role"
              list={datalistId}
              {...register('role')}
              placeholder={t('rolePlaceholder')}
            />
            <datalist id={datalistId}>
              {rolePresets.map((r) => (
                <option key={r.id} value={r.name} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="shift-start">{t('startLabel')}</Label>
              <Input id="shift-start" type="time" {...register('start_time')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shift-end">{t('endLabel')}</Label>
              <Input id="shift-end" type="time" {...register('end_time')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="shift-notes">{t('notesLabel')}</Label>
            <Textarea id="shift-notes" rows={2} {...register('notes')} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isPending || selectableStaff.length === 0}>
              {isPending ? t('saving') : t('save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function defaultValues(editItem: ShiftWithStaffMember | null): ShiftFormData {
  if (!editItem) {
    return {
      staff_member_id: '',
      role: '',
      start_time: '',
      end_time: '',
      notes: '',
    };
  }
  return {
    staff_member_id: editItem.staff_member_id,
    role: editItem.role ?? '',
    start_time: editItem.start_time ? editItem.start_time.slice(0, 5) : '',
    end_time: editItem.end_time ? editItem.end_time.slice(0, 5) : '',
    notes: editItem.notes ?? '',
  };
}
