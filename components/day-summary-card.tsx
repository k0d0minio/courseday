import { Card, CardContent } from '@/components/ui/card';
import type { ProgramItem, Reservation, HotelBooking, BreakfastConfiguration } from '@/types/index';

type Props = {
  programItems: ProgramItem[];
  reservations: Reservation[];
  hotelBookings: HotelBooking[];
  breakfastConfigs: BreakfastConfiguration[];
};

export function DaySummaryCard({ programItems, reservations, hotelBookings, breakfastConfigs }: Props) {
  const totalHotelGuests = hotelBookings.reduce((sum, b) => sum + b.guest_count, 0);
  const totalBreakfastGuests = breakfastConfigs.reduce((sum, b) => sum + b.total_guests, 0);
  const totalProgramGuests = programItems.reduce((sum, p) => sum + (p.guest_count ?? 0), 0);

  const bookingMap = new Map(hotelBookings.map((b) => [b.id, b.guest_name]));

  return (
    <Card>
      <CardContent className="py-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <SummaryItem label="Hotel guests" value={totalHotelGuests} />
          <SummaryItem label="Breakfasts" value={totalBreakfastGuests} />
          <SummaryItem label="Golf / events" value={totalProgramGuests} />
          <SummaryItem label="Tee time bookings" value={reservations.length} />
        </div>

        {breakfastConfigs.length > 0 && (
          <div className="mt-4 border-t pt-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground mb-2">Breakfast breakdown</p>
            {breakfastConfigs.map((bc) => (
              <div key={bc.id} className="flex justify-between text-sm">
                <span>{bookingMap.get(bc.hotel_booking_id) ?? 'Unknown'}</span>
                <span className="tabular-nums text-muted-foreground">{bc.total_guests}</span>
              </div>
            ))}
          </div>
        )}
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
