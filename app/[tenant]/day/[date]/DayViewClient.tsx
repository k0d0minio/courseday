'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { DayNav } from '@/components/day-nav';
import { DaySummaryCard } from '@/components/day-summary-card';
import { AddEntryModal } from '@/components/add-entry-modal';
import { EntryCard } from '@/components/entry-card';
import { AddReservationModal } from '@/components/add-reservation-modal';
import { ReservationCard } from '@/components/reservation-card';
import { Button } from '@/components/ui/button';
import type {
  ProgramItem,
  ProgramItemWithRelations,
  Reservation,
  ReservationWithRelations,
} from '@/types/index';
import type { DayViewProps } from './page';

export function DayViewClient({
  date,
  dayId,
  today,
  programItems: initialProgramItems,
  reservations: initialReservations,
  hotelBookings,
  breakfastConfigs,
  pocs,
  venueTypes,
  authState,
}: DayViewProps) {
  const [programItems, setProgramItems] = useState(
    initialProgramItems as ProgramItemWithRelations[]
  );
  const [reservations, setReservations] = useState(
    initialReservations as ReservationWithRelations[]
  );

  // Entry modal state
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [entryType, setEntryType] = useState<'golf' | 'event'>('golf');
  const [editEntry, setEditEntry] = useState<ProgramItemWithRelations | null>(null);

  // Reservation modal state
  const [reservationModalOpen, setReservationModalOpen] = useState(false);
  const [editReservation, setEditReservation] = useState<ReservationWithRelations | null>(null);

  // Placeholder for T-27
  const [_addHotelBookingOpen, setAddHotelBookingOpen] = useState(false);

  // ---------- Entry handlers ----------

  function openAddEntry(type: 'golf' | 'event') {
    setEntryType(type);
    setEditEntry(null);
    setEntryModalOpen(true);
  }

  function openEditEntry(item: ProgramItemWithRelations) {
    setEntryType(item.type);
    setEditEntry(item);
    setEntryModalOpen(true);
  }

  function handleEntrySaved(item: ProgramItem) {
    setProgramItems((prev) => {
      const idx = prev.findIndex((p) => p.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = item as ProgramItemWithRelations;
        return next;
      }
      return [...prev, item as ProgramItemWithRelations].sort((a, b) =>
        (a.start_time ?? '').localeCompare(b.start_time ?? '')
      );
    });
  }

  function handleEntryDeleted(id: string, mode: 'single' | 'all') {
    if (mode === 'all') {
      const groupId = programItems.find((p) => p.id === id)?.recurrence_group_id;
      setProgramItems((prev) =>
        groupId
          ? prev.filter((p) => p.recurrence_group_id !== groupId)
          : prev.filter((p) => p.id !== id)
      );
    } else {
      setProgramItems((prev) => prev.filter((p) => p.id !== id));
    }
  }

  // ---------- Reservation handlers ----------

  function openAddReservation() {
    setEditReservation(null);
    setReservationModalOpen(true);
  }

  function openEditReservation(item: ReservationWithRelations) {
    setEditReservation(item);
    setReservationModalOpen(true);
  }

  function handleReservationSaved(item: Reservation) {
    setReservations((prev) => {
      const idx = prev.findIndex((r) => r.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = item as ReservationWithRelations;
        return next;
      }
      return [...prev, item as ReservationWithRelations].sort((a, b) =>
        (a.start_time ?? '').localeCompare(b.start_time ?? '')
      );
    });
  }

  function handleReservationDeleted(id: string) {
    setReservations((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <DayNav date={date} today={today} />

      <DaySummaryCard
        programItems={programItems}
        reservations={reservations}
        hotelBookings={hotelBookings}
        breakfastConfigs={breakfastConfigs}
      />

      {/* Golf & Events */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Golf &amp; Events</h2>
          {authState.isEditor && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => openAddEntry('event')}>
                <Plus className="w-4 h-4 mr-1" /> Event
              </Button>
              <Button size="sm" onClick={() => openAddEntry('golf')}>
                <Plus className="w-4 h-4 mr-1" /> Golf
              </Button>
            </div>
          )}
        </div>
        {programItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No entries yet.</p>
        ) : (
          <div className="space-y-2">
            {programItems.map((item) => (
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

      {/* Tee Time Reservations */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Tee Time Reservations</h2>
          {authState.isEditor && (
            <Button size="sm" onClick={openAddReservation}>
              <Plus className="w-4 h-4 mr-1" /> Add reservation
            </Button>
          )}
        </div>
        {reservations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reservations yet.</p>
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

      {/* Hotel Bookings — editor-only, drawer added in T-27 */}
      {authState.isEditor && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Hotel Bookings</h2>
            <Button size="sm" onClick={() => setAddHotelBookingOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add booking
            </Button>
          </div>
          {hotelBookings.length === 0 && (
            <p className="text-sm text-muted-foreground">No hotel bookings yet.</p>
          )}
        </section>
      )}

      <AddEntryModal
        isOpen={entryModalOpen}
        onClose={() => setEntryModalOpen(false)}
        date={date}
        dayId={dayId}
        type={entryType}
        pocs={pocs}
        venueTypes={venueTypes}
        editItem={editEntry}
        onSuccess={handleEntrySaved}
      />

      <AddReservationModal
        isOpen={reservationModalOpen}
        onClose={() => setReservationModalOpen(false)}
        dayId={dayId}
        hotelBookings={hotelBookings}
        programItems={programItems}
        editItem={editReservation}
        onSuccess={handleReservationSaved}
      />
    </div>
  );
}
