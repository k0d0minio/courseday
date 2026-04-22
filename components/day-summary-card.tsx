'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { useFeatureFlag } from '@/lib/feature-flags-context';
import type { Activity, Reservation, BreakfastConfiguration } from '@/types/index';

type Props = {
  activities: Activity[];
  reservations: Reservation[];
  breakfastConfigs: BreakfastConfiguration[];
};

export function DaySummaryCard({ activities, reservations, breakfastConfigs }: Props) {
  const t = useTranslations('Tenant.summary');
  const showReservations = useFeatureFlag('reservations');
  const showBreakfast = useFeatureFlag('breakfast_config');

  const totalActivityCovers = activities.reduce((sum, a) => sum + (a.expected_covers ?? 0), 0);
  const totalBreakfastGuests = showBreakfast
    ? breakfastConfigs.reduce((sum, b) => sum + b.total_guests, 0)
    : 0;
  const totalReservationCovers = showReservations
    ? reservations.reduce((sum, r) => sum + (r.guest_count ?? 0), 0)
    : 0;

  const items: { label: string; value: number }[] = [];
  if (showBreakfast) items.push({ label: t('breakfast'), value: totalBreakfastGuests });
  items.push({ label: t('activities'), value: totalActivityCovers });
  if (showReservations) items.push({ label: t('reservations'), value: totalReservationCovers });

  return (
    <Card>
      <CardContent className="py-4">
        <div className={`grid gap-4 ${items.length === 3 ? 'grid-cols-3' : items.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {items.map((item) => (
            <SummaryItem key={item.label} label={item.label} value={item.value} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
