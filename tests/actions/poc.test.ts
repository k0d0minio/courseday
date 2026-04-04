import { describe, it, expect } from 'vitest';
import { pocSchema } from '@/lib/poc-schema';

describe('pocSchema', () => {
  it('accepts a valid full record', () => {
    const result = pocSchema.safeParse({
      name: 'Alice Dupont',
      email: 'alice@example.com',
      phone: '+32 470 00 00 00',
    });
    expect(result.success).toBe(true);
  });

  it('accepts name-only (email and phone optional)', () => {
    const result = pocSchema.safeParse({ name: 'Bob' });
    expect(result.success).toBe(true);
  });

  it('accepts empty string for email (treated as absent)', () => {
    const result = pocSchema.safeParse({ name: 'Bob', email: '' });
    expect(result.success).toBe(true);
  });

  it('accepts empty string for phone', () => {
    const result = pocSchema.safeParse({ name: 'Bob', phone: '' });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = pocSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Name is required');
  });

  it('rejects missing name', () => {
    const result = pocSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects invalid email format', () => {
    const result = pocSchema.safeParse({ name: 'Bob', email: 'not-an-email' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Invalid email address');
  });

  it('rejects email with missing TLD', () => {
    const result = pocSchema.safeParse({ name: 'Bob', email: 'bob@nodot' });
    expect(result.success).toBe(false);
  });

  it('accepts valid email with subdomain', () => {
    const result = pocSchema.safeParse({
      name: 'Bob',
      email: 'bob@mail.example.co.uk',
    });
    expect(result.success).toBe(true);
  });
});
