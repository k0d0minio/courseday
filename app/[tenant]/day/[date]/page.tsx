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
  getDailyBriefForDay,
  getShiftsForDay,
  getStaffMembersForTenant,
  getStaffRolesForTenant,
} from './queries';
import { Suspense } from 'react';
import { DayViewClient } from './DayViewClient';
import type {
  Activity,
  Reservation,
  BreakfastConfiguration,
  PointOfContact,
  VenueType,
  ShiftWithStaffMember,
  StaffMember,
  StaffRole,
} from '@/types/index';
import type { AuthState } from '@/types/actions';
import type { DayNote } from '@/app/actions/day-notes';
import { getWeatherForDay } from '@/app/actions/weather';
import type { WeatherData } from '@/app/actions/weather';
import { getFeatureFlags } from '@/app/actions/feature-flags';
import {
  ensureDayViewReceipt,
  getSoftDeletedSince,
  type HandoverRemovedItem,
} from '@/app/actions/day-view-receipts';
import type { DailyBriefRecord } from '@/types/daily-brief';

export type DayViewProps = {
  date: string;
  dayId: string;
  today: string;
  activities: Activity[];
  reservations: Reservation[];
  breakfastConfigs: BreakfastConfiguration[];
  dayNotes: DayNote[];
  weather: WeatherData | null;
  dailyBrief: DailyBriefRecord | null;
  pocs: PointOfContact[];
  venueTypes: VenueType[];
  authState: AuthState;
  shifts: ShiftWithStaffMember[];
  staffMembers: StaffMember[];
  staffRoles: StaffRole[];
  handoverLastViewedAt: string | null;
  handoverRemoved: HandoverRemovedItem[];
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

  const flags = await getFeatureFlags(tenant.id);
  const staffScheduleOn = flags.staff_schedule;
  const authState = await getAuthState();

  // Load all day data in parallel
  const [
    activities,
    reservations,
    breakfastConfigs,
    dayNotes,
    weather,
    dailyBrief,
    pocsResult,
    venueTypesResult,
    shifts,
    staffMembers,
    staffRoles,
  ] = await Promise.all([
    getProgramItemsForDay(tenant.id, day.id),
    getReservationsForDay(tenant.id, day.id),
    getBreakfastConfigsForDay(tenant.id, day.id),
    getDayNotesForDay(tenant.id, day.id),
    getWeatherForDay(date, weatherCoords),
    getDailyBriefForDay(tenant.id, day.id),
    getAllPOCs(),
    getAllVenueTypes(),
    staffScheduleOn ? getShiftsForDay(tenant.id, day.id) : Promise.resolve([]),
    staffScheduleOn ? getStaffMembersForTenant(tenant.id) : Promise.resolve([]),
    staffScheduleOn ? getStaffRolesForTenant(tenant.id) : Promise.resolve([]),
  ]);

  let handoverLastViewedAt: string | null = null;
  let handoverRemoved: HandoverRemovedItem[] = [];
  const uid = authState.user?.id;
  if (uid) {
    const receipt = await ensureDayViewReceipt(tenant.id, day.id, uid);
    if (receipt.success) {
      handoverLastViewedAt = receipt.data.last_viewed_at;
      const removed = await getSoftDeletedSince(
        tenant.id,
        day.id,
        receipt.data.last_viewed_at
      );
      if (removed.success) handoverRemoved = removed.data;
    }
  }

  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto px-3 py-8 text-sm text-muted-foreground" />}>
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
        pocs={pocsResult.success ? pocsResult.data : []}
        venueTypes={venueTypesResult.success ? venueTypesResult.data : []}
        authState={authState}
        shifts={shifts}
        staffMembers={staffMembers}
        staffRoles={staffRoles}
        handoverLastViewedAt={handoverLastViewedAt}
        handoverRemoved={handoverRemoved}
      />
    </Suspense>
  );
}
