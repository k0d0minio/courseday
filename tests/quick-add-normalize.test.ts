import { describe, it, expect } from 'vitest';
import {
  mapAllergenHints,
  mapSynonymToCode,
  normalizeToTimeInput,
} from '@/lib/quick-add-generate';

describe('normalizeToTimeInput', () => {
  it('strips seconds for HTML time', () => {
    expect(normalizeToTimeInput('20:00:00')).toBe('20:00');
    expect(normalizeToTimeInput('8:30')).toBe('08:30');
  });
  it('returns empty for bad input', () => {
    expect(normalizeToTimeInput('')).toBe('');
    expect(normalizeToTimeInput('nope')).toBe('');
  });
});

describe('mapSynonymToCode', () => {
  it('maps common phrases to EU-14', () => {
    expect(mapSynonymToCode('no nuts')).toBe('nuts');
    expect(mapSynonymToCode('shellfish')).toBe('crustaceans');
    expect(mapSynonymToCode('dairy')).toBe('dairy');
  });
  it('returns null for unknown', () => {
    expect(mapSynonymToCode('random stuff xyz')).toBeNull();
  });
});

describe('mapAllergenHints', () => {
  it('keeps valid codes and collects unmapped', () => {
    const r = mapAllergenHints(['peanuts', 'unknown spice blend']);
    expect(r.codes).toContain('peanuts');
    expect(r.unmapped).toContain('unknown spice blend');
  });
  it('maps mixed hints', () => {
    const r = mapAllergenHints(['no nuts', 'dairy free']);
    expect(r.codes).toEqual(expect.arrayContaining(['nuts', 'dairy']));
  });
});
