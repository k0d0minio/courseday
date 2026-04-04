'use client';

import { useState } from 'react';
import { format, getDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { CalendarDaySidebar } from '@/components/CalendarDaySidebar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DaySummary = {
  date: string; // YYYY-MM-DD
  dayId: string;
  golfCount: number;
  eventCount: number;
  reservationCount: number;
  hotelGuestCount: number;
  breakfastCount: number;
};

type Props = {
  month: string;  // YYYY-MM
  today: string;  // YYYY-MM-DD
  days: DaySummary[];
};

// Day-of-week header labels — Monday first
const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HomeClient({ month, today, days: initialDays }: Props) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [days, setDays] = useState<DaySummary[]>(initialDays);

  const dayMap = new Map(days.map((d) => [d.date, d]));

  function handleSummaryChanged(date: string, patch: Partial<DaySummary>) {
    setDays((prev) =>
      prev.map((d) => (d.date === date ? { ...d, ...patch } : d))
    );
  }

  // Compute grid layout
  const [year, monthNum] = month.split('-').map(Number);
  const firstOfMonth = new Date(year, monthNum - 1, 1);
  const daysInMonth = new Date(year, monthNum, 0).getDate();

  // Monday-start: Mon=0, Tue=1, ..., Sun=6
  const startPadding = (getDay(firstOfMonth) + 6) % 7;

  // Month navigation
  const todayMonth = today.slice(0, 7); // YYYY-MM
  const maxMonth = format(addMonths(new Date(`${todayMonth}-01`), 12), 'yyyy-MM');
  const prevMonthStr = format(subMonths(firstOfMonth, 1), 'yyyy-MM');
  const nextMonthStr = format(addMonths(firstOfMonth, 1), 'yyyy-MM');
  const isPrevDisabled = month <= todayMonth;
  const isNextDisabled = nextMonthStr > maxMonth;
  const isCurrentMonth = month === todayMonth;

  function navigate(target: string) {
    setSelectedDate(null);
    router.push(`?month=${target}`);
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Month heading + navigation */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">
          {format(firstOfMonth, 'MMMM yyyy')}
        </h1>
        <div className="flex items-center gap-1">
          {!isCurrentMonth && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(todayMonth)}
            >
              Today
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            disabled={isPrevDisabled}
            onClick={() => navigate(prevMonthStr)}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={isNextDisabled}
            onClick={() => navigate(nextMonthStr)}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className={cn('flex gap-6', selectedDate && 'lg:gap-8')}>
        {/* Calendar grid */}
        <div className="flex-1 min-w-0">
          {/* Day-of-week header */}
          <div className="grid grid-cols-7 mb-1">
            {DOW_LABELS.map((label) => (
              <div
                key={label}
                className="text-center text-xs font-medium text-muted-foreground py-1"
              >
                {label}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 border-l border-t">
            {/* Leading empty cells */}
            {Array.from({ length: startPadding }).map((_, i) => (
              <div
                key={`pad-${i}`}
                className="border-r border-b min-h-[80px] bg-muted/20"
              />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${month}-${String(dayNum).padStart(2, '0')}`;
              const summary = dayMap.get(dateStr);
              const isToday = dateStr === today;
              const isSelected = dateStr === selectedDate;

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className={cn(
                    'border-r border-b min-h-[80px] p-1.5 text-left transition-colors',
                    'hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                    isSelected && 'bg-accent',
                    !isSelected && 'bg-background'
                  )}
                >
                  {/* Date number */}
                  <span
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium mb-1',
                      isToday && 'bg-primary text-primary-foreground',
                      !isToday && 'text-foreground'
                    )}
                  >
                    {dayNum}
                  </span>

                  {/* Summary badges */}
                  {summary && (
                    <div className="flex flex-col gap-0.5">
                      {summary.golfCount > 0 && (
                        <SummaryPip label={`${summary.golfCount}G`} color="emerald" />
                      )}
                      {summary.eventCount > 0 && (
                        <SummaryPip label={`${summary.eventCount}E`} color="blue" />
                      )}
                      {summary.reservationCount > 0 && (
                        <SummaryPip label={`${summary.reservationCount}R`} color="amber" />
                      )}
                      {summary.hotelGuestCount > 0 && (
                        <SummaryPip label={`${summary.hotelGuestCount}H`} color="violet" />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Day sidebar */}
        {selectedDate && (
          <CalendarDaySidebar
            date={selectedDate}
            onClose={() => setSelectedDate(null)}
            onSummaryChanged={handleSummaryChanged}
          />
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <LegendItem color="emerald" label="Golf (G)" />
        <LegendItem color="blue" label="Event (E)" />
        <LegendItem color="amber" label="Reservation (R)" />
        <LegendItem color="violet" label="Hotel guests (H)" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

type PipColor = 'emerald' | 'blue' | 'amber' | 'violet';

const PIP_CLASSES: Record<PipColor, string> = {
  emerald: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  blue: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  amber: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  violet: 'bg-violet-500/15 text-violet-700 dark:text-violet-400',
};

function SummaryPip({ label, color }: { label: string; color: PipColor }) {
  return (
    <span
      className={cn(
        'inline-block rounded px-1 py-0.5 text-[10px] font-medium leading-none',
        PIP_CLASSES[color]
      )}
    >
      {label}
    </span>
  );
}

function LegendItem({ color, label }: { color: PipColor; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={cn('rounded px-1 py-0.5 text-[10px] font-medium', PIP_CLASSES[color])}>
        {label.charAt(0)}
      </span>
      {label}
    </span>
  );
}
