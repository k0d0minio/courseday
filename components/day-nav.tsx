'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addDays, parseISO, format } from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

type Props = {
  date: string;
  today: string;
};

export function DayNav({ date, today }: Props) {
  const router = useRouter();
  const [calOpen, setCalOpen] = useState(false);

  const currentDate = parseISO(date);
  const todayDate = parseISO(today);
  const maxDate = addDays(todayDate, 365);

  const prevYmd = format(addDays(currentDate, -1), 'yyyy-MM-dd');
  const nextYmd = format(addDays(currentDate, 1), 'yyyy-MM-dd');
  const maxYmd = format(maxDate, 'yyyy-MM-dd');

  function navigate(d: string) {
    router.push(`/day/${d}`);
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => navigate(prevYmd)}
        disabled={prevYmd < today}
        aria-label="Previous day"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Popover open={calOpen} onOpenChange={setCalOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="min-w-44 justify-start gap-2 font-normal">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            {format(currentDate, 'EEE, d MMM yyyy')}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={currentDate}
            onSelect={(d) => {
              if (d) {
                navigate(format(d, 'yyyy-MM-dd'));
                setCalOpen(false);
              }
            }}
            disabled={(d) => {
              const ymd = format(d, 'yyyy-MM-dd');
              return ymd < today || ymd > maxYmd;
            }}
          />
        </PopoverContent>
      </Popover>

      <Button
        variant="outline"
        size="icon"
        onClick={() => navigate(nextYmd)}
        disabled={nextYmd > maxYmd}
        aria-label="Next day"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {date !== today && (
        <Button variant="outline" size="sm" onClick={() => navigate(today)}>
          Today
        </Button>
      )}
    </div>
  );
}
