import { describe, it, expect } from 'vitest';
import { reservationSchema } from '@/lib/reservation-schema';

const VALID_DAY_ID = '123e4567-e89b-12d3-a456-426614174000';

describe('reservationSchema', () => {
  it('accepts a minimal reservation with only dayId', () => {
    const result = reservationSchema.safeParse({ dayId: VALID_DAY_ID });
    expect(result.success).toBe(true);
  });

  it('accepts a full reservation', () => {
    const result = reservationSchema.safeParse({
      dayId: VALID_DAY_ID,
      guestName: 'Jane Smith',
      guestCount: 4,
      startTime: '19:00',
      endTime: '21:00',
      notes: 'Window seat requested',
      tableBreakdown: [2, 2],
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing dayId', () => {
    const result = reservationSchema.safeParse({ guestName: 'Test' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid dayId (not a UUID)', () => {
    const result = reservationSchema.safeParse({ dayId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects guestCount less than 1', () => {
    const result = reservationSchema.safeParse({
      dayId: VALID_DAY_ID,
      guestCount: 0,
    });
    expect(result.success).toBe(false);
  });

  it('accepts tableBreakdown as an array of positive integers', () => {
    const result = reservationSchema.safeParse({
      dayId: VALID_DAY_ID,
      tableBreakdown: [4, 2, 1],
    });
    expect(result.success).toBe(true);
  });

  it('rejects tableBreakdown with a zero entry', () => {
    const result = reservationSchema.safeParse({
      dayId: VALID_DAY_ID,
      tableBreakdown: [4, 0],
    });
    expect(result.success).toBe(false);
  });

  it('accepts omitted optional fields', () => {
    const result = reservationSchema.safeParse({ dayId: VALID_DAY_ID });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.guestName).toBeUndefined();
      expect(result.data.guestCount).toBeUndefined();
      expect(result.data.tableBreakdown).toBeUndefined();
    }
  });
});
