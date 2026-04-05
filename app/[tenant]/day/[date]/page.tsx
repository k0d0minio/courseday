import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getTenantFromHeaders } from '@/lib/tenant';
import { requireTenantMember } from '@/lib/guards';
import { getAuthState } from '@/app/actions/auth';
import { ensureDayExists } from '@/app/actions/days';
import { getAllPOCs } from '@/app/actions/poc';
import { getAllVenueTypes } from '@/app/actions/venue-type';
import { isPastDate, isDateWithinOneYear, getTenantToday } from '@/lib/day-utils';
import {
  getProgramItemsForDay,
  getReservationsForDay,
  getBreakfastConfigsForDay,
  getDayNotesForDay,
} from './queries';
import { DayViewClient } from './DayViewClient';
import type {
  Activity,
  Reservation,
  BreakfastConfiguration,
  PointOfContact,
  VenueType,
} from '@/types/index';
import type { AuthState } from '@/types/actions';
import type { DayNote } from '@/app/actions/day-notes';
import { getWeatherForDay } from '@/app/actions/weather';
import type { WeatherData } from '@/app/actions/weather';

export type DayViewProps = {
  date: string;
  dayId: string;
  today: string;
  activities: Activity[];
  reservations: Reservation[];
  breakfastConfigs: BreakfastConfiguration[];
  dayNotes: DayNote[];
  weather: WeatherData | null;
  pocs: PointOfContact[];
  venueTypes: VenueType[];
  authState: AuthState;
};

const YMD_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export default async function DayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;

  // Get tenant from headers first (fast — headers only), then run auth check
  // and tenant DB query in parallel since they are independent.
  const tenant = await getTenantFromHeaders();
  const supabase = await createSupabaseServerClient();

  const [, tenantData] = await Promise.all([
    requireTenantMember(),
    supabase
      .from('tenants')
      .select('timezone, latitude, longitude')
      .eq('id', tenant.id)
      .single(),
  ]);

  const tenantRow = tenantData.data as {
    timezone?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  const timezone = tenantRow?.timezone ?? 'UTC';

  const today = getTenantToday(timezone);

  // Validate date — redirect to today on any invalid input
  if (
    !YMD_REGEX.test(date) ||
    isPastDate(date, timezone) ||
    !isDateWithinOneYear(date, timezone)
  ) {
    redirect(`/day/${today}`);
  }

  // Ensure Day row exists (idempotent)
  const dayResult = await ensureDayExists(date);
  if (!dayResult.success) redirect(`/day/${today}`);
  const day = dayResult.data;

  // Pass coordinates from the already-fetched tenant row so getWeatherForDay
  // can skip its own DB query (saves one round-trip inside the parallel block).
  const weatherCoords =
    tenantRow?.latitude && tenantRow?.longitude
      ? {
          latitude: tenantRow.latitude,
          longitude: tenantRow.longitude,
          timezone,
        }
      : undefined;

  // Load all day data in parallel
  const [
    activities,
    reservations,
    breakfastConfigs,
    dayNotes,
    weather,
    pocsResult,
    venueTypesResult,
    authState,
  ] = await Promise.all([
    getProgramItemsForDay(tenant.id, day.id),
    getReservationsForDay(tenant.id, day.id),
    getBreakfastConfigsForDay(tenant.id, day.id),
    getDayNotesForDay(tenant.id, day.id),
    getWeatherForDay(date, weatherCoords),
    getAllPOCs(),
    getAllVenueTypes(),
    getAuthState(),
  ]);

  return (
    <DayViewClient
      date={date}
      dayId={day.id}
      today={today}
      activities={activities}
      reservations={reservations}
      breakfastConfigs={breakfastConfigs}
      dayNotes={dayNotes}
      weather={weather}
      pocs={pocsResult.success ? pocsResult.data : []}
      venueTypes={venueTypesResult.success ? venueTypesResult.data : []}
      authState={authState}
    />
  );
}
