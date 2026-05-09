import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mergeBriefSection } from '@/lib/daily-brief-generate'
import type { DailyBriefContent } from '@/types/daily-brief'

// Freeze time so sectionTimestamps is deterministic in tests
const FIXED_NOW = '2026-05-09T10:00:00.000Z'
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(FIXED_NOW))
})

const BASE: DailyBriefContent = {
  headline: 'Busy Saturday',
  summary: 'A full day ahead.',
  covers: { breakfast: 10, activities: 20, reservations: 15 },
  vipNotes: ['Large party in terrace'],
  allergenRollup: [],
  risks: ['Rain expected'],
  suggestedActions: ['Pre-set terrace tables'],
}

describe('mergeBriefSection', () => {
  it('replaces vipNotes and stamps timestamp', () => {
    const result = mergeBriefSection(BASE, 'vipNotes', ['Updated VIP note'])
    expect(result.vipNotes).toEqual(['Updated VIP note'])
    expect(result.sectionTimestamps?.vipNotes).toBe(FIXED_NOW)
    // other sections untouched
    expect(result.risks).toEqual(BASE.risks)
    expect(result.suggestedActions).toEqual(BASE.suggestedActions)
    expect(result.headline).toBe(BASE.headline)
    expect(result.covers).toEqual(BASE.covers)
  })

  it('replaces risks and stamps timestamp', () => {
    const result = mergeBriefSection(BASE, 'risks', ['Flooding on 18th hole'])
    expect(result.risks).toEqual(['Flooding on 18th hole'])
    expect(result.sectionTimestamps?.risks).toBe(FIXED_NOW)
    expect(result.vipNotes).toEqual(BASE.vipNotes)
  })

  it('replaces suggestedActions and stamps timestamp', () => {
    const result = mergeBriefSection(BASE, 'suggestedActions', ['Brief all staff at 07:00'])
    expect(result.suggestedActions).toEqual(['Brief all staff at 07:00'])
    expect(result.sectionTimestamps?.suggestedActions).toBe(FIXED_NOW)
    expect(result.risks).toEqual(BASE.risks)
  })

  it('preserves existing sectionTimestamps for untouched sections', () => {
    const withTimestamps: DailyBriefContent = {
      ...BASE,
      sectionTimestamps: { vipNotes: '2026-05-09T08:00:00.000Z' },
    }
    const result = mergeBriefSection(withTimestamps, 'risks', ['New risk'])
    expect(result.sectionTimestamps?.vipNotes).toBe('2026-05-09T08:00:00.000Z')
    expect(result.sectionTimestamps?.risks).toBe(FIXED_NOW)
  })

  it('does not mutate the original content', () => {
    const original = { ...BASE, vipNotes: ['Original'] }
    mergeBriefSection(original, 'vipNotes', ['New'])
    expect(original.vipNotes).toEqual(['Original'])
  })

  it('accepts an empty array for a section', () => {
    const result = mergeBriefSection(BASE, 'risks', [])
    expect(result.risks).toEqual([])
    expect(result.sectionTimestamps?.risks).toBe(FIXED_NOW)
  })
})
