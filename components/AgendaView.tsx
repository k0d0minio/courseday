'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { format, addDays, parseISO } from 'date-fns';
import { ChevronDown, ChevronRight, ArrowRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { getDaySummaries } from '@/app/actions/agenda';
import { getActivitiesForDay } from '@/app/actions/activities';
import { getReservationsForDay } from '@/app/actions/reservations';
import { getBreakfastConfigurationsForDay } from '@/app/actions/breakfast';
import { getAllPOCs } from '@/app/actions/poc';
import { getAllVenueTypes } from '@/app/actions/venue-type';
import { ActivityForm } from '@/components/activity-form';
import { ReservationForm } from '@/components/reservation-form';
import { BreakfastForm } from '@/components/breakfast-form';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
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
  today: string;
  /** When false, hide add-item controls and server forms (viewer home). */
  isEditor?: boolean;
};

type ExpandedData = {
  activities: ActivityWithRelations[];
  reservations: Reservation[];
  breakfastConfigs: BreakfastConfiguration[];
  pocs: PointOfContact[];
  venueTypes: VenueType[];
};

const PAGE_SIZE = 14;

// ---------------------------------------------------------------------------
// AgendaView
// ---------------------------------------------------------------------------

export function AgendaView({ today, isEditor = true }: Props) {
  const t = useTranslations('Tenant.home');
  const ts = useTranslations('Tenant.sidebar');
  const showReservations = useFeatureFlag('reservations');
  const showBreakfast = useFeatureFlag('breakfast_config');
  const [summaries, setSummaries] = useState<DaySummary[]>([]);
  const [initialLoading, startInitialLoad] = useTransition();
  const [loadingMore, startLoadMore] = useTransition();
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const initialized = useRef(false);

  // Load initial 14 days on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const end = format(addDays(parseISO(today), PAGE_SIZE - 1), 'yyyy-MM-dd');
    startInitialLoad(async () => {
      const result = await getDaySummaries(today, end);
      if (result.success) setSummaries(result.data);
    });
  }, [today]);

  function handleSummaryChanged(date: string, patch: Partial<DaySummary>) {
    setSummaries((prev) =>
      prev.map((s) => (s.date === date ? { ...s, ...patch } : s))
    );
  }

  function loadMore() {
    if (summaries.length === 0) return;
    const lastDate = summaries[summaries.length - 1].date;
    const nextStart = format(addDays(parseISO(lastDate), 1), 'yyyy-MM-dd');
    const nextEnd = format(addDays(parseISO(lastDate), PAGE_SIZE), 'yyyy-MM-dd');
    startLoadMore(async () => {
      const result = await getDaySummaries(nextStart, nextEnd);
      if (result.success) setSummaries((prev) => [...prev, ...result.data]);
    });
  }

  if (initialLoading && summaries.length === 0) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {summaries.map((summary) => (
        <AgendaDayRow
          key={summary.date}
          summary={summary}
          today={today}
          isEditor={isEditor}
          isExpanded={expandedDate === summary.date}
          onToggle={() =>
            setExpandedDate((prev) =>
              prev === summary.date ? null : summary.date
            )
          }
          onSummaryChanged={(patch) => handleSummaryChanged(summary.date, patch)}
          showReservations={showReservations}
          showBreakfast={showBreakfast}
        />
      ))}

      <div className="pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={loadMore}
          disabled={loadingMore || summaries.length === 0}
        >
          {loadingMore ? ts('loading') : t('loadMore')}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AgendaDayRow
// ---------------------------------------------------------------------------

type RowProps = {
  summary: DaySummary;
  today: string;
  isEditor: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onSummaryChanged: (patch: Partial<DaySummary>) => void;
  showReservations: boolean;
  showBreakfast: boolean;
};

