import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

import { getTenantFromHeaders } from '@/lib/tenant'
import { requireTenantMember } from '@/lib/guards'
import { getAuthState } from '@/app/actions/auth'
import { ensureDayExists } from '@/app/actions/days'
import { getAllPOCs } from '@/app/actions/poc'
import { getAllVenueTypes } from '@/app/actions/venue-type'
import { isPastDate, isDateWithinOneYear, getTenantToday } from '@/lib/day-utils'
import {
  getProgramItemsForDay,
  getReservationsForDay,
  getBreakfastConfigsForDay,
  getDayNotesForDay,
  getDailyBriefForDay,
  getShiftsForDay,
  getTenantAssigneesList,
} from './queries'
import { Suspense } from 'react'
import { DayViewClient } from './DayViewClient'
import type {
  Activity,
  Reservation,
  BreakfastConfiguration,
  PointOfContact,
  VenueType,
  ShiftAssignee,
  ShiftWithAssignee,
} from '@/types/index'
import type { AuthState } from '@/types/actions'
import type { DayNote } from '@/app/actions/day-notes'
import type { DailyBriefRecord } from '@/types/daily-brief'
import { getWeatherForDay } from '@/app/actions/weather'
import type { WeatherData } from '@/app/actions/weather'
import { getFeatureFlags } from '@/app/actions/feature-flags'
import { dayHasPlannedContent } from '@/lib/daily-brief-generate'
import { recommendStaffCount } from '@/lib/staffing-forecast'

// Inline stale check to avoid pulling the LLM-generation server action onto
// the request critical path. Mirrors the helper in app/actions/daily-brief.ts.
function isBriefStale(
  brief: DailyBriefRecord,
  activities: Activity[],
  reservations: Reservation[],
  breakfasts: BreakfastConfiguration[],
  dayNotes: DayNote[]
): boolean {
  const briefTime = new Date(brief.generated_at).getTime()
  const timestamps: string[] = [
    ...activities.map((a) => a.updated_at),
    ...reservations.map((r) => r.updated_at),
    ...breakfasts.map((b) => b.updated_at),
    ...dayNotes.map((n) => n.updated_at),
  ]
  if (timestamps.length === 0) return false
  const maxUpdated = Math.max(...timestamps.map((t) => new Date(t).getTime()))
  return maxUpdated > briefTime
}

export type DayViewProps = {
  date: string
  dayId: string
  today: string
  activities: Activity[]
  reservations: Reservation[]
  breakfastConfigs: BreakfastConfiguration[]
  dayNotes: DayNote[]
  weather: WeatherData | null
  dailyBrief: DailyBriefRecord | null
  briefStale: boolean
  briefIsEmpty: boolean
  /**
   * True when the day has at least one activity / reservation / breakfast.
   * Lets the daily-brief banner trigger client-side generation when no brief
   * exists yet, replacing the previous synchronous server-side `ensureDailyBrief`
   * call that was blocking page render on the LLM round-trip.
   */
  dayHasContent: boolean
  pocs: PointOfContact[]
  venueTypes: VenueType[]
  authState: AuthState
  shifts: ShiftWithAssignee[]
  shiftAssignees: ShiftAssignee[]
  staffRecommended: number
  staffForecastBreakdown: { source: string; count: number }[]
}

const YMD_REGEX = /^\d{4}-\d{2}-\d{2}$/

