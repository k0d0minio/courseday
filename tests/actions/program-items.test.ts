import { describe, it, expect } from 'vitest';
import { programItemSchema } from '@/lib/program-item-schema';
import { parseTableBreakdown } from '@/lib/day-utils';
import { generateRecurrenceDates } from '@/lib/day-utils';

// ---------------------------------------------------------------------------
// parseTableBreakdown
// ---------------------------------------------------------------------------
describe('parseTableBreakdown', () => {
  it('parses "3+2+1" to [3, 2, 1]', () => {
    expect(parseTableBreakdown('3+2+1')).toEqual([3, 2, 1]);
  });

  it('parses a single number', () => {
    expect(parseTableBreakdown('10')).toEqual([10]);
  });

  it('handles whitespace around values', () => {
    expect(parseTableBreakdown('4 + 3 + 2')).toEqual([4, 3, 2]);
  });

  it('returns null for empty string', () => {
    expect(parseTableBreakdown('')).toBeNull();
  });

  it('returns null for null', () => {
    expect(parseTableBreakdown(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(parseTableBreakdown(undefined)).toBeNull();
  });

  it('returns null for whitespace-only string', () => {
    expect(parseTableBreakdown('   ')).toBeNull();
  });

  it('returns null for "0+4" (zero is not a valid seat count)', () => {
    expect(parseTableBreakdown('0+4')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// programItemSchema validation
// ---------------------------------------------------------------------------
describe('programItemSchema', () => {
  const validGolf = {
    title: 'Morning Round',
    type: 'golf' as const,
    dayId: '123e4567-e89b-12d3-a456-426614174000',
  };

  it('accepts a minimal valid golf item', () => {
    expect(programItemSchema.safeParse(validGolf).success).toBe(true);
  });

  it('accepts a minimal valid event item', () => {
    const result = programItemSchema.safeParse({ ...validGolf, type: 'event' });
    expect(result.success).toBe(true);
  });

  it('rejects empty title', () => {
    const result = programItemSchema.safeParse({ ...validGolf, title: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Title is required');
  });

  it('rejects missing title', () => {
    const { title: _, ...noTitle } = validGolf;
    expect(programItemSchema.safeParse(noTitle).success).toBe(false);
  });

  it('rejects invalid type', () => {
    const result = programItemSchema.safeParse({ ...validGolf, type: 'lesson' });
    expect(result.success).toBe(false);
  });

  it('rejects missing dayId', () => {
    const { dayId: _, ...noDayId } = validGolf;
    expect(programItemSchema.safeParse(noDayId).success).toBe(false);
  });

  it('accepts optional fields', () => {
    const result = programItemSchema.safeParse({
      ...validGolf,
      description: 'Full round',
      startTime: '09:00',
      endTime: '13:00',
      guestCount: 12,
      capacity: 20,
      isTourOperator: true,
      notes: 'Bring rain gear',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a recurring item with frequency', () => {
    const result = programItemSchema.safeParse({
      ...validGolf,
      isRecurring: true,
      recurrenceFrequency: 'weekly',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid recurrenceFrequency', () => {
    const result = programItemSchema.safeParse({
      ...validGolf,
      isRecurring: true,
      recurrenceFrequency: 'daily',
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative guestCount', () => {
    const result = programItemSchema.safeParse({ ...validGolf, guestCount: -1 });
    expect(result.success).toBe(false);
  });

  it('accepts tableBreakdown as an array of integers', () => {
    const result = programItemSchema.safeParse({
      ...validGolf,
      tableBreakdown: [3, 2, 1],
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Recurrence fanout integration
// ---------------------------------------------------------------------------
describe('recurrence fanout (generateRecurrenceDates integration)', () => {
  it('weekly from 2024-06-01 for 4 weeks generates 4 future dates', () => {
    const futureDates = generateRecurrenceDates('2024-06-01', 'weekly', '2024-06-29');
    expect(futureDates).toEqual(['2024-06-08', '2024-06-15', '2024-06-22', '2024-06-29']);
    // Including the start date, 5 items are created
    expect([' 2024-06-01', ...futureDates]).toHaveLength(5);
  });

  it('monthly from 2024-01-31 for 3 months generates 3 future dates (clamped)', () => {
    const futureDates = generateRecurrenceDates('2024-01-31', 'monthly', '2024-05-01');
    expect(futureDates).toEqual(['2024-02-29', '2024-03-29', '2024-04-29']);
  });

  it('biweekly from 2024-06-01 for 6 weeks generates 3 future dates', () => {
    const futureDates = generateRecurrenceDates('2024-06-01', 'biweekly', '2024-07-13');
    expect(futureDates).toEqual(['2024-06-15', '2024-06-29', '2024-07-13']);
  });

  it('total occurrences = 1 (start) + future dates', () => {
    const start = '2024-09-01';
    const futureDates = generateRecurrenceDates(start, 'weekly', '2024-09-22');
    const allOccurrences = [start, ...futureDates];
    expect(allOccurrences).toHaveLength(4);
  });
});
