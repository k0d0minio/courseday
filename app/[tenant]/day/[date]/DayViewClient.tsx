'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { DayNav } from '@/components/day-nav';
import { DaySummaryCard } from '@/components/day-summary-card';
import { ActivityForm } from '@/components/activity-form';
import { ActivityCard } from '@/components/activity-card';
import { ReservationForm } from '@/components/reservation-form';
import { ReservationCard } from '@/components/reservation-card';
import { BreakfastForm } from '@/components/breakfast-form';
import { BreakfastCard } from '@/components/breakfast-card';
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

  // Activity modal state
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [editActivity, setEditActivity] = useState<ActivityWithRelations | null>(null);

  // Reservation modal state
  const [reservationModalOpen, setReservationModalOpen] = useState(false);
  const [editReservation, setEditReservation] = useState<Reservation | null>(null);

  // Breakfast modal state
  const [breakfastModalOpen, setBreakfastModalOpen] = useState(false);
  const [editBreakfast, setEditBreakfast] = useState<BreakfastConfiguration | null>(null);

  // ---------- Activity handlers ----------

  function openAddActivity() {
    setEditActivity(null);
    setActivityModalOpen(true);
  }

  function openEditActivity(item: ActivityWithRelations) {
    setEditActivity(item);
    setActivityModalOpen(true);
  }

  function handleActivitySaved(item: Activity) {
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

  function handleActivityDeleted(id: string, mode: 'single' | 'all') {
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

  function openAddBreakfast() {
    setEditBreakfast(null);
    setBreakfastModalOpen(true);
  }

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
      return [...prev, config];
    });
  }

  function handleBreakfastDeleted(id: string) {
    setBreakfastConfigs((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <DayNav date={date} today={today} />

      <DaySummaryCard
        activities={activities}
        reservations={reservations}
        breakfastConfigs={breakfastConfigs}
      />

      {/* Breakfast */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{t('breakfast')}</h2>
          {authState.isEditor && (
            <Button size="sm" onClick={openAddBreakfast}>
              <Plus className="w-4 h-4 mr-1" /> {t('addBreakfast')}
            </Button>
          )}
        </div>
        {breakfastConfigs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noBreakfasts')}</p>
        ) : (
          <div className="space-y-2">
            {breakfastConfigs.map((item) => (
              <BreakfastCard
                key={item.id}
                item={item}
                isEditor={authState.isEditor}
                onEdit={openEditBreakfast}
                onDeleted={handleBreakfastDeleted}
              />
            ))}
          </div>
        )}
      </section>

      {/* Activities */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{t('activities')}</h2>
          {authState.isEditor && (
            <Button size="sm" onClick={openAddActivity}>
              <Plus className="w-4 h-4 mr-1" /> {t('addActivity')}
            </Button>
          )}
        </div>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noEntries')}</p>
        ) : (
          <div className="space-y-2">
            {activities.map((item) => (
              <ActivityCard
                key={item.id}
                item={item}
                isEditor={authState.isEditor}
                onEdit={openEditActivity}
                onDeleted={handleActivityDeleted}
              />
            ))}
          </div>
        )}
      </section>

      {/* Reservations */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{t('reservations')}</h2>
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
        isOpen={activityModalOpen}
        onClose={() => setActivityModalOpen(false)}
        date={date}
        dayId={dayId}
        pocs={pocs}
        venueTypes={venueTypes}
        editItem={editActivity}
        onSuccess={handleActivitySaved}
      />

      <ReservationForm
        isOpen={reservationModalOpen}
        onClose={() => setReservationModalOpen(false)}
        dayId={dayId}
        editItem={editReservation}
        onSuccess={handleReservationSaved}
      />

      <BreakfastForm
        isOpen={breakfastModalOpen}
        onClose={() => setBreakfastModalOpen(false)}
        dayId={dayId}
        editItem={editBreakfast}
        onSuccess={handleBreakfastSaved}
      />
    </div>
  );
}
