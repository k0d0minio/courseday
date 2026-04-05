'use client';

import { useTranslations } from 'next-intl';
import { DayNav } from '@/components/day-nav';
import { TableBreakdownDisplay } from '@/components/table-breakdown-display';
import type { ActivityWithRelations, Reservation, BreakfastConfiguration } from '@/types/index';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = {
  date: string;
  today: string;
  activities: ActivityWithRelations[];
  reservations: Reservation[];
  breakfastConfigs: BreakfastConfiguration[];
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
}: Props) {
  const td = useTranslations('Tenant.day');
  const ts = useTranslations('Tenant.summary');

  const totalBreakfastCovers = breakfastConfigs.reduce((s, b) => s + b.total_guests, 0);
  const totalActivityCovers = activities.reduce((s, a) => s + (a.expected_covers ?? 0), 0);
  const totalReservationCovers = reservations.reduce((s, r) => s + (r.guest_count ?? 0), 0);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <DayNav date={date} today={today} />

      {/* Summary — large numbers for at-a-glance reading */}
      <div className="grid grid-cols-3 gap-3">
        <StatBlock label={ts('breakfast')} value={totalBreakfastCovers} />
        <StatBlock label={ts('activities')} value={totalActivityCovers} />
        <StatBlock label={ts('reservations')} value={totalReservationCovers} />
      </div>

      {/* Breakfast */}
      <ViewerSection
        title={td('breakfast')}
        empty={breakfastConfigs.length === 0}
        emptyLabel={td('noBreakfasts')}
      >
        {breakfastConfigs.map((item) => (
          <BreakfastRow key={item.id} item={item} />
        ))}
      </ViewerSection>

      {/* Activities */}
      <ViewerSection
        title={td('activities')}
        empty={activities.length === 0}
        emptyLabel={td('noEntries')}
      >
        {activities.map((item) => (
          <ActivityRow key={item.id} item={item} />
        ))}
      </ViewerSection>

      {/* Reservations */}
      <ViewerSection
        title={td('reservations')}
        empty={reservations.length === 0}
        emptyLabel={td('noReservations')}
      >
        {reservations.map((item) => (
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

function BreakfastRow({ item }: { item: BreakfastConfiguration }) {
  const breakdown = Array.isArray(item.table_breakdown)
    ? (item.table_breakdown as number[])
    : [];

  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold">{item.group_name ?? 'Unnamed group'}</p>
        <div className="flex items-center gap-3 shrink-0 text-sm">
          {item.start_time && (
            <span className="text-muted-foreground">{item.start_time.slice(0, 5)}</span>
          )}
          {item.total_guests > 0 && (
            <span className="font-medium">
              {item.total_guests} {item.total_guests === 1 ? 'guest' : 'guests'}
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

function ActivityRow({ item }: { item: ActivityWithRelations }) {
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
          <span>{formatTimeRange(item.start_time, item.end_time)}</span>
        )}
        {item.expected_covers != null && (
          <span>{item.expected_covers} covers</span>
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
  const breakdown = Array.isArray(item.table_breakdown)
    ? (item.table_breakdown as number[])
    : [];

  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold">{item.guest_name ?? 'Guest'}</p>
        <div className="flex items-center gap-3 shrink-0 text-sm">
          {(item.start_time || item.end_time) && (
            <span className="text-muted-foreground">
              {formatTimeRange(item.start_time, item.end_time)}
            </span>
          )}
          {item.guest_count != null && (
            <span className="font-medium">
              {item.guest_count} {item.guest_count === 1 ? 'guest' : 'guests'}
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

function formatTimeRange(start: string | null, end: string | null): string {
  const fmt = (t: string) => t.slice(0, 5);
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return `From ${fmt(start)}`;
  if (end) return `Until ${fmt(end)}`;
  return '';
}
