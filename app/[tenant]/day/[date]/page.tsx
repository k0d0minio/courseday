import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
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
import { getWeatherForDay } from '@/app/actions/weather'
import type { WeatherData } from '@/app/actions/weather'
import { getFeatureFlags } from '@/app/actions/feature-flags'
import { ensureDailyBrief } from '@/app/actions/daily-brief'

export type DayViewProps = {
  date: string
  dayId: string
  today: string
  activities: Activity[]
  reservations: Reservation[]
  breakfastConfigs: BreakfastConfiguration[]
  dayNotes: DayNote[]
  weather: WeatherData | null
  dailyBrief: import('@/types/daily-brief').DailyBriefRecord | null
  briefStale: boolean
  briefIsEmpty: boolean
  pocs: PointOfContact[]
  venueTypes: VenueType[]
  authState: AuthState
  shifts: ShiftWithAssignee[]
  shiftAssignees: ShiftAssignee[]
}

const YMD_REGEX = /^\d{4}-\d{2}-\d{2}$/

export default async function DayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params

  // Get tenant from headers first (fast — headers only), then run auth check
  // and tenant DB query in parallel since they are independent.
  const tenant = await getTenantFromHeaders()
  const supabase = await createSupabaseServerClient()

  const [, tenantData] = await Promise.all([
    requireTenantMember(),
    supabase.from('tenants').select('timezone, latitude, longitude').eq('id', tenant.id).single(),
  ])

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

  const flags = await getFeatureFlags(tenant.id)
  const staffScheduleOn = flags.staff_schedule
  const dailyBriefOn = flags.daily_brief
  const authState = await getAuthState()

  // Load all day data in parallel — skip disabled features
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
  ])

  // Auto-generate brief after data is loaded so we can pass it without duplicate fetches
  const briefResult = dailyBriefOn
    ? await ensureDailyBrief({
        tenantId: tenant.id,
        dayId: day.id,
        dateIso: date,
        activities,
        reservations: flags.reservations ? reservations : [],
        breakfasts: flags.breakfast_config ? breakfastConfigs : [],
        dayNotes,
        weather,
      })
    : null
  const dailyBrief = briefResult?.status === 'ok' ? briefResult.brief : null
  const briefStale = briefResult?.status === 'ok' ? briefResult.stale : false
  const briefIsEmpty = briefResult?.status === 'empty'

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
        pocs={pocsResult.success ? pocsResult.data : []}
        venueTypes={venueTypesResult.success ? venueTypesResult.data : []}
        authState={authState}
        shifts={shifts}
        shiftAssignees={shiftAssignees}
      />
    </Suspense>
  )
}
