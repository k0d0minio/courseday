import { describe, it, expect } from 'vitest'
import { briefToHtml } from '@/lib/morning-brief-cron'
import type { DailyBriefRecord } from '@/types/daily-brief'

const sampleBrief: DailyBriefRecord = {
  id: 'brief-1',
  content: {
    headline: 'Smooth service expected',
    summary: 'Two activities and a busy lunch service.',
    covers: { breakfast: 12, activities: 24, reservations: 36 },
    vipNotes: [],
    allergenRollup: [],
    risks: [],
    suggestedActions: [],
  },
  generated_at: '2026-05-10T07:00:00.000Z',
  model: 'test-model',
  prompt_version: '1',
  headline_override: null,
  summary_override: null,
  overridden_by: null,
  overridden_at: null,
}

describe('briefToHtml whitelabelling', () => {
  it('renders the tenant name in the CTA and contains no "Courseday" string', () => {
    const tenantName = 'Pebble Beach Golf Links'
    const html = briefToHtml(
      sampleBrief,
      tenantName,
      'https://pebble.example.com/day/2026-05-10',
      '2026-05-10'
    )

    expect(html).toContain(tenantName)
    expect(html).toContain(`Open day in ${tenantName}`)
    expect(html).not.toContain('Courseday')
  })

  it('escapes tenant names containing HTML-sensitive characters', () => {
    const tenantName = 'Smith & Sons <Golf>'
    const html = briefToHtml(
      sampleBrief,
      tenantName,
      'https://example.com/day/2026-05-10',
      '2026-05-10'
    )

    expect(html).not.toContain('Courseday')
    expect(html).not.toContain('<Golf>')
    expect(html).toContain('Smith &amp; Sons &lt;Golf&gt;')
  })
})
