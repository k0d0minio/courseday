import { describe, it, expect } from 'vitest'
import { KNOWN_FLAGS, FLAG_LABELS, FLAG_DESCRIPTIONS, type FlagKey } from '@/lib/feature-flags'

describe('KNOWN_FLAGS metadata', () => {
  it('has a label entry for every known flag', () => {
    for (const key of KNOWN_FLAGS) {
      expect(FLAG_LABELS[key]).toBeTruthy()
      expect(typeof FLAG_LABELS[key]).toBe('string')
    }
  })

  it('has a description entry for every known flag', () => {
    for (const key of KNOWN_FLAGS) {
      expect(FLAG_DESCRIPTIONS[key]).toBeTruthy()
      expect(typeof FLAG_DESCRIPTIONS[key]).toBe('string')
    }
  })

  it('has no extra label keys beyond KNOWN_FLAGS', () => {
    expect(Object.keys(FLAG_LABELS).sort()).toEqual([...KNOWN_FLAGS].sort())
  })

  it('has no extra description keys beyond KNOWN_FLAGS', () => {
    expect(Object.keys(FLAG_DESCRIPTIONS).sort()).toEqual([...KNOWN_FLAGS].sort())
  })

  it('exposes the documented flag set', () => {
    const expected: FlagKey[] = [
      'reservations',
      'breakfast_config',
      'weather_reporting',
      'checklists',
      'staff_schedule',
      'daily_brief',
    ]
    expect([...KNOWN_FLAGS].sort()).toEqual(expected.sort())
  })
})