export default async function DayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params

  // All three are independent — run in parallel to shorten critical-path latency.
  const [tenant, supabase] = await Promise.all([
    getTenantFromHeaders(),
    createSupabaseServerClient(),
    requireTenantMember(),
  ] as const)

  const tenantData = await supabase
    .from('tenants')
    .select('timezone, latitude, longitude')
    .eq('id', tenant.id)
    .single()

  const tenantRow = tenantData.data as {
    timezone?: string | null
    latitude?: number | null
    longitude?: number | null
  } | null
  const timezone = tenantRow?.timezone ?? 'UTC'

  const today = getTenantToday(timezone)

  // Validate date — redirect to today on any invalid input
  if (!YMD_REGEX.test(date) || isPastDate(date, timezone) || !isDateWithinOneYear(date, timezone)) {
    redirect(`/day/${today}`)
  }

  // Ensure Day row exists (idempotent)
  const dayResult = await ensureDayExists(date)
  if (!dayResult.success) redirect(`/day/${today}`)
  const day = dayResult.data

  // Pass coordinates from the already-fetched tenant row so getWeatherForDay
  // can skip its own DB query (saves one round-trip inside the parallel block).
  const weatherCoords =
    tenantRow?.latitude && tenantRow?.longitude
      ? {
          latitude: tenantRow.latitude,
          longitude: tenantRow.longitude,
          timezone,
        }
      : undefined

  const [flags, authState] = await Promise.all([getFeatureFlags(tenant.id), getAuthState()])
  const staffScheduleOn = flags.staff_schedule
  const dailyBriefOn = flags.daily_brief

  // Load all day data in parallel — skip disabled features.
  // Daily brief is now a fast read-only fetch (no LLM call on the critical path);
  // generation is triggered client-side from the banner when missing.
  const [
    activities,
    reservations,
    breakfastConfigs,
    dayNotes,
    weather,
    pocsResult,
    venueTypesResult,
    shifts,
    shiftAssignees,
    existingBrief,
  ] = await Promise.all([
    getProgramItemsForDay(tenant.id, day.id),
    flags.reservations ? getReservationsForDay(tenant.id, day.id) : Promise.resolve([]),
    flags.breakfast_config ? getBreakfastConfigsForDay(tenant.id, day.id) : Promise.resolve([]),
    getDayNotesForDay(tenant.id, day.id),
    flags.weather_reporting ? getWeatherForDay(date, weatherCoords) : Promise.resolve(null),
    getAllPOCs(),
    getAllVenueTypes(),
    staffScheduleOn ? getShiftsForDay(tenant.id, day.id) : Promise.resolve([]),
    staffScheduleOn ? getTenantAssigneesList(tenant.id) : Promise.resolve([]),
    dailyBriefOn ? getDailyBriefForDay(tenant.id, day.id) : Promise.resolve(null),
  ])

  const dayHasContent = dayHasPlannedContent(
    activities,
    flags.reservations ? reservations : [],
    flags.breakfast_config ? breakfastConfigs : []
  )

  const { recommended: staffRecommended, breakdown: staffForecastBreakdown } = recommendStaffCount({
    activitiesCovers: activities.reduce((s, a) => s + (a.expected_covers ?? 0), 0),
    reservationsCovers: flags.reservations
      ? reservations.reduce((s, r) => s + (r.guest_count ?? 0), 0)
      : 0,
    breakfastCovers: flags.breakfast_config
      ? breakfastConfigs.reduce((s, b) => s + (b.total_guests ?? 0), 0)
      : 0,
  })
  const dailyBrief = dailyBriefOn ? existingBrief : null
  const briefStale =
    dailyBriefOn && dailyBrief
      ? isBriefStale(
          dailyBrief,
          activities,
          flags.reservations ? reservations : [],
          flags.breakfast_config ? breakfastConfigs : [],
          dayNotes
        )
      : false
  const briefIsEmpty = dailyBriefOn ? !dayHasContent : false

  return (
    <Suspense
      fallback={<div className="text-muted-foreground mx-auto max-w-3xl px-3 py-8 text-sm" />}
    >
      <DayViewClient
        date={date}
        dayId={day.id}
        today={today}
        activities={activities}
        reservations={reservations}
        breakfastConfigs={breakfastConfigs}
        dayNotes={dayNotes}
        weather={weather}
        dailyBrief={dailyBrief}
        briefStale={briefStale}
        briefIsEmpty={briefIsEmpty}
        dayHasContent={dayHasContent}
        pocs={pocsResult.success ? pocsResult.data : []}
        venueTypes={venueTypesResult.success ? venueTypesResult.data : []}
        authState={authState}
        shifts={shifts}
        shiftAssignees={shiftAssignees}
        staffRecommended={staffRecommended}
        staffForecastBreakdown={staffForecastBreakdown}
      />
    </Suspense>
  )
}
