import { describe, it, expect } from 'vitest'
import { mergeBriefSection } from '@/lib/daily-brief-generate'
import type { DailyBriefContent } from '@/types/daily-brief'

const baseContent: DailyBriefContent = {
  headline: 'Smooth service expected',
  summary: 'Two activities and a busy lunch service.',
  covers: { breakfast: 12, activities: 24, reservations: 36 },
  vipNotes: ['old vip 1', 'old vip 2'],
  allergenRollup: [{ code: 'NUT', inActivities: 1, inReservations: 0, inBreakfast: 0 }],
  risks: ['old risk 1'],
  suggestedActions: ['old action 1'],
}

describe('mergeBriefSection', () => {
  it('replaces only the requested section and leaves others untouched', () => {
    const merged = mergeBriefSection(baseContent, 'vipNotes', ['new vip A', 'new vip B'], 'TS-1')

    expect(merged.vipNotes).toEqual(['new vip A', 'new vip B'])
    expect(merged.risks).toEqual(['old risk 1'])
    expect(merged.suggestedActions).toEqual(['old action 1'])
    expect(merged.headline).toBe(baseContent.headline)
    expect(merged.summary).toBe(baseContent.summary)
    expect(merged.covers).toEqual(baseContent.covers)
    expect(merged.allergenRollup).toEqual(baseContent.allergenRollup)
  })

  it('records a per-section timestamp for the regenerated section', () => {
    const merged = mergeBriefSection(baseContent, 'risks', ['new risk'], '2026-05-10T10:00:00.000Z')
    expect(merged.sectionTimestamps?.risks).toBe('2026-05-10T10:00:00.000Z')
    expect(merged.sectionTimestamps?.vipNotes).toBeUndefined()
    expect(merged.sectionTimestamps?.suggestedActions).toBeUndefined()
  })

  it('preserves prior section timestamps when updating a different section', () => {
    const withTs: DailyBriefContent = {
      ...baseContent,
      sectionTimestamps: { vipNotes: '2026-01-01T00:00:00.000Z' },
    }
    const merged = mergeBriefSection(withTs, 'risks', ['new risk'], '2026-05-10T10:00:00.000Z')
    expect(merged.sectionTimestamps?.vipNotes).toBe('2026-01-01T00:00:00.000Z')
    expect(merged.sectionTimestamps?.risks).toBe('2026-05-10T10:00:00.000Z')
  })

  it('replaces the section timestamp when the same section is regenerated again', () => {
    const withTs: DailyBriefContent = {
      ...baseContent,
      sectionTimestamps: { suggestedActions: '2026-01-01T00:00:00.000Z' },
    }
    const merged = mergeBriefSection(
      withTs,
      'suggestedActions',
      ['fresh action'],
      '2026-05-10T11:00:00.000Z'
    )
    expect(merged.suggestedActions).toEqual(['fresh action'])
    expect(merged.sectionTimestamps?.suggestedActions).toBe('2026-05-10T11:00:00.000Z')
  })

  it('does not mutate the input content', () => {
    const snapshot = JSON.parse(JSON.stringify(baseContent)) as DailyBriefContent
    mergeBriefSection(baseContent, 'vipNotes', ['x'], 'TS')
    expect(baseContent).toEqual(snapshot)
  })

  it('accepts an empty replacement array', () => {
    const merged = mergeBriefSection(baseContent, 'risks', [], 'TS')
    expect(merged.risks).toEqual([])
    expect(merged.vipNotes).toEqual(baseContent.vipNotes)
  })
})
