import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  getTenantToday,
  formatYmd,
  parseYmd,
  getMonthDateRange,
  isPastDate,
  isDateWithinOneYear,
  getWeekdayName,
  generateRecurrenceDates,
} from '@/lib/day-utils';

const TZ_BRUSSELS = 'Europe/Brussels';
const TZ_NYC = 'America/New_York';

afterEach(() => vi.useRealTimers());

// ---------------------------------------------------------------------------
// getTenantToday
// ---------------------------------------------------------------------------
describe('getTenantToday', () => {
  it('returns today in the given timezone', () => {
    vi.useFakeTimers();
    // 2024-03-15T23:30:00Z — still March 15 in Brussels (UTC+1), March 15 in NYC (UTC-4)
    vi.setSystemTime(new Date('2024-03-15T23:30:00Z'));
    expect(getTenantToday(TZ_BRUSSELS)).toBe('2024-03-16'); // Brussels is UTC+1 → already Mar 16
    expect(getTenantToday(TZ_NYC)).toBe('2024-03-15');       // NYC is UTC-4 → still Mar 15
  });

  it('handles DST spring-forward in Brussels (last Sunday of March)', () => {
    vi.useFakeTimers();
    // 2024-03-31T00:30:00Z — Brussels has just sprung forward to UTC+2, so local time is 02:30
    vi.setSystemTime(new Date('2024-03-31T00:30:00Z'));
    expect(getTenantToday(TZ_BRUSSELS)).toBe('2024-03-31');
  });

  it('handles DST fall-back in Brussels (last Sunday of October)', () => {
    vi.useFakeTimers();
    // 2024-10-27T00:30:00Z — Brussels clocks go back, still Oct 27 local
    vi.setSystemTime(new Date('2024-10-27T00:30:00Z'));
    expect(getTenantToday(TZ_BRUSSELS)).toBe('2024-10-27');
  });
});

// ---------------------------------------------------------------------------
// formatYmd / parseYmd
// ---------------------------------------------------------------------------
describe('formatYmd', () => {
  it('formats a date to YYYY-MM-DD', () => {
    expect(formatYmd(new Date(2024, 0, 5))).toBe('2024-01-05');
    expect(formatYmd(new Date(2024, 11, 31))).toBe('2024-12-31');
  });

  it('handles leap year Feb 29', () => {
    expect(formatYmd(new Date(2024, 1, 29))).toBe('2024-02-29');
  });
});

describe('parseYmd', () => {
  it('parses YYYY-MM-DD and round-trips with formatYmd', () => {
    expect(formatYmd(parseYmd('2024-06-15'))).toBe('2024-06-15');
    expect(formatYmd(parseYmd('2024-02-29'))).toBe('2024-02-29');
    expect(formatYmd(parseYmd('2024-12-31'))).toBe('2024-12-31');
  });
});

// ---------------------------------------------------------------------------
// getMonthDateRange
// ---------------------------------------------------------------------------
describe('getMonthDateRange', () => {
  it('returns correct range for a standard month', () => {
    const { start, end } = getMonthDateRange(2024, 6); // June
    expect(start).toBe('2024-06-01');
    expect(end).toBe('2024-06-30');
  });

  it('returns correct range for January', () => {
    const { start, end } = getMonthDateRange(2024, 1);
    expect(start).toBe('2024-01-01');
    expect(end).toBe('2024-01-31');
  });

  it('returns correct range for December', () => {
    const { start, end } = getMonthDateRange(2024, 12);
    expect(start).toBe('2024-12-01');
    expect(end).toBe('2024-12-31');
  });

  it('handles February in a leap year', () => {
    const { start, end } = getMonthDateRange(2024, 2);
    expect(start).toBe('2024-02-01');
    expect(end).toBe('2024-02-29');
  });

  it('handles February in a non-leap year', () => {
    const { start, end } = getMonthDateRange(2023, 2);
    expect(start).toBe('2023-02-01');
    expect(end).toBe('2023-02-28');
  });

  it('handles year boundary — month 1 and 12', () => {
    expect(getMonthDateRange(2025, 1).start).toBe('2025-01-01');
    expect(getMonthDateRange(2025, 12).end).toBe('2025-12-31');
  });
});

