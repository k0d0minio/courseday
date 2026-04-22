import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getTenantFromHeaders } from '@/lib/tenant';
import { requireTenantMember } from '@/lib/guards';
import { ensureDaysRange } from '@/app/actions/days';
import { getTenantToday, getMonthDateRange } from '@/lib/day-utils';
import {
  getProgramItemsForMonth,
  getReservationsForMonth,
  getBreakfastConfigsForMonth,
} from './month-queries';
import { HomeClient } from '@/components/HomeClient';
import { OnboardingBanner } from '@/components/onboarding-banner';
import type { DaySummary } from '@/components/HomeClient';
import type { Day } from '@/types/index';

const MONTH_REGEX = /^\d{4}-\d{2}$/;

export default async function TenantHomePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  // Get tenant from headers first (fast — headers only), then run auth check
  // and tenant DB query in parallel since they are independent.
  const tenant = await getTenantFromHeaders();
  const supabase = await createSupabaseServerClient();

  const [{ role }, tenantData] = await Promise.all([
    requireTenantMember(),
    supabase
      .from('tenants')
      .select('timezone, onboarding_completed')
      .eq('id', tenant.id)
      .single(),
  ]);

  const tenantRow = tenantData.data as {
    timezone?: string | null;
    onboarding_completed?: boolean | null;
  } | null;
  const timezone = tenantRow?.timezone ?? 'UTC';
  const onboardingCompleted = tenantRow?.onboarding_completed ?? true;

  const today = getTenantToday(timezone);

  // Viewers: agenda-only home (no calendar). Editors: full calendar + agenda.
  if (role !== 'editor') {
    return (
      <>
        {!onboardingCompleted && <OnboardingBanner />}
        <HomeClient variant="viewer" month={today.slice(0, 7)} today={today} days={[]} />
      </>
    );
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
  const [activities, reservations, breakfastConfigs] =
    await Promise.all([
      getProgramItemsForMonth(tenant.id, dayIds),
      getReservationsForMonth(tenant.id, dayIds),
      getBreakfastConfigsForMonth(tenant.id, start, end),
    ]);

  // Build per-day summary map
  const summaryMap = new Map<string, DaySummary>();

  for (const day of monthDays) {
    summaryMap.set(day.date_iso, {
      date: day.date_iso,
      dayId: day.id,
      golfCount: 0,
      reservationCount: 0,
      breakfastCount: 0,
    });
  }

  for (const item of activities) {
    const date = dayDateMap.get(item.day_id);
    if (!date) continue;
    const s = summaryMap.get(date);
    if (s) s.golfCount++;
  }

  for (const res of reservations) {
    const date = dayDateMap.get(res.day_id);
    if (!date) continue;
    const s = summaryMap.get(date);
    if (s) s.reservationCount++;
  }

  for (const config of breakfastConfigs) {
    const s = summaryMap.get(config.breakfast_date);
    if (s) s.breakfastCount += config.total_guests;
  }

  const days = [...summaryMap.values()].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <>
      {!onboardingCompleted && <OnboardingBanner />}
      <HomeClient variant="editor" month={month} today={today} days={days} />
    </>
  );
}
