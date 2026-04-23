'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useDayRealtime } from './useDayRealtime';
import { useTranslations } from 'next-intl';
import { Plus, Copy, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
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
import { DailyBriefCard } from '@/components/daily-brief-card';
import { StaffScheduleSection } from '@/components/staff-schedule-section';
import { CopyDayDialog } from '@/components/copy-day-dialog';
import { HandoverControls } from '@/components/handover-controls';
import { QuickAddInput } from '@/components/quick-add-input';
import type { ActivityQuickAddSeed } from '@/components/activity-form';
import type { ReservationQuickAdd } from '@/components/reservation-form';
import type { BreakfastQuickAdd } from '@/components/breakfast-form';
import { Button } from '@/components/ui/button';
import { KbdHint } from '@/components/kbd-hint';
import { useFeatureFlag } from '@/lib/feature-flags-context';
import { useActiveDay } from '@/lib/active-day-context';
import { useDayViewHotkeys } from '@/lib/keyboard-shortcuts';
import { handoverRowStatus } from '@/lib/handover';
import type {
  Activity,
  ActivityWithRelations,
  Reservation,
  BreakfastConfiguration,
  ShiftWithStaffMember,
} from '@/types/index';
import type { DayViewProps } from './page';
import type { QuickAddParseData } from '@/lib/quick-add-types';
import type { DayNote } from '@/app/actions/day-notes';
import type { HandoverRemovedItem } from '@/app/actions/day-view-receipts';
import type { HandoverCounts } from '@/components/handover-controls';

function useDayViewLiveState(p: DayViewProps, staffScheduleEnabled: boolean) {
  const [activities, setActivities] = useState(
    () => p.activities as ActivityWithRelations[]
  );
  const [reservations, setReservations] = useState<Reservation[]>(p.reservations);
  const [breakfastConfigs, setBreakfastConfigs] = useState<BreakfastConfiguration[]>(
    p.breakfastConfigs
  );
  const [shifts, setShifts] = useState<ShiftWithStaffMember[]>(p.shifts);
  const [dayNotes, setDayNotes] = useState<DayNote[]>(p.dayNotes);

  useDayRealtime(
    p.dayId,
    setActivities,
    setReservations,
    setBreakfastConfigs,
    setShifts,
    p.staffMembers,
    staffScheduleEnabled,
    setDayNotes
  );

  useEffect(() => {
    setActivities(p.activities as ActivityWithRelations[]);
    setReservations(p.reservations);
    setBreakfastConfigs(p.breakfastConfigs);
    setShifts(staffScheduleEnabled ? p.shifts : []);
    setDayNotes(p.dayNotes);
  }, [
    p.dayId,
    p.activities,
    p.reservations,
    p.breakfastConfigs,
    p.shifts,
    p.dayNotes,
    staffScheduleEnabled,
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
    dayNotes,
    setDayNotes,
  };
}

export function DayViewClient(props: DayViewProps) {
  const { date, authState, handoverLastViewedAt, handoverRemoved } = props;
  const { setActiveDayYmd } = useActiveDay();
  const staffScheduleEnabled = useFeatureFlag('staff_schedule');
  const live = useDayViewLiveState(props, staffScheduleEnabled);

  const [handoverEnabled, setHandoverEnabled] = useState(false);
  const [baselineIso, setBaselineIso] = useState(handoverLastViewedAt ?? '');
  const [removedSnapshot, setRemovedSnapshot] = useState(handoverRemoved);

  useEffect(() => {
    setActiveDayYmd(date);
  }, [date, setActiveDayYmd]);

  useEffect(() => {
    if (handoverLastViewedAt) setBaselineIso(handoverLastViewedAt);
    setRemovedSnapshot(handoverRemoved);
  }, [props.dayId, handoverLastViewedAt, handoverRemoved]);

  const showHandover = Boolean(authState.user && handoverLastViewedAt);

  const handoverCounts = useMemo(() => {
    if (!showHandover || !baselineIso) {
      return { newCount: 0, editedCount: 0, removedCount: 0 };
    }
    let newCount = 0;
    let editedCount = 0;
    for (const a of live.activities) {
      const s = handoverRowStatus(a.created_at, a.updated_at, baselineIso);
      if (s === 'new') newCount++;
      else if (s === 'edited') editedCount++;
    }
    for (const r of live.reservations) {
      const s = handoverRowStatus(r.created_at, r.updated_at, baselineIso);
      if (s === 'new') newCount++;
      else if (s === 'edited') editedCount++;
    }
    for (const b of live.breakfastConfigs) {
      const s = handoverRowStatus(b.created_at, b.updated_at, baselineIso);
      if (s === 'new') newCount++;
      else if (s === 'edited') editedCount++;
    }
    for (const n of live.dayNotes) {
      const s = handoverRowStatus(n.created_at, n.updated_at, baselineIso);
      if (s === 'new') newCount++;
      else if (s === 'edited') editedCount++;
    }
    return {
      newCount,
      editedCount,
      removedCount: removedSnapshot.length,
    };
  }, [
    showHandover,
    baselineIso,
    live.activities,
    live.reservations,
    live.breakfastConfigs,
    live.dayNotes,
    removedSnapshot.length,
  ]);

  const onHandoverCaughtUp = useCallback((next: string) => {
    setBaselineIso(next);
    setRemovedSnapshot([]);
  }, []);

  if (!authState.isEditor) {
    return (
      <ViewerDayDashboard
        {...props}
        activities={live.activities}
        reservations={live.reservations}
        breakfastConfigs={live.breakfastConfigs}
        shifts={live.shifts}
        dayNotes={live.dayNotes}
        setDayNotes={live.setDayNotes}
        handoverEnabled={handoverEnabled}
        onHandoverEnabledChange={setHandoverEnabled}
        handoverBaselineIso={showHandover ? baselineIso : null}
        handoverRemoved={removedSnapshot}
        handoverCounts={handoverCounts}
        onHandoverCaughtUp={onHandoverCaughtUp}
        showHandover={showHandover}
      />
    );
  }

  return (
    <DayViewEditor
      {...props}
      live={live}
      showStaffSchedule={staffScheduleEnabled}
      handoverEnabled={handoverEnabled}
      onHandoverEnabledChange={setHandoverEnabled}
      handoverBaselineIso={showHandover ? baselineIso : null}
      handoverRemoved={removedSnapshot}
      handoverCounts={handoverCounts}
      onHandoverCaughtUp={onHandoverCaughtUp}
      showHandover={showHandover}
    />
  );
}

function DayViewEditor({
  date,
  dayId,
  today,
  dayNotes,
  weather,
  dailyBrief,
  pocs,
  venueTypes,
  authState,
  staffMembers,
  staffRoles,
  live,
  showStaffSchedule,
  handoverEnabled,
  onHandoverEnabledChange,
  handoverBaselineIso,
  handoverRemoved,
  handoverCounts,
  onHandoverCaughtUp,
  showHandover,
}: DayViewProps & {
  live: ReturnType<typeof useDayViewLiveState>;
  showStaffSchedule: boolean;
  handoverEnabled: boolean;
  onHandoverEnabledChange: (enabled: boolean) => void;
  handoverBaselineIso: string | null;
  handoverRemoved: HandoverRemovedItem[];
  handoverCounts: HandoverCounts;
  onHandoverCaughtUp: (nextBaselineIso: string) => void;
  showHandover: boolean;
}) {
  const t = useTranslations('Tenant.day');
  const tQa = useTranslations('Tenant.quickAdd');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const showReservations = useFeatureFlag('reservations');
  const showBreakfast = useFeatureFlag('breakfast_config');
  const showWeatherReporting = useFeatureFlag('weather_reporting');
  const showDailyBrief = useFeatureFlag('daily_brief');

  const {
    activities,
    setActivities,
    reservations,
    setReservations,
    breakfastConfigs,
    setBreakfastConfigs,
    shifts,
    setShifts,
    dayNotes: liveDayNotes,
    setDayNotes,
  } = live;

  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [editActivity, setEditActivity] = useState<ActivityWithRelations | null>(null);

  const [reservationModalOpen, setReservationModalOpen] = useState(false);
  const [editReservation, setEditReservation] = useState<Reservation | null>(null);

  const [breakfastModalOpen, setBreakfastModalOpen] = useState(false);
  const [editBreakfast, setEditBreakfast] = useState<BreakfastConfiguration | null>(null);
  const [copyDayOpen, setCopyDayOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [activityQuickAdd, setActivityQuickAdd] = useState<ActivityQuickAddSeed | null>(null);
  const [reservationQuickAdd, setReservationQuickAdd] = useState<ReservationQuickAdd | null>(null);
  const [breakfastQuickAdd, setBreakfastQuickAdd] = useState<BreakfastQuickAdd | null>(null);

  const returnFocusRef = useRef<HTMLElement | null>(null);
  const activityAddRef = useRef<HTMLButtonElement>(null);
  const reservationAddRef = useRef<HTMLButtonElement>(null);
  const breakfastAddRef = useRef<HTMLButtonElement>(null);

  const openAddActivity = useCallback(() => {
    setEditActivity(null);
    setActivityQuickAdd(null);
    setActivityModalOpen(true);
  }, []);

  const openAddReservation = useCallback(() => {
    setEditReservation(null);
    setReservationQuickAdd(null);
    setReservationModalOpen(true);
  }, []);

  const openAddBreakfast = useCallback(() => {
    setEditBreakfast(null);
    setBreakfastQuickAdd(null);
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

  useEffect(() => {
    setActivityQuickAdd(null);
    setReservationQuickAdd(null);
    setBreakfastQuickAdd(null);
  }, [date, dayId]);

  const handleQuickAddSuccess = useCallback(
    (data: QuickAddParseData, raw: string) => {
      if (data.dateAmbiguous) {
        toast.info(tQa('dateAmbiguous'));
      }
      if (data.kind === 'breakfast' && !showBreakfast) {
        toast(tQa('typeDisabled'));
        setReservationQuickAdd({ kind: 'failed', rawText: raw });
        setEditReservation(null);
        setReservationModalOpen(true);
        return;
      }
      if (data.kind === 'reservation' && !showReservations) {
        toast(tQa('typeDisabled'));
        setActivityQuickAdd({
          defaults: {
            title: '',
            description: '',
            startTime: '',
            endTime: '',
            expectedCovers: '',
            notes: raw,
          },
          allergens: [],
          gapFieldKeys: ['title', 'startTime', 'expectedCovers'],
        });
        setEditActivity(null);
        setActivityModalOpen(true);
        return;
      }
      if (data.kind === 'activity') {
        setActivityQuickAdd({
          defaults: data.defaults,
          allergens: data.allergens,
          gapFieldKeys: data.gapFieldKeys,
        });
        setEditActivity(null);
        setActivityModalOpen(true);
        return;
      }
      if (data.kind === 'reservation') {
        setReservationQuickAdd({
          kind: 'parsed',
          defaults: data.defaults,
          tableBreakdown: data.tableBreakdown,
          allergens: data.allergens,
          gapFieldKeys: data.gapFieldKeys,
        });
        setEditReservation(null);
        setReservationModalOpen(true);
        return;
      }
      setBreakfastQuickAdd({
        defaults: data.defaults,
        tableBreakdown: data.tableBreakdown,
        allergens: data.allergens,
        gapFieldKeys: data.gapFieldKeys,
      });
      setEditBreakfast(null);
      setBreakfastModalOpen(true);
    },
    [showBreakfast, showReservations, tQa]
  );

  const handleQuickAddParseFailed = useCallback(
    (raw: string, error: string) => {
      if (error.includes('Too many') || error.includes('Not authorized')) {
        toast.error(error);
        return;
      }
      if (error.includes('AI is not configured') || error.includes('AI_GATEWAY')) {
        toast.error(error);
        return;
      }
      toast.error(tQa('parseFailed'));
      setReservationQuickAdd({ kind: 'failed', rawText: raw });
      setEditReservation(null);
      setReservationModalOpen(true);
    },
    [tQa]
  );

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
    if (searchParams.get('openQuickAdd') === '1') {
      setQuickAddOpen(true);
      const params = new URLSearchParams(searchParams.toString());
      params.delete('openQuickAdd');
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    }
  }, [searchParams, router, pathname]);

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
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="shrink-0"
            onClick={() => {
              returnFocusRef.current = null;
              setQuickAddOpen(true);
            }}
          >
            <Sparkles className="h-4 w-4 mr-1" />
            {tQa('openButton')}
          </Button>
          <Button variant="outline" size="sm" className="shrink-0" onClick={() => setCopyDayOpen(true)}>
            <Copy className="h-4 w-4 mr-1" />
            {t('copyDay')}
          </Button>
        </div>
      </div>

      <QuickAddInput
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        contextDate={date}
        onSuccess={handleQuickAddSuccess}
        onParseFailed={handleQuickAddParseFailed}
      />

      {showHandover && (
        <HandoverControls
          dayId={dayId}
          removed={handoverRemoved}
          handoverEnabled={handoverEnabled}
          onHandoverEnabledChange={onHandoverEnabledChange}
          counts={handoverCounts}
          onCaughtUp={onHandoverCaughtUp}
        />
      )}

      <CopyDayDialog
        isOpen={copyDayOpen}
        onClose={() => setCopyDayOpen(false)}
        sourceDayId={dayId}
        today={today}
        showCopyShifts={showStaffSchedule}
      />

      {showDailyBrief && (
        <DailyBriefCard
          dateIso={date}
          dayId={dayId}
          initialBrief={dailyBrief}
          isEditor
        />
      )}

      {showWeatherReporting && weather && <WeatherCard weather={weather} />}

      <DaySummaryCard
        activities={activities}
        reservations={reservations}
        breakfastConfigs={breakfastConfigs}
      />

      {showStaffSchedule && (
        <StaffScheduleSection
          dayId={dayId}
          shifts={shifts}
          staffMembers={staffMembers}
          staffRoles={staffRoles}
          isEditor={authState.isEditor}
          onShiftsChange={setShifts}
        />
      )}

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
                  handoverStatus={
                    handoverEnabled && handoverBaselineIso
                      ? handoverRowStatus(item.created_at, item.updated_at, handoverBaselineIso)
                      : null
                  }
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
                handoverStatus={
                  handoverEnabled && handoverBaselineIso
                    ? handoverRowStatus(item.created_at, item.updated_at, handoverBaselineIso)
                    : null
                }
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
                  handoverStatus={
                    handoverEnabled && handoverBaselineIso
                      ? handoverRowStatus(item.created_at, item.updated_at, handoverBaselineIso)
                      : null
                  }
                />
              ))}
            </div>
          )}
        </section>
      )}

      <DayNotes
        dayId={dayId}
        initialNotes={dayNotes}
        notes={live.dayNotes}
        onNotesChange={live.setDayNotes}
        isEditor={authState.isEditor}
        currentUserId={authState.user?.id}
        handoverEnabled={handoverEnabled}
        handoverBaselineIso={handoverBaselineIso}
      />

      <ActivityForm
        isOpen={activityModalOpen}
        onClose={() => {
          setActivityModalOpen(false);
          setActivityQuickAdd(null);
        }}
        date={date}
        dayId={dayId}
        pocs={pocs}
        venueTypes={venueTypes}
        editItem={editActivity}
        onSuccess={handleActivitySaved}
        returnFocusRef={returnFocusRef}
        quickAdd={!editActivity ? activityQuickAdd : null}
      />

      <ReservationForm
        isOpen={reservationModalOpen}
        onClose={() => {
          setReservationModalOpen(false);
          setReservationQuickAdd(null);
        }}
        dayId={dayId}
        editItem={editReservation}
        onSuccess={handleReservationSaved}
        returnFocusRef={returnFocusRef}
        quickAdd={!editReservation ? reservationQuickAdd : null}
      />

      <BreakfastForm
        isOpen={breakfastModalOpen}
        onClose={() => {
          setBreakfastModalOpen(false);
          setBreakfastQuickAdd(null);
        }}
        dayId={dayId}
        editItem={editBreakfast}
        onSuccess={handleBreakfastSaved}
        returnFocusRef={returnFocusRef}
        quickAdd={!editBreakfast ? breakfastQuickAdd : null}
      />
    </div>
  );
}
