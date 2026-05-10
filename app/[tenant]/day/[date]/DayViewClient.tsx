'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import { useDayRealtime } from './useDayRealtime'
import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { DayNav } from '@/components/day-nav'
import { DaySummaryCard } from '@/components/day-summary-card'
import { ViewerDayDashboard } from '@/components/viewer-day-dashboard'
import { ActivityCard } from '@/components/activity-card'
import { ReservationCard } from '@/components/reservation-card'
import { BreakfastCard } from '@/components/breakfast-card'

// Lazy-load heavy form modals — they only render when a user opens an edit/add
// dialog, so keep them out of the initial day-view JS bundle.
const ActivityForm = dynamic(() => import('@/components/activity-form').then((m) => m.ActivityForm))
const ReservationForm = dynamic(() =>
  import('@/components/reservation-form').then((m) => m.ReservationForm)
)
const BreakfastForm = dynamic(() =>
  import('@/components/breakfast-form').then((m) => m.BreakfastForm)
)
import { DayNotes } from '@/components/day-notes'
import { DayInfoBanner } from '@/components/day-info-banner'
import { StaffScheduleSection } from '@/components/staff-schedule-section'
import { Button } from '@/components/ui/button'
import { KbdHint } from '@/components/kbd-hint'
import { useFeatureFlag } from '@/lib/feature-flags-context'
import { useActiveDay } from '@/lib/active-day-context'
import { useDayViewHotkeys } from '@/lib/keyboard-shortcuts'
import type {
  Activity,
  ActivityWithRelations,
  Reservation,
  BreakfastConfiguration,
  ShiftWithAssignee,
} from '@/types/index'
import type { DayViewProps } from './page'
import type { DayNote } from '@/app/actions/day-notes'

function useDayViewLiveState(p: DayViewProps, staffScheduleEnabled: boolean) {
  const [activities, setActivities] = useState(() => p.activities as ActivityWithRelations[])
  const [reservations, setReservations] = useState<Reservation[]>(p.reservations)
  const [breakfastConfigs, setBreakfastConfigs] = useState<BreakfastConfiguration[]>(
    p.breakfastConfigs
  )
  const [shifts, setShifts] = useState<ShiftWithAssignee[]>(p.shifts)
  const [dayNotes, setDayNotes] = useState<DayNote[]>(p.dayNotes)

  useDayRealtime(
    p.dayId,
    setActivities,
    setReservations,
    setBreakfastConfigs,
    setShifts,
    p.shiftAssignees,
    staffScheduleEnabled,
    setDayNotes
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActivities(p.activities as ActivityWithRelations[])

    setReservations(p.reservations)

    setBreakfastConfigs(p.breakfastConfigs)

    setShifts(staffScheduleEnabled ? p.shifts : [])

    setDayNotes(p.dayNotes)
  }, [
    p.dayId,
    p.activities,
    p.reservations,
    p.breakfastConfigs,
    p.shifts,
    p.dayNotes,
    staffScheduleEnabled,
  ])

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
  }
}

export function DayViewClient(props: DayViewProps) {
  const { date, authState } = props
  const { setActiveDayYmd } = useActiveDay()
  const staffScheduleEnabled = useFeatureFlag('staff_schedule')
  const live = useDayViewLiveState(props, staffScheduleEnabled)

  useEffect(() => {
    setActiveDayYmd(date)
  }, [date, setActiveDayYmd])

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
      />
    )
  }

  return <DayViewEditor {...props} live={live} showStaffSchedule={staffScheduleEnabled} />
}

