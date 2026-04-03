import { isValidSlug } from '@/lib/tenant-validation';

describe('isValidSlug', () => {
  describe('valid slugs', () => {
    it('accepts a simple lowercase slug', () => {
      expect(isValidSlug('pierpont')).toBe(true);
    });

    it('accepts a slug with hyphens', () => {
      expect(isValidSlug('my-golf-club')).toBe(true);
    });

    it('accepts a slug with numbers', () => {
      expect(isValidSlug('club123')).toBe(true);
    });

    it('accepts exactly 3 characters', () => {
      expect(isValidSlug('abc')).toBe(true);
    });

    it('accepts exactly 63 characters', () => {
      expect(isValidSlug('a'.repeat(63))).toBe(true);
    });
  });

  describe('invalid slugs', () => {
    it('rejects slugs shorter than 3 characters', () => {
      expect(isValidSlug('ab')).toBe(false);
    });

    it('rejects slugs longer than 63 characters', () => {
      expect(isValidSlug('a'.repeat(64))).toBe(false);
    });

    it('rejects uppercase letters', () => {
      expect(isValidSlug('MyClub')).toBe(false);
    });

    it('rejects slugs starting with a hyphen', () => {
      expect(isValidSlug('-myclub')).toBe(false);
    });

    it('rejects slugs ending with a hyphen', () => {
      expect(isValidSlug('myclub-')).toBe(false);
    });

    it('rejects slugs with spaces', () => {
      expect(isValidSlug('my club')).toBe(false);
    });

    it('rejects slugs with special characters', () => {
      expect(isValidSlug('my_club')).toBe(false);
      expect(isValidSlug('my.club')).toBe(false);
    });

    it('rejects an empty string', () => {
      expect(isValidSlug('')).toBe(false);
    });
  });
});
