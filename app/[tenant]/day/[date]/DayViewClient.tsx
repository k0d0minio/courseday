'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { DayNav } from '@/components/day-nav';
import { DaySummaryCard } from '@/components/day-summary-card';
import { AddEntryModal } from '@/components/add-entry-modal';
import { EntryCard } from '@/components/entry-card';
import { AddReservationModal } from '@/components/add-reservation-modal';
import { ReservationCard } from '@/components/reservation-card';
import { HotelBookingCard } from '@/components/hotel-booking-card';
import { AddHotelBookingDrawer } from '@/components/add-hotel-booking-drawer';
import { AddBreakfastModal } from '@/components/add-breakfast-modal';
import { Button } from '@/components/ui/button';
import type {
  ProgramItem,
  ProgramItemWithRelations,
  Reservation,
  ReservationWithRelations,
  HotelBooking,
  BreakfastConfiguration,
} from '@/types/index';
import type { DayViewProps } from './page';

export function DayViewClient({
  date,
  dayId,
  today,
  programItems: initialProgramItems,
  reservations: initialReservations,
  hotelBookings: initialHotelBookings,
  breakfastConfigs: initialBreakfastConfigs,
  pocs,
  venueTypes,
  authState,
}: DayViewProps) {
  const t = useTranslations('Tenant.day');

  const [programItems, setProgramItems] = useState(
    initialProgramItems as ProgramItemWithRelations[]
  );
  const [reservations, setReservations] = useState(
    initialReservations as ReservationWithRelations[]
  );
  const [hotelBookings, setHotelBookings] = useState<HotelBooking[]>(initialHotelBookings);
  const [breakfastConfigs, setBreakfastConfigs] = useState<BreakfastConfiguration[]>(
    initialBreakfastConfigs
  );

  // Entry modal state
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [entryType, setEntryType] = useState<'golf' | 'event'>('golf');
  const [editEntry, setEditEntry] = useState<ProgramItemWithRelations | null>(null);

  // Reservation modal state
  const [reservationModalOpen, setReservationModalOpen] = useState(false);
  const [editReservation, setEditReservation] = useState<ReservationWithRelations | null>(null);

  // Hotel booking drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editBooking, setEditBooking] = useState<HotelBooking | null>(null);

  // Breakfast modal state
  const [breakfastModalOpen, setBreakfastModalOpen] = useState(false);
  const [editBreakfast, setEditBreakfast] = useState<BreakfastConfiguration | null>(null);

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

  // ---------- Hotel booking handlers ----------

  function openAddBooking() {
    setEditBooking(null);
    setDrawerOpen(true);
  }

  function openEditBooking(item: HotelBooking) {
    setEditBooking(item);
    setDrawerOpen(true);
  }

  function handleBookingSaved(booking: HotelBooking, configs: BreakfastConfiguration[]) {
    // Update hotel bookings list
    setHotelBookings((prev) => {
      const idx = prev.findIndex((b) => b.id === booking.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = booking;
        return next;
      }
      return [...prev, booking].sort((a, b) => a.guest_name.localeCompare(b.guest_name));
    });

    // Update breakfast configs for the current date from the returned configs
    const configsForDate = configs.filter((c) => c.breakfast_date === date);
    setBreakfastConfigs((prev) => {
      // Remove old configs for this booking, then add updated ones for today
      const withoutBooking = prev.filter((c) => c.hotel_booking_id !== booking.id);
      return [...withoutBooking, ...configsForDate];
    });
  }

  function handleBookingDeleted(id: string) {
    setHotelBookings((prev) => prev.filter((b) => b.id !== id));
    setBreakfastConfigs((prev) => prev.filter((c) => c.hotel_booking_id !== id));
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
        programItems={programItems}
        reservations={reservations}
        hotelBookings={hotelBookings}
        breakfastConfigs={breakfastConfigs}
      />

      {/* Golf & Events */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{t('golfEvents')}</h2>
          {authState.isEditor && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => openAddEntry('event')}>
                <Plus className="w-4 h-4 mr-1" /> {t('addEvent')}
              </Button>
              <Button size="sm" onClick={() => openAddEntry('golf')}>
                <Plus className="w-4 h-4 mr-1" /> {t('addGolf')}
              </Button>
            </div>
          )}
        </div>
        {programItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noEntries')}</p>
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

      {/* Hotel Bookings — editor-only */}
      {authState.isEditor && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{t('hotelBookings')}</h2>
            <Button size="sm" onClick={openAddBooking}>
              <Plus className="w-4 h-4 mr-1" /> {t('addBooking')}
            </Button>
          </div>
          {hotelBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noBookings')}</p>
          ) : (
            <div className="space-y-2">
              {hotelBookings.map((booking) => {
                const bfConfig = breakfastConfigs.find(
                  (c) => c.hotel_booking_id === booking.id
                ) ?? null;
                return (
                  <HotelBookingCard
                    key={booking.id}
                    item={booking}
                    breakfastConfig={bfConfig}
                    isEditor={authState.isEditor}
                    onEdit={openEditBooking}
                    onDeleted={handleBookingDeleted}
                    onEditBreakfast={openEditBreakfast}
                  />
                );
              })}
            </div>
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

      <AddHotelBookingDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        date={date}
        editItem={editBooking}
        onSuccess={handleBookingSaved}
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
