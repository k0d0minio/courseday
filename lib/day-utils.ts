import {
  format,
  parse,
  parseISO,
  startOfMonth,
  endOfMonth,
  addWeeks,
  addMonths,
  addYears,
  isAfter,
  isBefore,
  addDays,
} from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

/**
 * Branded YYYY-MM-DD string. Use formatYmd() to create one.
 */
export type Ymd = string & { readonly __ymd: unique symbol };

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

/** Returns the current date in the given timezone as a YYYY-MM-DD string. */
export function getTenantToday(timezone: string): Ymd {
  return format(toZonedTime(new Date(), timezone), 'yyyy-MM-dd') as Ymd;
}

/** Formats a UTC Date to YYYY-MM-DD in the local (JS) calendar day. */
export function formatYmd(date: Date): Ymd {
  return format(date, 'yyyy-MM-dd') as Ymd;
}

/** Parses a YYYY-MM-DD string to a Date at midnight UTC. */
export function parseYmd(ymd: string): Date {
  return parse(ymd, 'yyyy-MM-dd', new Date(0));
}

// ---------------------------------------------------------------------------
// Month range
// ---------------------------------------------------------------------------

/** Returns the first and last day of the given month as YYYY-MM-DD strings. */
export function getMonthDateRange(
  year: number,
  month: number // 1-indexed
): { start: Ymd; end: Ymd } {
  const ref = new Date(year, month - 1, 1);
  return {
    start: formatYmd(startOfMonth(ref)),
    end: formatYmd(endOfMonth(ref)),
  };
}

// ---------------------------------------------------------------------------
// Guardrails
// ---------------------------------------------------------------------------

/** Returns true if the given YYYY-MM-DD is strictly before today in the tenant's timezone. */
export function isPastDate(ymd: string, timezone: string): boolean {
  const today = getTenantToday(timezone);
  return ymd < today;
}

/** Returns true if the given YYYY-MM-DD is within one year from today in the tenant's timezone. */
export function isDateWithinOneYear(ymd: string, timezone: string): boolean {
  const today = getTenantToday(timezone);
  const oneYearLater = formatYmd(addYears(parseYmd(today), 1));
  return ymd >= today && ymd <= oneYearLater;
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

/** Returns the full weekday name for a YYYY-MM-DD string (e.g. "Monday"). */
export function getWeekdayName(ymd: string, locale = 'en-GB'): string {
  return parseYmd(ymd).toLocaleDateString(locale, { weekday: 'long' });
}

// ---------------------------------------------------------------------------
// Recurrence
// ---------------------------------------------------------------------------

type Frequency = 'weekly' | 'biweekly' | 'monthly' | 'yearly';

/**
 * Generates all occurrence dates for a recurrence rule starting from startDate,
 * up to maxDate (exclusive). Defaults to one year from startDate.
 * Returns YYYY-MM-DD strings, not including startDate itself.
 */
export function generateRecurrenceDates(
  startDate: string,
  frequency: Frequency,
  maxDate?: string
): Ymd[] {
  const start = parseYmd(startDate);
  const limit = maxDate ? parseYmd(maxDate) : addYears(start, 1);
  const results: Ymd[] = [];

  let current = nextOccurrence(start, frequency);

  while (!isAfter(current, limit)) {
    results.push(formatYmd(current));
    current = nextOccurrence(current, frequency);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Range helpers
// ---------------------------------------------------------------------------

/**
 * Returns an array of every YYYY-MM-DD date in [startDate, endDate] (inclusive).
 */
export function datesInRange(startDate: string, endDate: string): Ymd[] {
  const dates: Ymd[] = [];
  let current = parseISO(startDate);
  const end = parseISO(endDate);

  while (current <= end) {
    dates.push(format(current, 'yyyy-MM-dd') as Ymd);
    current = addDays(current, 1);
  }

  return dates;
}

// ---------------------------------------------------------------------------
// Program item helpers (pure, usable on both client and server)
// ---------------------------------------------------------------------------

/**
 * Parses a "3+2+1" string into a positive-integer array [3, 2, 1].
 * Returns null for empty / null / undefined input.
 * Each segment must be a positive integer (>0).
 */
export function parseTableBreakdown(input: string | null | undefined): number[] | null {
  if (!input || input.trim() === '') return null;
  const parts = input
    .split('+')
    .map((s) => parseInt(s.trim(), 10));
  if (parts.some((n) => isNaN(n) || n <= 0)) return null;
  return parts;
}

function nextOccurrence(date: Date, frequency: Frequency): Date {
  switch (frequency) {
    case 'weekly':
      return addWeeks(date, 1);
    case 'biweekly':
      return addWeeks(date, 2);
    case 'monthly':
      return addMonths(date, 1);
    case 'yearly':
      return addYears(date, 1);
  }
}