// ---------------------------------------------------------------------------
// isPastDate
// ---------------------------------------------------------------------------
describe('isPastDate', () => {
  it('returns true for yesterday', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
    expect(isPastDate('2024-06-14', TZ_BRUSSELS)).toBe(true);
  });

  it('returns false for today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
    expect(isPastDate('2024-06-15', TZ_BRUSSELS)).toBe(false);
  });

  it('returns false for tomorrow', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
    expect(isPastDate('2024-06-16', TZ_BRUSSELS)).toBe(false);
  });

  it('is timezone-aware: 23:30 UTC is next day in Brussels (UTC+1)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T23:30:00Z'));
    // Local Brussels time is June 16 — so June 15 is now past
    expect(isPastDate('2024-06-15', TZ_BRUSSELS)).toBe(true);
    // But in NYC (UTC-4) it's still June 15 — not past
    expect(isPastDate('2024-06-15', TZ_NYC)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isDateWithinOneYear
// ---------------------------------------------------------------------------
describe('isDateWithinOneYear', () => {
  it('returns true for today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
    expect(isDateWithinOneYear('2024-06-15', TZ_BRUSSELS)).toBe(true);
  });

  it('returns true for one year from today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
    expect(isDateWithinOneYear('2025-06-15', TZ_BRUSSELS)).toBe(true);
  });

  it('returns false for yesterday', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
    expect(isDateWithinOneYear('2024-06-14', TZ_BRUSSELS)).toBe(false);
  });

  it('returns false for more than one year ahead', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
    expect(isDateWithinOneYear('2025-06-16', TZ_BRUSSELS)).toBe(false);
  });

  it('handles leap year boundary correctly', () => {
    vi.useFakeTimers();
    // Today is Feb 29 2024 (leap day)
    vi.setSystemTime(new Date('2024-02-29T12:00:00Z'));
    // One year later: date-fns addYears goes to Feb 28 2025 (non-leap)
    expect(isDateWithinOneYear('2025-02-28', TZ_BRUSSELS)).toBe(true);
    expect(isDateWithinOneYear('2025-03-01', TZ_BRUSSELS)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getWeekdayName
// ---------------------------------------------------------------------------
describe('getWeekdayName', () => {
  it('returns the correct weekday name', () => {
    expect(getWeekdayName('2024-06-17')).toBe('Monday');
    expect(getWeekdayName('2024-06-21')).toBe('Friday');
    expect(getWeekdayName('2024-06-23')).toBe('Sunday');
  });

  it('works for a leap day', () => {
    expect(getWeekdayName('2024-02-29')).toBe('Thursday');
  });

  it('works for year boundary', () => {
    expect(getWeekdayName('2024-12-31')).toBe('Tuesday');
    expect(getWeekdayName('2025-01-01')).toBe('Wednesday');
  });
});

// ---------------------------------------------------------------------------
// generateRecurrenceDates
// ---------------------------------------------------------------------------
describe('generateRecurrenceDates', () => {
  it('generates weekly dates', () => {
    const dates = generateRecurrenceDates('2024-01-01', 'weekly', '2024-01-22');
    expect(dates).toEqual(['2024-01-08', '2024-01-15', '2024-01-22']);
  });

  it('generates biweekly dates', () => {
    const dates = generateRecurrenceDates('2024-01-01', 'biweekly', '2024-02-01');
    expect(dates).toEqual(['2024-01-15', '2024-01-29']);
  });

  it('generates monthly dates', () => {
    const dates = generateRecurrenceDates('2024-01-31', 'monthly', '2024-05-01');
    // Jan 31 → Feb 29 (clamped, leap year), then addMonths from Feb 29 → Mar 29, Apr 29
    expect(dates).toEqual(['2024-02-29', '2024-03-29', '2024-04-29']);
  });

  it('generates yearly dates', () => {
    const dates = generateRecurrenceDates('2022-03-15', 'yearly', '2025-01-01');
    expect(dates).toEqual(['2023-03-15', '2024-03-15']);
  });

  it('defaults maxDate to one year from startDate', () => {
    const dates = generateRecurrenceDates('2024-01-01', 'yearly');
    expect(dates).toEqual(['2025-01-01']);
  });

  it('returns empty array when maxDate is before first occurrence', () => {
    const dates = generateRecurrenceDates('2024-01-01', 'weekly', '2024-01-07');
    expect(dates).toEqual([]);
  });

  it('handles DST month boundary for monthly recurrence', () => {
    // March 31 → April 30 crosses the DST transition in Europe
    const dates = generateRecurrenceDates('2024-03-31', 'monthly', '2024-05-01');
    expect(dates).toEqual(['2024-04-30']);
  });

  it('handles leap year for yearly recurrence from Feb 29', () => {
    // Feb 29 2024 → Feb 28 2025 (non-leap year)
    const dates = generateRecurrenceDates('2024-02-29', 'yearly', '2026-01-01');
    expect(dates).toEqual(['2025-02-28']);
  });
});
