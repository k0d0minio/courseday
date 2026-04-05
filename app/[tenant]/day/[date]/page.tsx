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

export type DayViewProps = {
  date: string;
  dayId: string;
  today: string;
  activities: Activity[];
  reservations: Reservation[];
  breakfastConfigs: BreakfastConfiguration[];
  dayNotes: DayNote[];
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
  await requireTenantMember();
  const tenant = await getTenantFromHeaders();

  // Fetch tenant timezone
  const supabase = await createSupabaseServerClient();
  const { data: tenantRow } = await supabase
    .from('tenants')
    .select('timezone')
    .eq('id', tenant.id)
    .single();
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

  // Load all day data in parallel
  const [
    activities,
    reservations,
    breakfastConfigs,
    dayNotes,
    pocsResult,
    venueTypesResult,
    authState,
  ] = await Promise.all([
    getProgramItemsForDay(tenant.id, day.id),
    getReservationsForDay(tenant.id, day.id),
    getBreakfastConfigsForDay(tenant.id, day.id),
    getDayNotesForDay(tenant.id, day.id),
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
      pocs={pocsResult.success ? pocsResult.data : []}
      venueTypes={venueTypesResult.success ? venueTypesResult.data : []}
      authState={authState}
    />
  );
}
