'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useDayRealtime } from './useDayRealtime';
import { useTranslations } from 'next-intl';
import { Plus, Copy } from 'lucide-react';
import { DayNav } from '@/components/day-nav';
import { DaySummaryCard } from '@/components/day-summary-card';
import { ViewerDayDashboard } from '@/components/viewer-day-dashboard';
import { ActivityForm } from '@/components/activity-form';
import { ActivityCard } from '@/components/activity-card';
import { ReservationForm } from '@/components/reservation-form';
import { ReservationCard } from '@/components/reservation-card';
import { BreakfastForm } from '@/components/breakfast-form';
import { BreakfastCard } from '@/components/breakfast-card';
import { DayNotes } from '@/components/day-notes';
import { WeatherCard } from '@/components/weather-card';
import { StaffScheduleSection } from '@/components/staff-schedule-section';
import { CopyDayDialog } from '@/components/copy-day-dialog';
import { Button } from '@/components/ui/button';
import { KbdHint } from '@/components/kbd-hint';
import { useFeatureFlag } from '@/lib/feature-flags-context';
import { useActiveDay } from '@/lib/active-day-context';
import { useDayViewHotkeys } from '@/lib/keyboard-shortcuts';
import type {
  Activity,
  ActivityWithRelations,
  Reservation,
  BreakfastConfiguration,
  ShiftWithStaffMember,
} from '@/types/index';
import type { DayViewProps } from './page';

function useDayViewLiveState(p: DayViewProps) {
  const [activities, setActivities] = useState(
    () => p.activities as ActivityWithRelations[]
  );
  const [reservations, setReservations] = useState<Reservation[]>(p.reservations);
  const [breakfastConfigs, setBreakfastConfigs] = useState<BreakfastConfiguration[]>(
    p.breakfastConfigs
  );
  const [shifts, setShifts] = useState<ShiftWithStaffMember[]>(p.shifts);

  useDayRealtime(
    p.dayId,
    setActivities,
    setReservations,
    setBreakfastConfigs,
    setShifts,
    p.staffMembers
  );

  useEffect(() => {
    setActivities(p.activities as ActivityWithRelations[]);
    setReservations(p.reservations);
    setBreakfastConfigs(p.breakfastConfigs);
    setShifts(p.shifts);
  }, [
    p.dayId,
    p.activities,
    p.reservations,
    p.breakfastConfigs,
    p.shifts,
  ]);

  return {
    activities,
    setActivities,
    reservations,
    setReservations,
    breakfastConfigs,
    setBreakfastConfigs,
    shifts,
    setShifts,
  };
}

export function DayViewClient(props: DayViewProps) {
  const { date, authState } = props;
  const { setActiveDayYmd } = useActiveDay();
  const live = useDayViewLiveState(props);

  useEffect(() => {
    setActiveDayYmd(date);
  }, [date, setActiveDayYmd]);

  if (!authState.isEditor) {
    return (
      <ViewerDayDashboard
        {...props}
        activities={live.activities}
        reservations={live.reservations}
        breakfastConfigs={live.breakfastConfigs}
        shifts={live.shifts}
      />
    );
  }

  return <DayViewEditor {...props} live={live} />;
}

