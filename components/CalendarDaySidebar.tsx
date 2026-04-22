'use client';

import { useEffect, useState, useTransition } from 'react';
import { format, parseISO } from 'date-fns';
import { X, Plus, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ensureDayExists } from '@/app/actions/days';
import { getActivitiesForDay } from '@/app/actions/activities';
import { getReservationsForDay } from '@/app/actions/reservations';
import { getBreakfastConfigurationsForDay } from '@/app/actions/breakfast';
import { getAllPOCs } from '@/app/actions/poc';
import { getAllVenueTypes } from '@/app/actions/venue-type';
import { ActivityForm } from '@/components/activity-form';
import { ReservationForm } from '@/components/reservation-form';
import { BreakfastForm } from '@/components/breakfast-form';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useFeatureFlag } from '@/lib/feature-flags-context';
import type {
  Activity,
  ActivityWithRelations,
  Reservation,
  BreakfastConfiguration,
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
  breakfastConfigs: BreakfastConfiguration[];
  pocs: PointOfContact[];
  venueTypes: VenueType[];
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CalendarDaySidebar({ date, onClose, onSummaryChanged }: Props) {
  const t = useTranslations('Tenant.sidebar');
  const showReservations = useFeatureFlag('reservations');
  const showBreakfast = useFeatureFlag('breakfast_config');
  const [data, setData] = useState<DayData | null>(null);
  const [loading, startLoading] = useTransition();

  // Modal state
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [reservationModalOpen, setReservationModalOpen] = useState(false);
  const [breakfastModalOpen, setBreakfastModalOpen] = useState(false);

  useEffect(() => {
    setData(null);
    startLoading(async () => {
      const dayResult = await ensureDayExists(date);
      if (!dayResult.success) return;
      const dayId = dayResult.data.id;

      const [itemsResult, resResult, bfResult, pocsResult, venuesResult] =
        await Promise.all([
          getActivitiesForDay(dayId),
          showReservations ? getReservationsForDay(dayId) : Promise.resolve({ success: true as const, data: [] as Reservation[] }),
          showBreakfast ? getBreakfastConfigurationsForDay(dayId) : Promise.resolve({ success: true as const, data: [] as BreakfastConfiguration[] }),
          getAllPOCs(),
          getAllVenueTypes(),
        ]);

      setData({
        dayId,
        activities: (itemsResult.success ? itemsResult.data : []) as ActivityWithRelations[],
        reservations: resResult.success ? resResult.data : [],
        breakfastConfigs: bfResult.success ? bfResult.data : [],
        pocs: pocsResult.success ? pocsResult.data : [],
        venueTypes: venuesResult.success ? venuesResult.data : [],
      });
    });
  }, [date, showReservations, showBreakfast]);

  function handleActivitySaved(item: Activity) {
    if (!data) return;
    const updated = [...data.activities, item as ActivityWithRelations].sort(
      (a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? '')
    );
    setData({ ...data, activities: updated });
    onSummaryChanged(date, { golfCount: updated.length });
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

  function handleBreakfastSaved(config: BreakfastConfiguration) {
    if (!data) return;
    const existing = data.breakfastConfigs.findIndex((c) => c.id === config.id);
    const updated =
      existing >= 0
        ? data.breakfastConfigs.map((c) => (c.id === config.id ? config : c))
        : [...data.breakfastConfigs, config];
    setData({ ...data, breakfastConfigs: updated });
    const totalGuests = updated.reduce((s, c) => s + c.total_guests, 0);
    onSummaryChanged(date, { breakfastCount: totalGuests });
  }

  const formattedDate = format(parseISO(date), 'EEEE d MMMM');

  return (
    <aside className="w-72 shrink-0" aria-label={formattedDate}>
      <div className="sticky top-6 space-y-4 rounded-lg border bg-card p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('selectedDay')}</p>
            <p className="font-semibold">{formattedDate}</p>
          </div>
          <Button variant="ghost" size="icon" className="-mr-1 -mt-1 h-7 w-7" onClick={onClose} aria-label={t('close')}>
            <X className="h-4 w-4" aria-hidden="true" />
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
                onClick={() => setActivityModalOpen(true)}
              >
                <Plus className="h-3 w-3 mr-1" /> {t('activity')}
              </Button>
              {showReservations && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setReservationModalOpen(true)}
                >
                  <Plus className="h-3 w-3 mr-1" /> {t('reservation')}
                </Button>
              )}
              {showBreakfast && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setBreakfastModalOpen(true)}
                >
                  <Plus className="h-3 w-3 mr-1" /> {t('breakfast')}
                </Button>
              )}
            </div>

            <Separator />

            {/* Breakfast */}
            {showBreakfast && (
              <SidebarSection
                title={t('breakfast')}
                empty={data.breakfastConfigs.length === 0}
                emptyLabel={t('none')}
              >
                {data.breakfastConfigs.map((item) => (
                  <div key={item.id} className="flex items-baseline justify-between gap-2">
                    <span className="text-sm truncate flex-1">
                      {item.group_name ?? 'Unnamed'}
                    </span>
                    {item.total_guests > 0 && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {item.total_guests} guests
                      </span>
                    )}
                  </div>
                ))}
              </SidebarSection>
            )}

            {/* Activities */}
            <SidebarSection
              title={t('activities')}
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
            {showReservations && (
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
            )}

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
          <ActivityForm
            isOpen={activityModalOpen}
            onClose={() => setActivityModalOpen(false)}
            date={date}
            dayId={data.dayId}
            pocs={data.pocs}
            venueTypes={data.venueTypes}
            editItem={null}
            onSuccess={handleActivitySaved}
          />
          {showReservations && (
            <ReservationForm
              isOpen={reservationModalOpen}
              onClose={() => setReservationModalOpen(false)}
              dayId={data.dayId}
              editItem={null}
              onSuccess={handleReservationSaved}
            />
          )}
          {showBreakfast && (
            <BreakfastForm
              isOpen={breakfastModalOpen}
              onClose={() => setBreakfastModalOpen(false)}
              dayId={data.dayId}
              editItem={null}
              onSuccess={handleBreakfastSaved}
            />
          )}
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
