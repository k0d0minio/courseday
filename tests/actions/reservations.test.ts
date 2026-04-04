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
      guestEmail: 'jane@example.com',
      guestPhone: '+32 123 456 789',
      guestCount: 4,
      startTime: '19:00',
      endTime: '21:00',
      notes: 'Window seat requested',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing dayId', () => {
    const result = reservationSchema.safeParse({ guestName: 'Test' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = reservationSchema.safeParse({
      dayId: VALID_DAY_ID,
      guestEmail: 'not-an-email',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Invalid email address');
  });

  it('accepts empty string for email (treated as absent)', () => {
    const result = reservationSchema.safeParse({
      dayId: VALID_DAY_ID,
      guestEmail: '',
    });
    expect(result.success).toBe(true);
  });

  it('rejects guestCount less than 1', () => {
    const result = reservationSchema.safeParse({
      dayId: VALID_DAY_ID,
      guestCount: 0,
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional hotel and program item links', () => {
    const result = reservationSchema.safeParse({
      dayId: VALID_DAY_ID,
      hotelBookingId: '123e4567-e89b-12d3-a456-426614174001',
      programItemId: '123e4567-e89b-12d3-a456-426614174002',
      tableIndex: 2,
    });
    expect(result.success).toBe(true);
  });

  it('accepts null for optional link fields', () => {
    const result = reservationSchema.safeParse({
      dayId: VALID_DAY_ID,
      hotelBookingId: null,
      programItemId: null,
      tableIndex: null,
    });
    expect(result.success).toBe(true);
  });
});
