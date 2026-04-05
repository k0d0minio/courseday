'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { DayNav } from '@/components/day-nav';
import { DaySummaryCard } from '@/components/day-summary-card';
import { ActivityForm } from '@/components/activity-form';
import { EntryCard } from '@/components/entry-card';
import { AddReservationModal } from '@/components/add-reservation-modal';
import { ReservationCard } from '@/components/reservation-card';
import { AddBreakfastModal } from '@/components/add-breakfast-modal';
import { Button } from '@/components/ui/button';
import type {
  Activity,
  ActivityWithRelations,
  Reservation,
  BreakfastConfiguration,
} from '@/types/index';
import type { DayViewProps } from './page';

export function DayViewClient({
  date,
  dayId,
  today,
  activities: initialActivities,
  reservations: initialReservations,
  breakfastConfigs: initialBreakfastConfigs,
  pocs,
  venueTypes,
  authState,
}: DayViewProps) {
  const t = useTranslations('Tenant.day');

  const [activities, setActivities] = useState(
    initialActivities as ActivityWithRelations[]
  );
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  const [breakfastConfigs, setBreakfastConfigs] = useState<BreakfastConfiguration[]>(
    initialBreakfastConfigs
  );

  // Entry modal state
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<ActivityWithRelations | null>(null);

  // Reservation modal state
  const [reservationModalOpen, setReservationModalOpen] = useState(false);
  const [editReservation, setEditReservation] = useState<Reservation | null>(null);

  // Breakfast modal state
  const [breakfastModalOpen, setBreakfastModalOpen] = useState(false);
  const [editBreakfast, setEditBreakfast] = useState<BreakfastConfiguration | null>(null);

  // ---------- Activity handlers ----------

  function openAddEntry() {
    setEditEntry(null);
    setEntryModalOpen(true);
  }

  function openEditEntry(item: ActivityWithRelations) {
    setEditEntry(item);
    setEntryModalOpen(true);
  }

  function handleEntrySaved(item: Activity) {
    setActivities((prev) => {
      const idx = prev.findIndex((p) => p.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = item as ActivityWithRelations;
        return next;
      }
      return [...prev, item as ActivityWithRelations].sort((a, b) =>
        (a.start_time ?? '').localeCompare(b.start_time ?? '')
      );
    });
  }

  function handleEntryDeleted(id: string, mode: 'single' | 'all') {
    if (mode === 'all') {
      const groupId = activities.find((p) => p.id === id)?.recurrence_group_id;
      setActivities((prev) =>
        groupId
          ? prev.filter((p) => p.recurrence_group_id !== groupId)
          : prev.filter((p) => p.id !== id)
      );
    } else {
      setActivities((prev) => prev.filter((p) => p.id !== id));
    }
  }

  // ---------- Reservation handlers ----------

  function openAddReservation() {
    setEditReservation(null);
    setReservationModalOpen(true);
  }

  function openEditReservation(item: Reservation) {
    setEditReservation(item);
    setReservationModalOpen(true);
  }

  function handleReservationSaved(item: Reservation) {
    setReservations((prev) => {
      const idx = prev.findIndex((r) => r.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = item;
        return next;
      }
      return [...prev, item].sort((a, b) =>
        (a.start_time ?? '').localeCompare(b.start_time ?? '')
      );
    });
  }

  function handleReservationDeleted(id: string) {
    setReservations((prev) => prev.filter((r) => r.id !== id));
  }

  // ---------- Breakfast handlers ----------

  function openEditBreakfast(config: BreakfastConfiguration) {
    setEditBreakfast(config);
    setBreakfastModalOpen(true);
  }

  function handleBreakfastSaved(config: BreakfastConfiguration) {
    setBreakfastConfigs((prev) => {
      const idx = prev.findIndex((c) => c.id === config.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = config;
        return next;
      }
      return prev;
    });
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <DayNav date={date} today={today} />

      <DaySummaryCard
        activities={activities}
        reservations={reservations}
        breakfastConfigs={breakfastConfigs}
      />

      {/* Activities */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{t('golfEvents')}</h2>
          {authState.isEditor && (
            <Button size="sm" onClick={openAddEntry}>
              <Plus className="w-4 h-4 mr-1" /> {t('addEvent')}
            </Button>
          )}
        </div>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noEntries')}</p>
        ) : (
          <div className="space-y-2">
            {activities.map((item) => (
              <EntryCard
                key={item.id}
                item={item}
                isEditor={authState.isEditor}
                onEdit={openEditEntry}
                onDeleted={handleEntryDeleted}
              />
            ))}
          </div>
        )}
      </section>

      {/* Reservations */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{t('teeTimeReservations')}</h2>
          {authState.isEditor && (
            <Button size="sm" onClick={openAddReservation}>
              <Plus className="w-4 h-4 mr-1" /> {t('addReservation')}
            </Button>
          )}
        </div>
        {reservations.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noReservations')}</p>
        ) : (
          <div className="space-y-2">
            {reservations.map((item) => (
              <ReservationCard
                key={item.id}
                item={item}
                isEditor={authState.isEditor}
                onEdit={openEditReservation}
                onDeleted={handleReservationDeleted}
              />
            ))}
          </div>
        )}
      </section>

      <ActivityForm
        isOpen={entryModalOpen}
        onClose={() => setEntryModalOpen(false)}
        date={date}
        dayId={dayId}
        pocs={pocs}
        venueTypes={venueTypes}
        editItem={editEntry}
        onSuccess={handleEntrySaved}
      />

      <AddReservationModal
        isOpen={reservationModalOpen}
        onClose={() => setReservationModalOpen(false)}
        dayId={dayId}
        editItem={editReservation}
        onSuccess={handleReservationSaved}
      />

      {editBreakfast && (
        <AddBreakfastModal
          isOpen={breakfastModalOpen}
          onClose={() => setBreakfastModalOpen(false)}
          editItem={editBreakfast}
          onSuccess={handleBreakfastSaved}
        />
      )}
    </div>
  );
}
