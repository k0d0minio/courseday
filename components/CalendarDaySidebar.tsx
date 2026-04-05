'use client';

import { useEffect, useState, useTransition } from 'react';
import { format, parseISO } from 'date-fns';
import { X, Plus, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ensureDayExists } from '@/app/actions/days';
import { getActivitiesForDay } from '@/app/actions/activities';
import { getReservationsForDay } from '@/app/actions/reservations';
import { getAllPOCs } from '@/app/actions/poc';
import { getAllVenueTypes } from '@/app/actions/venue-type';
import { AddEntryModal } from '@/components/add-entry-modal';
import { AddReservationModal } from '@/components/add-reservation-modal';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import type {
  Activity,
  ActivityWithRelations,
  Reservation,
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
  activities: ActivityWithRelations[];
  reservations: Reservation[];
  pocs: PointOfContact[];
  venueTypes: VenueType[];
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CalendarDaySidebar({ date, onClose, onSummaryChanged }: Props) {
  const t = useTranslations('Tenant.sidebar');
  const [data, setData] = useState<DayData | null>(null);
  const [loading, startLoading] = useTransition();

  // Entry modal state
  const [entryModalOpen, setEntryModalOpen] = useState(false);

  // Reservation modal state
  const [reservationModalOpen, setReservationModalOpen] = useState(false);

  useEffect(() => {
    setData(null);
    startLoading(async () => {
      const dayResult = await ensureDayExists(date);
      if (!dayResult.success) return;
      const dayId = dayResult.data.id;

      const [itemsResult, resResult, pocsResult, venuesResult] =
        await Promise.all([
          getActivitiesForDay(dayId),
          getReservationsForDay(dayId),
          getAllPOCs(),
          getAllVenueTypes(),
        ]);

      setData({
        dayId,
        activities: (itemsResult.success ? itemsResult.data : []) as ActivityWithRelations[],
        reservations: resResult.success ? resResult.data : [],
        pocs: pocsResult.success ? pocsResult.data : [],
        venueTypes: venuesResult.success ? venuesResult.data : [],
      });
    });
  }, [date]);

  function handleEntrySaved(item: Activity) {
    if (!data) return;
    const updated = [...data.activities, item as ActivityWithRelations].sort(
      (a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? '')
    );
    const next = { ...data, activities: updated };
    setData(next);
    onSummaryChanged(date, {
      golfCount: updated.length,
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
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('selectedDay')}</p>
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
                onClick={() => setEntryModalOpen(true)}
              >
                <Plus className="h-3 w-3 mr-1" /> {t('golf')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => setReservationModalOpen(true)}
              >
                <Plus className="h-3 w-3 mr-1" /> {t('reservation')}
              </Button>
            </div>

            <Separator />

            {/* Activities */}
            <SidebarSection
              title={t('golfEvents')}
              empty={data.activities.length === 0}
              emptyLabel={t('none')}
            >
              {data.activities.map((item) => (
                <div key={item.id} className="flex items-baseline gap-2">
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
              title={t('reservations')}
              empty={data.reservations.length === 0}
              emptyLabel={t('none')}
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

            <Separator />

            <Button asChild size="sm" className="w-full" variant="outline">
              <Link href={`/day/${date}`}>
                {t('openDayView')} <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </>
        )}
      </div>

      {data && (
        <>
          <AddEntryModal
            isOpen={entryModalOpen}
            onClose={() => setEntryModalOpen(false)}
            date={date}
            dayId={data.dayId}
            pocs={data.pocs}
            venueTypes={data.venueTypes}
            editItem={null}
            onSuccess={handleEntrySaved}
          />
          <AddReservationModal
            isOpen={reservationModalOpen}
            onClose={() => setReservationModalOpen(false)}
            dayId={data.dayId}
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
  emptyLabel = 'None.',
  children,
}: {
  title: string;
  empty: boolean;
  emptyLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      {empty ? (
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
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
