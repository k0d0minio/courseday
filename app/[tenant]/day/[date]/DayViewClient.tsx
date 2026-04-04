'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { DayNav } from '@/components/day-nav';
import { DaySummaryCard } from '@/components/day-summary-card';
import { AddEntryModal } from '@/components/add-entry-modal';
import { Button } from '@/components/ui/button';
import type { ProgramItem } from '@/types/index';
import type { DayViewProps } from './page';

export function DayViewClient({
  date,
  dayId,
  today,
  programItems: initialProgramItems,
  reservations,
  hotelBookings,
  breakfastConfigs,
  pocs,
  venueTypes,
  authState,
}: DayViewProps) {
  const [programItems, setProgramItems] = useState(initialProgramItems);

  // Entry modal state
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [entryType, setEntryType] = useState<'golf' | 'event'>('golf');
  const [editEntry, setEditEntry] = useState<ProgramItem | null>(null);

  // Placeholder modal state for T-24 / T-27
  const [_addReservationOpen, setAddReservationOpen] = useState(false);
  const [_addHotelBookingOpen, setAddHotelBookingOpen] = useState(false);

  function openAddEntry(type: 'golf' | 'event') {
    setEntryType(type);
    setEditEntry(null);
    setEntryModalOpen(true);
  }

  function openEditEntry(item: ProgramItem) {
    setEntryType(item.type);
    setEditEntry(item);
    setEntryModalOpen(true);
  }

  function handleEntrySaved(item: ProgramItem) {
    setProgramItems((prev) => {
      const idx = prev.findIndex((p) => p.id === item.id);
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

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <DayNav date={date} today={today} />

      <DaySummaryCard
        programItems={programItems}
        reservations={reservations}
        hotelBookings={hotelBookings}
        breakfastConfigs={breakfastConfigs}
      />

      {/* Golf & Events — entry cards added in T-22 */}
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
        {programItems.length === 0 && (
          <p className="text-sm text-muted-foreground">No entries yet.</p>
        )}
      </section>

      {/* Tee Time Reservations — reservation cards added in T-24 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Tee Time Reservations</h2>
          {authState.isEditor && (
            <Button size="sm" onClick={() => setAddReservationOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add reservation
            </Button>
          )}
        </div>
        {reservations.length === 0 && (
          <p className="text-sm text-muted-foreground">No reservations yet.</p>
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
    </div>
  );
}
