'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { DayNav } from '@/components/day-nav';
import { DaySummaryCard } from '@/components/day-summary-card';
import { Button } from '@/components/ui/button';
import type { DayViewProps } from './page';

export function DayViewClient({
  date,
  today,
  programItems,
  reservations,
  hotelBookings,
  breakfastConfigs,
  authState,
}: DayViewProps) {
  // Modal state — consumed by T-21 (entries), T-24 (reservations), T-27 (hotel / breakfast)
  const [_addEntryOpen, setAddEntryOpen] = useState(false);
  const [_addReservationOpen, setAddReservationOpen] = useState(false);
  const [_addHotelBookingOpen, setAddHotelBookingOpen] = useState(false);

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
            <Button size="sm" onClick={() => setAddEntryOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add entry
            </Button>
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
    </div>
  );
}
