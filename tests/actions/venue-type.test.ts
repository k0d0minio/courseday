import { describe, it, expect } from 'vitest';
import { venueTypeSchema } from '@/app/actions/venue-type';

describe('venueTypeSchema', () => {
  it('accepts a valid name and code', () => {
    const result = venueTypeSchema.safeParse({ name: 'Main Restaurant', code: 'REST' });
    expect(result.success).toBe(true);
  });

  it('accepts name only (code optional)', () => {
    const result = venueTypeSchema.safeParse({ name: 'Terrace' });
    expect(result.success).toBe(true);
  });

  it('accepts empty string for code (treated as absent)', () => {
    const result = venueTypeSchema.safeParse({ name: 'Clubhouse', code: '' });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = venueTypeSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Name is required');
  });

  it('rejects missing name', () => {
    const result = venueTypeSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('accepts name with special characters', () => {
    const result = venueTypeSchema.safeParse({ name: "19th Hole Bar & Grill" });
    expect(result.success).toBe(true);
  });

  it('accepts a code with spaces', () => {
    const result = venueTypeSchema.safeParse({ name: 'Pro Shop', code: 'PRO SHOP' });
    expect(result.success).toBe(true);
  });
});