function DayViewEditor({
  date,
  dayId,
  today,
  dayNotes,
  weather,
  dailyBrief,
  briefStale,
  briefIsEmpty,
  dayHasContent,
  pocs,
  venueTypes,
  authState,
  shiftAssignees,
  forecastRecommended,
  forecastBreakdown,
  briefOverrideAuthorName,
  live,
  showStaffSchedule,
}: DayViewProps & {
  live: ReturnType<typeof useDayViewLiveState>
  showStaffSchedule: boolean
}) {
  const t = useTranslations('Tenant.day')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const showReservations = useFeatureFlag('reservations')
  const showBreakfast = useFeatureFlag('breakfast_config')
  const showWeatherReporting = useFeatureFlag('weather_reporting')
  const showDailyBrief = useFeatureFlag('daily_brief')

  const {
    activities,
    setActivities,
    reservations,
    setReservations,
    breakfastConfigs,
    setBreakfastConfigs,
    shifts,
    setShifts,
  } = live

  const [activityModalOpen, setActivityModalOpen] = useState(false)
  const [editActivity, setEditActivity] = useState<ActivityWithRelations | null>(null)

  const [reservationModalOpen, setReservationModalOpen] = useState(false)
  const [editReservation, setEditReservation] = useState<Reservation | null>(null)

  const [breakfastModalOpen, setBreakfastModalOpen] = useState(false)
  const [editBreakfast, setEditBreakfast] = useState<BreakfastConfiguration | null>(null)

  const returnFocusRef = useRef<HTMLElement | null>(null)
  const activityAddRef = useRef<HTMLButtonElement>(null)
  const reservationAddRef = useRef<HTMLButtonElement>(null)
  const breakfastAddRef = useRef<HTMLButtonElement>(null)

  const openAddActivity = useCallback(() => {
    setEditActivity(null)
    setActivityModalOpen(true)
  }, [])

  const openAddReservation = useCallback(() => {
    setEditReservation(null)
    setReservationModalOpen(true)
  }, [])

  const openAddBreakfast = useCallback(() => {
    setEditBreakfast(null)
    setBreakfastModalOpen(true)
  }, [])

  function openEditActivity(item: ActivityWithRelations) {
    setEditActivity(item)
    setActivityModalOpen(true)
  }

  function handleActivitySaved(item: Activity) {
    setActivities((prev) => {
      const idx = prev.findIndex((p) => p.id === item.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = item as ActivityWithRelations
        return next
      }
      return [...prev, item as ActivityWithRelations].sort((a, b) =>
        (a.start_time ?? '').localeCompare(b.start_time ?? '')
      )
    })
  }

  function handleActivityDeleted(id: string, mode: 'single' | 'all' | 'from-here') {
    if (mode === 'all') {
      const groupId = activities.find((p) => p.id === id)?.recurrence_group_id
      setActivities((prev) =>
        groupId
          ? prev.filter((p) => p.recurrence_group_id !== groupId)
          : prev.filter((p) => p.id !== id)
      )
    } else {
      setActivities((prev) => prev.filter((p) => p.id !== id))
    }
  }

  function openEditReservation(item: Reservation) {
    setEditReservation(item)
    setReservationModalOpen(true)
  }

  function handleReservationSaved(item: Reservation) {
    setReservations((prev) => {
      const idx = prev.findIndex((r) => r.id === item.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = item
        return next
      }
      return [...prev, item].sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''))
    })
  }

  function handleReservationDeleted(id: string) {
    setReservations((prev) => prev.filter((r) => r.id !== id))
  }

  function openEditBreakfast(config: BreakfastConfiguration) {
    setEditBreakfast(config)
    setBreakfastModalOpen(true)
  }

  function handleBreakfastSaved(config: BreakfastConfiguration) {
    setBreakfastConfigs((prev) => {
      const idx = prev.findIndex((c) => c.id === config.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = config
        return next
      }
      return [...prev, config]
    })
  }

  function handleBreakfastDeleted(id: string) {
    setBreakfastConfigs((prev) => prev.filter((c) => c.id !== id))
  }

  useDayViewHotkeys({
    date,
    today,
    impersonationRole: authState.impersonationRole,
    onOpenActivity: () => {
      returnFocusRef.current = activityAddRef.current
      openAddActivity()
    },
    ...(showReservations
      ? {
          onOpenReservation: () => {
            returnFocusRef.current = reservationAddRef.current
            openAddReservation()
          },
        }
      : {}),
    ...(showBreakfast
      ? {
          onOpenBreakfast: () => {
            returnFocusRef.current = breakfastAddRef.current
            openAddBreakfast()
          },
        }
      : {}),
  })

  useEffect(() => {
    const create = searchParams.get('create')
    if (!create) return

    if (create === 'activity') {
      returnFocusRef.current = activityAddRef.current
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditActivity(null)

      setActivityModalOpen(true)
    } else if (create === 'reservation' && showReservations) {
      returnFocusRef.current = reservationAddRef.current

      setEditReservation(null)

      setReservationModalOpen(true)
    } else if (create === 'breakfast' && showBreakfast) {
      returnFocusRef.current = breakfastAddRef.current

      setEditBreakfast(null)

      setBreakfastModalOpen(true)
    }

    const params = new URLSearchParams(searchParams.toString())
    params.delete('create')
    const q = params.toString()
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
  }, [searchParams, showReservations, showBreakfast, router, pathname])

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-3 py-4 sm:px-6 sm:py-8">
      <DayNav date={date} today={today} />

      {(showDailyBrief || showWeatherReporting) && (
        <DayInfoBanner
          weather={showWeatherReporting ? weather : null}
          showWeather={showWeatherReporting}
          initialBrief={showDailyBrief ? dailyBrief : null}
          showBrief={showDailyBrief}
          briefStale={showDailyBrief ? briefStale : false}
          briefIsEmpty={showDailyBrief ? briefIsEmpty : false}
          dayHasContent={showDailyBrief ? dayHasContent : false}
          dateIso={date}
          dayId={dayId}
          isEditor
          overrideAuthorName={briefOverrideAuthorName}
        />
      )}

      <DaySummaryCard
        activities={activities}
        reservations={reservations}
        breakfastConfigs={breakfastConfigs}
      />

      {showStaffSchedule && (
        <StaffScheduleSection
          dayId={dayId}
          shifts={shifts}
          assignees={shiftAssignees}
          isEditor={authState.isEditor}
          onShiftsChange={setShifts}
          forecastRecommended={forecastRecommended}
          forecastBreakdown={forecastBreakdown}
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
                returnFocusRef.current = breakfastAddRef.current
                openAddBreakfast()
              }}
              data-testid="add-breakfast"
            >
              <Plus className="mr-1 h-4 w-4" /> {t('addBreakfast')}
              <KbdHint className="ml-1">B</KbdHint>
            </Button>
          </div>
          {breakfastConfigs.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('noBreakfasts')}</p>
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
                    returnFocusRef.current = el
                  }}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
          <h2 className="min-w-0 font-semibold">{t('activities')}</h2>
          <Button
            ref={activityAddRef}
            size="xs"
            onClick={() => {
              returnFocusRef.current = activityAddRef.current
              openAddActivity()
            }}
            className="shrink-0"
            data-testid="add-activity"
          >
            <Plus className="size-3.5" /> {t('addActivity')}
            <KbdHint className="ml-0.5">A</KbdHint>
          </Button>
        </div>
        {activities.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('noEntries')}</p>
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
                  returnFocusRef.current = el
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
                returnFocusRef.current = reservationAddRef.current
                openAddReservation()
              }}
              data-testid="add-reservation"
            >
              <Plus className="mr-1 h-4 w-4" /> {t('addReservation')}
              <KbdHint className="ml-1">R</KbdHint>
            </Button>
          </div>
          {reservations.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('noReservations')}</p>
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
                    returnFocusRef.current = el
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
        notes={live.dayNotes}
        onNotesChange={live.setDayNotes}
        isEditor={authState.isEditor}
        currentUserId={authState.user?.id}
      />

      <ActivityForm
        isOpen={activityModalOpen}
        onClose={() => {
          setActivityModalOpen(false)
        }}
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
        onClose={() => {
          setReservationModalOpen(false)
        }}
        dayId={dayId}
        editItem={editReservation}
        onSuccess={handleReservationSaved}
        returnFocusRef={returnFocusRef}
      />

      <BreakfastForm
        isOpen={breakfastModalOpen}
        onClose={() => {
          setBreakfastModalOpen(false)
        }}
        dayId={dayId}
        editItem={editBreakfast}
        onSuccess={handleBreakfastSaved}
        returnFocusRef={returnFocusRef}
      />
    </div>
  )
}
