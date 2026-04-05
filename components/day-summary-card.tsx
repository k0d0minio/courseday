'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import type { Activity, Reservation, BreakfastConfiguration } from '@/types/index';

type Props = {
  activities: Activity[];
  reservations: Reservation[];
  breakfastConfigs: BreakfastConfiguration[];
};

export function DaySummaryCard({ activities, reservations, breakfastConfigs }: Props) {
  const t = useTranslations('Tenant.summary');

  const totalActivityCovers = activities.reduce((sum, a) => sum + (a.expected_covers ?? 0), 0);
  const totalBreakfastGuests = breakfastConfigs.reduce((sum, b) => sum + b.total_guests, 0);
  const totalReservationCovers = reservations.reduce((sum, r) => sum + (r.guest_count ?? 0), 0);

  return (
    <Card>
      <CardContent className="py-4">
        <div className="grid grid-cols-3 gap-4">
          <SummaryItem label={t('breakfast')} value={totalBreakfastGuests} />
          <SummaryItem label={t('activities')} value={totalActivityCovers} />
          <SummaryItem label={t('reservations')} value={totalReservationCovers} />
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
