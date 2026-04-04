'use client';

import { useEffect, useState, useTransition } from 'react';
import { format, parseISO } from 'date-fns';
import { X, Plus, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { ensureDayExists } from '@/app/actions/days';
import { getProgramItemsForDay } from '@/app/actions/program-items';
import { getReservationsForDay } from '@/app/actions/reservations';
import { getHotelBookingsForDate } from '@/app/actions/hotel-bookings';
import { getAllPOCs } from '@/app/actions/poc';
import { getAllVenueTypes } from '@/app/actions/venue-type';
import { AddEntryModal } from '@/components/add-entry-modal';
import { AddReservationModal } from '@/components/add-reservation-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import type {
  ProgramItem,
  ProgramItemWithRelations,
  Reservation,
  HotelBooking,
  PointOfContact,
  VenueType,
} from '@/types/index';
import type { DaySummary } from '@/components/HomeClient';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = {
  date: string; // YYYY-MM-DD
  onClose: () => void;
  onSummaryChanged: (date: string, summary: Partial<DaySummary>) => void;
};

type DayData = {
  dayId: string;
  programItems: ProgramItemWithRelations[];
  reservations: Reservation[];
  hotelBookings: HotelBooking[];
  pocs: PointOfContact[];
  venueTypes: VenueType[];
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CalendarDaySidebar({ date, onClose, onSummaryChanged }: Props) {
  const [data, setData] = useState<DayData | null>(null);
  const [loading, startLoading] = useTransition();

  // Entry modal state
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [entryType, setEntryType] = useState<'golf' | 'event'>('golf');

  // Reservation modal state
  const [reservationModalOpen, setReservationModalOpen] = useState(false);

  // Fetch all day data when date changes
  useEffect(() => {
    setData(null);
    startLoading(async () => {
      const dayResult = await ensureDayExists(date);
      if (!dayResult.success) return;
      const dayId = dayResult.data.id;

      const [itemsResult, resResult, hotelsResult, pocsResult, venuesResult] =
        await Promise.all([
          getProgramItemsForDay(dayId),
          getReservationsForDay(dayId),
          getHotelBookingsForDate(date),
          getAllPOCs(),
          getAllVenueTypes(),
        ]);

      setData({
        dayId,
        programItems: (itemsResult.success ? itemsResult.data : []) as ProgramItemWithRelations[],
        reservations: resResult.success ? resResult.data : [],
        hotelBookings: hotelsResult.success ? hotelsResult.data : [],
        pocs: pocsResult.success ? pocsResult.data : [],
        venueTypes: venuesResult.success ? venuesResult.data : [],
      });
    });
  }, [date]);

  function handleEntrySaved(item: ProgramItem) {
    if (!data) return;
    const updated = [...data.programItems, item as ProgramItemWithRelations].sort(
      (a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? '')
    );
    const next = { ...data, programItems: updated };
    setData(next);
    onSummaryChanged(date, {
      golfCount: updated.filter((p) => p.type === 'golf').length,
      eventCount: updated.filter((p) => p.type === 'event').length,
    });
  }

  function handleReservationSaved(res: Reservation) {
    if (!data) return;
    const existing = data.reservations.findIndex((r) => r.id === res.id);
    const updated =
      existing >= 0
        ? data.reservations.map((r) => (r.id === res.id ? res : r))
        : [...data.reservations, res].sort((a, b) =>
            (a.start_time ?? '').localeCompare(b.start_time ?? '')
          );
    setData({ ...data, reservations: updated });
    onSummaryChanged(date, { reservationCount: updated.length });
  }

  const formattedDate = format(parseISO(date), 'EEEE d MMMM');

  return (
    <aside className="w-72 shrink-0">
      <div className="sticky top-6 space-y-4 rounded-lg border bg-card p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Selected day</p>
            <p className="font-semibold">{formattedDate}</p>
          </div>
          <Button variant="ghost" size="icon" className="-mr-1 -mt-1 h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {loading && !data && <SidebarSkeleton />}

        {data && (
          <>
            {/* Quick actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => { setEntryType('golf'); setEntryModalOpen(true); }}
              >
                <Plus className="h-3 w-3 mr-1" /> Golf
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => { setEntryType('event'); setEntryModalOpen(true); }}
              >
                <Plus className="h-3 w-3 mr-1" /> Event
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => setReservationModalOpen(true)}
              >
                <Plus className="h-3 w-3 mr-1" /> Reservation
              </Button>
            </div>

            <Separator />

            {/* Golf & Events */}
            <SidebarSection
              title="Golf & Events"
              empty={data.programItems.length === 0}
            >
              {data.programItems.map((item) => (
                <div key={item.id} className="flex items-baseline gap-2">
                  <Badge
                    variant="secondary"
                    className={
                      item.type === 'golf'
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10px] px-1 py-0'
                        : 'bg-blue-500/15 text-blue-700 dark:text-blue-400 text-[10px] px-1 py-0'
                    }
                  >
                    {item.type === 'golf' ? 'G' : 'E'}
                  </Badge>
                  <span className="text-sm truncate flex-1">{item.title}</span>
                  {item.start_time && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {item.start_time.slice(0, 5)}
                    </span>
                  )}
                </div>
              ))}
            </SidebarSection>

            {/* Reservations */}
            <SidebarSection
              title="Reservations"
              empty={data.reservations.length === 0}
            >
              {data.reservations.map((res) => (
                <div key={res.id} className="flex items-baseline justify-between gap-2">
                  <span className="text-sm truncate">{res.guest_name ?? 'Guest'}</span>
                  {res.start_time && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {res.start_time.slice(0, 5)}
                    </span>
                  )}
                </div>
              ))}
            </SidebarSection>

            {/* Hotel Bookings */}
            <SidebarSection
              title="Hotel Bookings"
              empty={data.hotelBookings.length === 0}
            >
              {data.hotelBookings.map((booking) => (
                <div key={booking.id} className="space-y-0.5">
                  <p className="text-sm">{booking.guest_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(booking.check_in), 'd MMM')} →{' '}
                    {format(parseISO(booking.check_out), 'd MMM')} ·{' '}
                    {booking.guest_count} guests
                  </p>
                </div>
              ))}
            </SidebarSection>

            <Separator />

            <Button asChild size="sm" className="w-full" variant="outline">
              <Link href={`/day/${date}`}>
                Open day view <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </>
        )}
      </div>

      {/* Modals mounted outside the sidebar card */}
      {data && (
        <>
          <AddEntryModal
            isOpen={entryModalOpen}
            onClose={() => setEntryModalOpen(false)}
            date={date}
            dayId={data.dayId}
            type={entryType}
            pocs={data.pocs}
            venueTypes={data.venueTypes}
            editItem={null}
            onSuccess={handleEntrySaved}
          />
          <AddReservationModal
            isOpen={reservationModalOpen}
            onClose={() => setReservationModalOpen(false)}
            dayId={data.dayId}
            hotelBookings={data.hotelBookings}
            programItems={data.programItems}
            editItem={null}
            onSuccess={handleReservationSaved}
          />
        </>
      )}
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SidebarSection({
  title,
  empty,
  children,
}: {
  title: string;
  empty: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      {empty ? (
        <p className="text-xs text-muted-foreground">None.</p>
      ) : (
        <div className="space-y-1.5">{children}</div>
      )}
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}
