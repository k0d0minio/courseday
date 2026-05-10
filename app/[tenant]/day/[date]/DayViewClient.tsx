'use client'
// fmt
import { useCallback, useEffect, useRef, useState } from 'react'
import { DayAddMenu } from '@/components/day-add-menu'
import dynamic from 'next/dynamic'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import { useDayRealtime } from './useDayRealtime'
import { useTranslations } from 'next-intl'
import { DayNav } from '@/components/day-nav'
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
  const tsummary = useTranslations('Tenant.summary')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const showReservations = useFeatureFlag('reservations')
  const showBreakfast = useFeatureFlag('breakfast_config')
  const showWeatherReporting = useFeatureFlag('weather_reporting')
  const showDailyBrief = useFeatureFlag('daily_brief')

  const [openBlocks, setOpenBlocks] = useState<Set<'breakfast' | 'activities' | 'reservations'>>(
    new Set()
  )
  const toggleBlock = (key: 'breakfast' | 'activities' | 'reservations') => {
    setOpenBlocks((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

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
  const addMenuRef = useRef<HTMLButtonElement>(null)
  const shiftAddTriggerRef = useRef<(() => void) | null>(null)

  const openAddActivity = useCallback(() => {
    returnFocusRef.current = addMenuRef.current
    setEditActivity(null)
    setActivityModalOpen(true)
  }, [])

  const openAddReservation = useCallback(() => {
    returnFocusRef.current = addMenuRef.current
    setEditReservation(null)
    setReservationModalOpen(true)
  }, [])

  const openAddBreakfast = useCallback(() => {
    returnFocusRef.current = addMenuRef.current
    setEditBreakfast(null)
    setBreakfastModalOpen(true)
  }, [])

  const openAddShift = useCallback(() => {
    shiftAddTriggerRef.current?.()
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
    onOpenActivity: openAddActivity,
    ...(showReservations ? { onOpenReservation: openAddReservation } : {}),
    ...(showBreakfast ? { onOpenBreakfast: openAddBreakfast } : {}),
  })

  useEffect(() => {
    const create = searchParams.get('create')
    if (!create) return

    if (create === 'activity') {
      openAddActivity()
    } else if (create === 'reservation' && showReservations) {
      openAddReservation()
    } else if (create === 'breakfast' && showBreakfast) {
      openAddBreakfast()
    }

    const params = new URLSearchParams(searchParams.toString())
    params.delete('create')
    const q = params.toString()
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
  }, [
    searchParams,
    showReservations,
    showBreakfast,
    router,
    pathname,
    openAddActivity,
    openAddReservation,
    openAddBreakfast,
  ])

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-3 py-4 sm:px-6 sm:py-8">
      <div className="flex items-center justify-between gap-2">
        <DayNav date={date} today={today} />
        <DayAddMenu
          ref={addMenuRef}
          onAddActivity={openAddActivity}
          onAddReservation={showReservations ? openAddReservation : undefined}
          onAddBreakfast={showBreakfast ? openAddBreakfast : undefined}
          onAddShift={showStaffSchedule && shiftAssignees.length > 0 ? openAddShift : undefined}
        />
      </div>

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

      {/* Expandable stat blocks — click to reveal item list with editor affordances */}
      <div className="space-y-3">
        <div
          className={`grid gap-3 ${showBreakfast && showReservations ? 'grid-cols-3' : showBreakfast || showReservations ? 'grid-cols-2' : 'grid-cols-1'}`}
        >
          {showBreakfast && (
            // eslint-disable-next-line no-restricted-syntax
            <button
              className="bg-card hover:bg-muted/30 cursor-pointer rounded-lg border px-3 py-4 text-center transition-colors"
              onClick={() => toggleBlock('breakfast')}
              aria-expanded={openBlocks.has('breakfast')}
            >
              <p className="text-4xl leading-none font-bold tabular-nums">
                {breakfastConfigs.reduce((s, b) => s + b.total_guests, 0)}
              </p>
              <p className="text-muted-foreground mt-2 text-xs leading-tight">
                {tsummary('breakfast')}
              </p>
            </button>
          )}
          {/* eslint-disable-next-line no-restricted-syntax */}
          <button
            className="bg-card hover:bg-muted/30 cursor-pointer rounded-lg border px-3 py-4 text-center transition-colors"
            onClick={() => toggleBlock('activities')}
            aria-expanded={openBlocks.has('activities')}
          >
            <p className="text-4xl leading-none font-bold tabular-nums">
              {activities.reduce((s, a) => s + (a.expected_covers ?? 0), 0)}
            </p>
            <p className="text-muted-foreground mt-2 text-xs leading-tight">
              {tsummary('activities')}
            </p>
          </button>
          {showReservations && (
            // eslint-disable-next-line no-restricted-syntax
            <button
              className="bg-card hover:bg-muted/30 cursor-pointer rounded-lg border px-3 py-4 text-center transition-colors"
              onClick={() => toggleBlock('reservations')}
              aria-expanded={openBlocks.has('reservations')}
            >
              <p className="text-4xl leading-none font-bold tabular-nums">
                {reservations.reduce((s, r) => s + (r.guest_count ?? 0), 0)}
              </p>
              <p className="text-muted-foreground mt-2 text-xs leading-tight">
                {tsummary('reservations')}
              </p>
            </button>
          )}
        </div>

        {openBlocks.has('breakfast') && showBreakfast && (
          <section className="space-y-2">
            {breakfastConfigs.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t('noBreakfasts')}</p>
            ) : (
              breakfastConfigs.map((item) => (
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
              ))
            )}
          </section>
        )}

        {openBlocks.has('activities') && (
          <section className="space-y-2">
            {activities.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t('noEntries')}</p>
            ) : (
              activities.map((item) => (
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
              ))
            )}
          </section>
        )}

        {openBlocks.has('reservations') && showReservations && (
          <section className="space-y-2">
            {reservations.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t('noReservations')}</p>
            ) : (
              reservations.map((item) => (
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
              ))
            )}
          </section>
        )}
      </div>

      {showStaffSchedule && (
        <StaffScheduleSection
          dayId={dayId}
          shifts={shifts}
          assignees={shiftAssignees}
          isEditor={authState.isEditor}
          onShiftsChange={setShifts}
          forecastRecommended={forecastRecommended}
          forecastBreakdown={forecastBreakdown}
          addTriggerRef={shiftAddTriggerRef}
        />
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