function DayViewEditor({
  date,
  dayId,
  today,
  dayNotes,
  weather,
  pocs,
  venueTypes,
  authState,
  staffMembers,
  staffRoles,
  live,
}: DayViewProps & {
  live: ReturnType<typeof useDayViewLiveState>;
}) {
  const t = useTranslations('Tenant.day');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const showReservations = useFeatureFlag('reservations');
  const showBreakfast = useFeatureFlag('breakfast_config');
  const showWeatherReporting = useFeatureFlag('weather_reporting');

  const {
    activities,
    setActivities,
    reservations,
    setReservations,
    breakfastConfigs,
    setBreakfastConfigs,
    shifts,
    setShifts,
  } = live;

  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [editActivity, setEditActivity] = useState<ActivityWithRelations | null>(null);

  const [reservationModalOpen, setReservationModalOpen] = useState(false);
  const [editReservation, setEditReservation] = useState<Reservation | null>(null);

  const [breakfastModalOpen, setBreakfastModalOpen] = useState(false);
  const [editBreakfast, setEditBreakfast] = useState<BreakfastConfiguration | null>(null);
  const [copyDayOpen, setCopyDayOpen] = useState(false);

  const returnFocusRef = useRef<HTMLElement | null>(null);
  const activityAddRef = useRef<HTMLButtonElement>(null);
  const reservationAddRef = useRef<HTMLButtonElement>(null);
  const breakfastAddRef = useRef<HTMLButtonElement>(null);

  const openAddActivity = useCallback(() => {
    setEditActivity(null);
    setActivityModalOpen(true);
  }, []);

  const openAddReservation = useCallback(() => {
    setEditReservation(null);
    setReservationModalOpen(true);
  }, []);

  const openAddBreakfast = useCallback(() => {
    setEditBreakfast(null);
    setBreakfastModalOpen(true);
  }, []);

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

  function handleActivityDeleted(id: string, mode: 'single' | 'all' | 'from-here') {
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

  useDayViewHotkeys({
    date,
    today,
    impersonationRole: authState.impersonationRole,
    onOpenActivity: () => {
      returnFocusRef.current = activityAddRef.current;
      openAddActivity();
    },
    onOpenReservation: showReservations
      ? () => {
          returnFocusRef.current = reservationAddRef.current;
          openAddReservation();
        }
      : undefined,
    onOpenBreakfast: showBreakfast
      ? () => {
          returnFocusRef.current = breakfastAddRef.current;
          openAddBreakfast();
        }
      : undefined,
  });

  useEffect(() => {
    const create = searchParams.get('create');
    if (!create) return;

    if (create === 'activity') {
      returnFocusRef.current = activityAddRef.current;
      setEditActivity(null);
      setActivityModalOpen(true);
    } else if (create === 'reservation' && showReservations) {
      returnFocusRef.current = reservationAddRef.current;
      setEditReservation(null);
      setReservationModalOpen(true);
    } else if (create === 'breakfast' && showBreakfast) {
      returnFocusRef.current = breakfastAddRef.current;
      setEditBreakfast(null);
      setBreakfastModalOpen(true);
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete('create');
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [searchParams, showReservations, showBreakfast, router, pathname]);

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <DayNav date={date} today={today} />
        <Button variant="outline" size="sm" className="shrink-0" onClick={() => setCopyDayOpen(true)}>
          <Copy className="h-4 w-4 mr-1" />
          {t('copyDay')}
        </Button>
      </div>

      <CopyDayDialog
        isOpen={copyDayOpen}
        onClose={() => setCopyDayOpen(false)}
        sourceDayId={dayId}
        today={today}
      />

      {showWeatherReporting && weather && <WeatherCard weather={weather} />}

      <DaySummaryCard
        activities={activities}
        reservations={reservations}
        breakfastConfigs={breakfastConfigs}
      />

      <StaffScheduleSection
        dayId={dayId}
        shifts={shifts}
        staffMembers={staffMembers}
        staffRoles={staffRoles}
        isEditor={authState.isEditor}
        onShiftsChange={setShifts}
      />

      {showBreakfast && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{t('breakfast')}</h2>
            <Button
              ref={breakfastAddRef}
              size="sm"
              onClick={() => {
                returnFocusRef.current = breakfastAddRef.current;
                openAddBreakfast();
              }}
            >
              <Plus className="w-4 h-4 mr-1" /> {t('addBreakfast')}
              <KbdHint className="ml-1">B</KbdHint>
            </Button>
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
                  onBeforeEdit={(el) => {
                    returnFocusRef.current = el;
                  }}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
          <h2 className="font-semibold min-w-0">{t('activities')}</h2>
          <Button
            ref={activityAddRef}
            size="sm"
            onClick={() => {
              returnFocusRef.current = activityAddRef.current;
              openAddActivity();
            }}
            className="h-7 shrink-0 gap-1 px-2.5 text-xs has-[>svg]:px-2"
          >
            <Plus className="size-3.5" /> {t('addActivity')}
            <KbdHint className="ml-0.5">A</KbdHint>
          </Button>
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
                onBeforeEdit={(el) => {
                  returnFocusRef.current = el;
                }}
              />
            ))}
          </div>
        )}
      </section>

      {showReservations && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{t('reservations')}</h2>
            <Button
              ref={reservationAddRef}
              size="sm"
              onClick={() => {
                returnFocusRef.current = reservationAddRef.current;
                openAddReservation();
              }}
            >
              <Plus className="w-4 h-4 mr-1" /> {t('addReservation')}
              <KbdHint className="ml-1">R</KbdHint>
            </Button>
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
                  onBeforeEdit={(el) => {
                    returnFocusRef.current = el;
                  }}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <DayNotes
        dayId={dayId}
        initialNotes={dayNotes}
        isEditor={authState.isEditor}
        currentUserId={authState.user?.id}
      />

      <ActivityForm
        isOpen={activityModalOpen}
        onClose={() => setActivityModalOpen(false)}
        date={date}
        dayId={dayId}
        pocs={pocs}
        venueTypes={venueTypes}
        editItem={editActivity}
        onSuccess={handleActivitySaved}
        returnFocusRef={returnFocusRef}
      />

      <ReservationForm
        isOpen={reservationModalOpen}
        onClose={() => setReservationModalOpen(false)}
        dayId={dayId}
        editItem={editReservation}
        onSuccess={handleReservationSaved}
        returnFocusRef={returnFocusRef}
      />

      <BreakfastForm
        isOpen={breakfastModalOpen}
        onClose={() => setBreakfastModalOpen(false)}
        dayId={dayId}
        editItem={editBreakfast}
        onSuccess={handleBreakfastSaved}
        returnFocusRef={returnFocusRef}
      />
    </div>
  );
}
