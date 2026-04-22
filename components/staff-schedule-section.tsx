'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { ShiftCard } from '@/components/shift-card';
import { ShiftForm } from '@/components/shift-form';
import { Button } from '@/components/ui/button';
import type { ShiftWithStaffMember, StaffMember, StaffRole } from '@/types/index';

type Props = {
  dayId: string;
  shifts: ShiftWithStaffMember[];
  staffMembers: StaffMember[];
  staffRoles: StaffRole[];
  isEditor: boolean;
  onShiftsChange: React.Dispatch<React.SetStateAction<ShiftWithStaffMember[]>>;
};

export function StaffScheduleSection({
  dayId,
  shifts,
  staffMembers,
  staffRoles,
  isEditor,
  onShiftsChange,
}: Props) {
  const t = useTranslations('Tenant.staff.section');
  const [formOpen, setFormOpen] = useState(false);
  const [editShift, setEditShift] = useState<ShiftWithStaffMember | null>(null);

  function openAdd() {
    setEditShift(null);
    setFormOpen(true);
  }

  function openEdit(item: ShiftWithStaffMember) {
    setEditShift(item);
    setFormOpen(true);
  }

  function handleSaved(item: ShiftWithStaffMember) {
    onShiftsChange((prev) => {
      const idx = prev.findIndex((s) => s.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = item;
        return next.sort((a, b) =>
          (a.start_time ?? '').localeCompare(b.start_time ?? '')
        );
      }
      return [...prev, item].sort((a, b) =>
        (a.start_time ?? '').localeCompare(b.start_time ?? '')
      );
    });
  }

  function handleDeleted(id: string) {
    onShiftsChange((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">{t('title')}</h2>
        {isEditor && (
          <Button
            size="sm"
            onClick={openAdd}
            disabled={staffMembers.filter((m) => m.active).length === 0}
            className="h-7 shrink-0 gap-1 px-2.5 text-xs has-[>svg]:px-2"
          >
            <Plus className="size-3.5" /> {t('addShift')}
          </Button>
        )}
      </div>
      {staffMembers.filter((m) => m.active).length === 0 && isEditor && (
        <p className="text-sm text-muted-foreground">{t('noStaffHint')}</p>
      )}
      {shifts.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <div className="space-y-2">
          {shifts.map((item) => (
            <ShiftCard
              key={item.id}
              dayId={dayId}
              item={item}
              isEditor={isEditor}
              onEdit={openEdit}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}

      {isEditor && (
        <ShiftForm
          isOpen={formOpen}
          onClose={() => setFormOpen(false)}
          dayId={dayId}
          staffMembers={staffMembers}
          rolePresets={staffRoles}
          editItem={editShift}
          onSuccess={handleSaved}
        />
      )}
    </section>
  );
}
