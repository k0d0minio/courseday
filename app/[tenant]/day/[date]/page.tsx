import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getTenantFromHeaders } from '@/lib/tenant';
import { getAuthState } from '@/app/actions/auth';
import { ensureDayExists } from '@/app/actions/days';
import { isPastDate, isDateWithinOneYear, getTenantToday } from '@/lib/day-utils';
import {
  getProgramItemsForDay,
  getReservationsForDay,
  getHotelBookingsForDate,
  getBreakfastConfigsForDay,
} from './queries';
import { DayViewClient } from './DayViewClient';
import type { ProgramItem, Reservation, HotelBooking, BreakfastConfiguration } from '@/types/index';
import type { AuthState } from '@/types/actions';

export type DayViewProps = {
  date: string;
  today: string;
  programItems: ProgramItem[];
  reservations: Reservation[];
  hotelBookings: HotelBooking[];
  breakfastConfigs: BreakfastConfiguration[];
  authState: AuthState;
};

const YMD_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export default async function DayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
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

  // Load all day data + auth state in parallel
  const [programItems, reservations, hotelBookings, breakfastConfigs, authState] =
    await Promise.all([
      getProgramItemsForDay(tenant.id, day.id),
      getReservationsForDay(tenant.id, day.id),
      getHotelBookingsForDate(tenant.id, date),
      getBreakfastConfigsForDay(tenant.id, date),
      getAuthState(),
    ]);

  return (
    <DayViewClient
      date={date}
      today={today}
      programItems={programItems}
      reservations={reservations}
      hotelBookings={hotelBookings}
      breakfastConfigs={breakfastConfigs}
      authState={authState}
    />
  );
}