function AgendaDayRow({
  summary,
  today,
  isEditor,
  isExpanded,
  onToggle,
  onSummaryChanged,
  showReservations,
  showBreakfast,
}: RowProps) {
  const ts = useTranslations('Tenant.sidebar');
  const [expandedData, setExpandedData] = useState<ExpandedData | null>(null);
  const [dataLoading, startDataLoad] = useTransition();
  const hasLoaded = useRef(false);

  // Activity modal
  const [activityOpen, setActivityOpen] = useState(false);
  const [reservationOpen, setReservationOpen] = useState(false);
  const [breakfastOpen, setBreakfastOpen] = useState(false);

  // Lazy-load day data on first expand
  useEffect(() => {
    if (!isExpanded || hasLoaded.current) return;
    hasLoaded.current = true;
    startDataLoad(async () => {
      const noRes = { success: true as const, data: [] as Reservation[] };
      const noBf = { success: true as const, data: [] as BreakfastConfiguration[] };

      if (isEditor) {
        const [activitiesRes, reservationsRes, bfRes, pocsRes, venuesRes] =
          await Promise.all([
            getActivitiesForDay(summary.dayId),
            showReservations ? getReservationsForDay(summary.dayId) : Promise.resolve(noRes),
            showBreakfast ? getBreakfastConfigurationsForDay(summary.dayId) : Promise.resolve(noBf),
            getAllPOCs(),
            getAllVenueTypes(),
          ]);
        setExpandedData({
          activities: (activitiesRes.success
            ? activitiesRes.data
            : []) as ActivityWithRelations[],
          reservations: reservationsRes.success ? reservationsRes.data : [],
          breakfastConfigs: bfRes.success ? bfRes.data : [],
          pocs: pocsRes.success ? pocsRes.data : [],
          venueTypes: venuesRes.success ? venuesRes.data : [],
        });
      } else {
        const [activitiesRes, reservationsRes, bfRes] = await Promise.all([
          getActivitiesForDay(summary.dayId),
          showReservations ? getReservationsForDay(summary.dayId) : Promise.resolve(noRes),
          showBreakfast ? getBreakfastConfigurationsForDay(summary.dayId) : Promise.resolve(noBf),
        ]);
        setExpandedData({
          activities: (activitiesRes.success
            ? activitiesRes.data
            : []) as ActivityWithRelations[],
          reservations: reservationsRes.success ? reservationsRes.data : [],
          breakfastConfigs: bfRes.success ? bfRes.data : [],
          pocs: [],
          venueTypes: [],
        });
      }
    });
  }, [isExpanded, isEditor, summary.dayId, showReservations, showBreakfast]);

  const isToday = summary.date === today;
  const formattedDate = format(parseISO(summary.date), 'EEEE d MMMM');

  const countParts: string[] = [];
  if (summary.golfCount > 0)
    countParts.push(ts('activityCount', { count: summary.golfCount }));
  if (showReservations && summary.reservationCount > 0)
    countParts.push(ts('reservationCount', { count: summary.reservationCount }));
  if (showBreakfast && summary.breakfastCount > 0)
    countParts.push(ts('breakfastCoverCount', { count: summary.breakfastCount }));

  return (
    <>
      <div className={cn('rounded-lg border bg-card', isToday && 'border-primary/60')}>
        {/* Row header — always visible */}
        <button
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-accent/50 transition-colors rounded-lg"
          onClick={onToggle}
        >
          <div className="min-w-0">
            <span
              className={cn(
                'font-medium text-sm',
                isToday && 'text-primary'
              )}
            >
              {formattedDate}
            </span>
            {countParts.length > 0 ? (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {countParts.join(' · ')}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">{ts('nothingScheduled')}</p>
            )}
          </div>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground ml-2" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground ml-2" />
          )}
        </button>

        {/* Expanded content */}
        {isExpanded && (
          <div className="px-4 pb-4 space-y-4 border-t">
            {dataLoading && !expandedData && (
              <div className="space-y-2 pt-3">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            )}

            {expandedData && (
              <>
                {isEditor && (
                  <div className="flex flex-wrap gap-2 pt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => setActivityOpen(true)}
                    >
                      <Plus className="h-3 w-3 mr-1" /> {ts('activity')}
                    </Button>
                    {showReservations && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => setReservationOpen(true)}
                      >
                        <Plus className="h-3 w-3 mr-1" /> {ts('reservation')}
                      </Button>
                    )}
                    {showBreakfast && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => setBreakfastOpen(true)}
                      >
                        <Plus className="h-3 w-3 mr-1" /> {ts('breakfast')}
                      </Button>
                    )}
                  </div>
                )}

                {/* Breakfast */}
                {showBreakfast && expandedData.breakfastConfigs.length > 0 && (
                  <InlineSection title={ts('breakfast')}>
                    {expandedData.breakfastConfigs.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-baseline justify-between gap-2 text-sm"
                      >
                        <span className="truncate flex-1">
                          {item.group_name ?? 'Unnamed'}
                        </span>
                        {item.total_guests > 0 && (
                          <span className="text-muted-foreground shrink-0">
                            {item.total_guests} guests
                          </span>
                        )}
                      </div>
                    ))}
                  </InlineSection>
                )}

                {/* Activities */}
                {expandedData.activities.length > 0 && (
                  <InlineSection title={ts('activities')}>
                    {expandedData.activities.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-baseline gap-2 text-sm"
                      >
                        <span className="truncate flex-1">{item.title}</span>
                        {item.start_time && (
                          <span className="text-muted-foreground shrink-0">
                            {item.start_time.slice(0, 5)}
                          </span>
                        )}
                      </div>
                    ))}
                  </InlineSection>
                )}

                {/* Reservations */}
                {showReservations && expandedData.reservations.length > 0 && (
                  <InlineSection title={ts('reservations')}>
                    {expandedData.reservations.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-baseline justify-between gap-2 text-sm"
                      >
                        <span className="truncate flex-1">
                          {item.guest_name ?? 'Guest'}
                        </span>
                        {item.start_time && (
                          <span className="text-muted-foreground shrink-0">
                            {item.start_time.slice(0, 5)}
                          </span>
                        )}
                      </div>
                    ))}
                  </InlineSection>
                )}

                <Separator />

                <Button asChild size="sm" variant="outline" className="w-full">
                  <Link href={`/day/${summary.date}`}>
                    {ts('openDayView')} <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Forms — rendered outside the card to avoid stacking-context issues */}
      {isEditor && expandedData && (
        <>
          <ActivityForm
            isOpen={activityOpen}
            onClose={() => setActivityOpen(false)}
            date={summary.date}
            dayId={summary.dayId}
            pocs={expandedData.pocs}
            venueTypes={expandedData.venueTypes}
            editItem={null}
            onSuccess={(item: Activity) => {
              setExpandedData((prev) =>
                prev
                  ? {
                      ...prev,
                      activities: [
                        ...prev.activities,
                        item as ActivityWithRelations,
                      ],
                    }
                  : prev
              );
              onSummaryChanged({ golfCount: summary.golfCount + 1 });
            }}
          />
          {showReservations && (
            <ReservationForm
              isOpen={reservationOpen}
              onClose={() => setReservationOpen(false)}
              dayId={summary.dayId}
              editItem={null}
              onSuccess={(item: Reservation) => {
                setExpandedData((prev) =>
                  prev
                    ? { ...prev, reservations: [...prev.reservations, item] }
                    : prev
                );
                onSummaryChanged({
                  reservationCount: summary.reservationCount + 1,
                });
              }}
            />
          )}
          {showBreakfast && (
            <BreakfastForm
              isOpen={breakfastOpen}
              onClose={() => setBreakfastOpen(false)}
              dayId={summary.dayId}
              editItem={null}
              onSuccess={(item: BreakfastConfiguration) => {
                setExpandedData((prev) =>
                  prev
                    ? {
                        ...prev,
                        breakfastConfigs: [...prev.breakfastConfigs, item],
                      }
                    : prev
                );
                onSummaryChanged({
                  breakfastCount: summary.breakfastCount + item.total_guests,
                });
              }}
            />
          )}
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// InlineSection
// ---------------------------------------------------------------------------

function InlineSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
