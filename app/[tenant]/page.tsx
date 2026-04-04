import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getTenantFromHeaders } from '@/lib/tenant';
import { requireTenantMember } from '@/lib/guards';
import { ensureDaysRange } from '@/app/actions/days';
import { getTenantToday, getMonthDateRange } from '@/lib/day-utils';
import {
  getProgramItemsForMonth,
  getReservationsForMonth,
  getHotelBookingsForMonth,
  getBreakfastConfigsForMonth,
} from './month-queries';
import { HomeClient } from '@/components/HomeClient';
import type { DaySummary } from '@/components/HomeClient';
import type { Day } from '@/types/index';

const MONTH_REGEX = /^\d{4}-\d{2}$/;

export default async function TenantHomePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const tenant = await getTenantFromHeaders();
  const { role } = await requireTenantMember();

  // Fetch tenant timezone
  const supabase = await createSupabaseServerClient();
  const { data: tenantRow } = await supabase
    .from('tenants')
    .select('timezone')
    .eq('id', tenant.id)
    .single();
  const timezone = tenantRow?.timezone ?? 'UTC';

  const today = getTenantToday(timezone);

  // Viewers see the day view; calendar is editor-only
  if (role !== 'editor') {
    redirect(`/day/${today}`);
  }

  // Parse ?month=YYYY-MM, default to current month
  const { month: rawMonth } = await searchParams;
  const month =
    rawMonth && MONTH_REGEX.test(rawMonth)
      ? rawMonth
      : today.slice(0, 7);

  const [year, monthNum] = month.split('-').map(Number);
  const { start, end } = getMonthDateRange(year, monthNum);

  // Ensure all Day rows for the month exist (idempotent batch upsert)
  const daysResult = await ensureDaysRange(start, end);
  const monthDays: Day[] = daysResult.success ? daysResult.data : [];
  const dayIds = monthDays.map((d) => d.id);
  const dayDateMap = new Map(monthDays.map((d) => [d.id, d.date_iso]));

  // Load all month data in parallel
  const [programItems, reservations, hotelBookings, breakfastConfigs] =
    await Promise.all([
      getProgramItemsForMonth(tenant.id, dayIds),
      getReservationsForMonth(tenant.id, dayIds),
      getHotelBookingsForMonth(tenant.id, start, end),
      getBreakfastConfigsForMonth(tenant.id, start, end),
    ]);

  // Build per-day summary map
  const summaryMap = new Map<string, DaySummary>();

  for (const day of monthDays) {
    summaryMap.set(day.date_iso, {
      date: day.date_iso,
      dayId: day.id,
      golfCount: 0,
      eventCount: 0,
      reservationCount: 0,
      hotelGuestCount: 0,
      breakfastCount: 0,
    });
  }

  for (const item of programItems) {
    const date = dayDateMap.get(item.day_id);
    if (!date) continue;
    const s = summaryMap.get(date);
    if (!s) continue;
    if (item.type === 'golf') s.golfCount++;
    else s.eventCount++;
  }

  for (const res of reservations) {
    const date = dayDateMap.get(res.day_id);
    if (!date) continue;
    const s = summaryMap.get(date);
    if (s) s.reservationCount++;
  }

  for (const booking of hotelBookings) {
    for (const [date, s] of summaryMap) {
      if (booking.check_in <= date && date < booking.check_out) {
        s.hotelGuestCount += booking.guest_count;
      }
    }
  }

  for (const config of breakfastConfigs) {
    const s = summaryMap.get(config.breakfast_date);
    if (s) s.breakfastCount += config.total_guests;
  }

  const days = [...summaryMap.values()].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <HomeClient
      month={month}
      today={today}
      days={days}
    />
  );
}
