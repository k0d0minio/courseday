import { addDays, format, parseISO } from 'date-fns';

export function maxDayYmd(today: string): string {
  return format(addDays(parseISO(today), 365), 'yyyy-MM-dd');
}

/** Previous or next day within [today, today+365], or null if out of range. */
export function adjacentDayYmd(date: string, today: string, delta: -1 | 1): string | null {
  const next = format(addDays(parseISO(date), delta), 'yyyy-MM-dd');
  const upper = maxDayYmd(today);
  if (next < today || next > upper) return null;
  return next;
}
