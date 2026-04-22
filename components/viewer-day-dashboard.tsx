'use client';

import { useTranslations } from 'next-intl';
import { DayNav } from '@/components/day-nav';
import { DayNotes } from '@/components/day-notes';
import { WeatherCard } from '@/components/weather-card';
import { TableBreakdownDisplay } from '@/components/table-breakdown-display';
import { useFeatureFlag } from '@/lib/feature-flags-context';
import type { ActivityWithRelations, Reservation, BreakfastConfiguration } from '@/types/index';
import type { DayNote } from '@/app/actions/day-notes';
import type { WeatherData } from '@/app/actions/weather';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = {
  date: string;
  today: string;
  activities: ActivityWithRelations[];
  reservations: Reservation[];
  breakfastConfigs: BreakfastConfiguration[];
  dayNotes: DayNote[];
  weather: WeatherData | null;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ViewerDayDashboard({
  date,
  today,
  activities,
  reservations,
  breakfastConfigs,
  dayNotes,
  weather,
}: Props) {
  const td = useTranslations('Tenant.day');
  const ts = useTranslations('Tenant.summary');
  const te = useTranslations('Tenant.entry');
  const tb = useTranslations('Tenant.breakfastCard');
  const showReservations = useFeatureFlag('reservations');
  const showBreakfast = useFeatureFlag('breakfast_config');
  const showWeatherReporting = useFeatureFlag('weather_reporting');

  const visibleBreakfastConfigs = showBreakfast ? breakfastConfigs : [];
  const visibleReservations = showReservations ? reservations : [];

  const totalBreakfastCovers = visibleBreakfastConfigs.reduce((s, b) => s + b.total_guests, 0);
  const totalActivityCovers = activities.reduce((s, a) => s + (a.expected_covers ?? 0), 0);
  const totalReservationCovers = visibleReservations.reduce((s, r) => s + (r.guest_count ?? 0), 0);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <DayNav date={date} today={today} />

      {showWeatherReporting && weather && <WeatherCard weather={weather} />}

      <DayNotes
        dayId={date}
        initialNotes={dayNotes}
        isEditor={false}
        currentUserId={undefined}
      />

      {/* Summary — large numbers for at-a-glance reading */}
      <div className="grid grid-cols-3 gap-3">
        <StatBlock label={ts('breakfast')} value={totalBreakfastCovers} />
        <StatBlock label={ts('activities')} value={totalActivityCovers} />
        <StatBlock label={ts('reservations')} value={totalReservationCovers} />
      </div>

      {/* Breakfast */}
      <ViewerSection
        title={td('breakfast')}
        empty={visibleBreakfastConfigs.length === 0}
        emptyLabel={td('noBreakfasts')}
      >
        {visibleBreakfastConfigs.map((item) => (
          <BreakfastRow key={item.id} item={item} t={tb} />
        ))}
      </ViewerSection>

      {/* Activities */}
      <ViewerSection
        title={td('activities')}
        empty={activities.length === 0}
        emptyLabel={td('noEntries')}
      >
        {activities.map((item) => (
          <ActivityRow key={item.id} item={item} t={te} />
        ))}
      </ViewerSection>

      {/* Reservations */}
      <ViewerSection
        title={td('reservations')}
        empty={visibleReservations.length === 0}
        emptyLabel={td('noReservations')}
      >
        {visibleReservations.map((item) => (
          <ReservationRow key={item.id} item={item} />
        ))}
      </ViewerSection>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-4 text-center">
      <p className="text-4xl font-bold tabular-nums leading-none">{value}</p>
      <p className="text-xs text-muted-foreground mt-2 leading-tight">{label}</p>
    </div>
  );
}

function ViewerSection({
  title,
  empty,
  emptyLabel,
  children,
}: {
  title: string;
  empty: boolean;
  emptyLabel: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      {empty ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </section>
  );
}

function BreakfastRow({
  item,
  t,
}: {
  item: BreakfastConfiguration;
  t: ReturnType<typeof useTranslations<'Tenant.breakfastCard'>>;
}) {
  const breakdown = Array.isArray(item.table_breakdown)
    ? (item.table_breakdown as number[])
    : [];

  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold">{item.group_name ?? t('unnamedGroup')}</p>
        <div className="flex items-center gap-3 shrink-0 text-sm">
          {item.start_time && (
            <span className="text-muted-foreground">{item.start_time.slice(0, 5)}</span>
          )}
          {item.total_guests > 0 && (
            <span className="font-medium">
              {t('guests', { count: item.total_guests })}
            </span>
          )}
        </div>
      </div>
      {breakdown.length > 0 && <TableBreakdownDisplay breakdown={breakdown} />}
      {item.notes && (
        <p className="text-sm text-muted-foreground italic">{item.notes}</p>
      )}
    </div>
  );
}

function ActivityRow({
  item,
  t,
}: {
  item: ActivityWithRelations;
  t: ReturnType<typeof useTranslations<'Tenant.entry'>>;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-1.5">
      {item.tags && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-block text-xs bg-muted px-1.5 py-0.5 rounded"
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}
      <p className="font-semibold">{item.title}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
        {(item.start_time || item.end_time) && (
          <span>{formatTimeRange(item.start_time, item.end_time, t)}</span>
        )}
        {item.expected_covers != null && (
          <span>{t('covers', { count: item.expected_covers })}</span>
        )}
        {item.venue_type && <span>{item.venue_type.name}</span>}
        {item.point_of_contact && <span>{item.point_of_contact.name}</span>}
      </div>
      {item.notes && (
        <p className="text-sm text-muted-foreground italic">{item.notes}</p>
      )}
    </div>
  );
}

function ReservationRow({ item }: { item: Reservation }) {
  const tr = useTranslations('Tenant.reservation');
  const breakdown = Array.isArray(item.table_breakdown)
    ? (item.table_breakdown as number[])
    : [];

  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold">{item.guest_name ?? tr('fallbackName')}</p>
        <div className="flex items-center gap-3 shrink-0 text-sm">
          {(item.start_time || item.end_time) && (
            <span className="text-muted-foreground">
              {formatTimeRange(item.start_time, item.end_time, null)}
            </span>
          )}
          {item.guest_count != null && (
            <span className="font-medium">
              {tr('guests', { count: item.guest_count })}
            </span>
          )}
        </div>
      </div>
      {breakdown.length > 0 && <TableBreakdownDisplay breakdown={breakdown} />}
      {item.notes && (
        <p className="text-sm text-muted-foreground italic">{item.notes}</p>
      )}
    </div>
  );
}

function formatTimeRange(
  start: string | null,
  end: string | null,
  t: ReturnType<typeof useTranslations<'Tenant.entry'>> | null
): string {
  const fmt = (s: string) => s.slice(0, 5);
  if (start && end) {
    return t ? t('timeRange', { start: fmt(start), end: fmt(end) }) : `${fmt(start)} \u2013 ${fmt(end)}`;
  }
  if (start) return t ? t('timeFrom', { time: fmt(start) }) : fmt(start);
  if (end) return t ? t('timeUntil', { time: fmt(end) }) : fmt(end);
  return '';
}
