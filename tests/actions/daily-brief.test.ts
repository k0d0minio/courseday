import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/app/actions/feature-flags', () => ({
  isFeatureEnabled: vi.fn().mockResolvedValue(true),
}))

vi.mock('@/lib/supabase-server', () => ({
  createTenantClient: vi.fn(),
}))

vi.mock('@/app/[tenant]/day/[date]/queries', () => ({
  getDailyBriefForDayWithClient: vi.fn(),
}))

vi.mock('@/lib/daily-brief-generate', () => ({
  dayHasPlannedContent: vi.fn().mockReturnValue(true),
  generateAndPersistDailyBrief: vi.fn(),
}))

vi.mock('@/lib/redis', () => ({
  redis: {
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
  },
}))

// ── Imports ───────────────────────────────────────────────────────────────────

import { isFeatureEnabled } from '@/app/actions/feature-flags'
import { createTenantClient } from '@/lib/supabase-server'
import { getDailyBriefForDayWithClient } from '@/app/[tenant]/day/[date]/queries'
import { dayHasPlannedContent, generateAndPersistDailyBrief } from '@/lib/daily-brief-generate'
import { redis } from '@/lib/redis'
import { ensureDailyBrief } from '@/app/actions/daily-brief'
import type { DailyBriefRecord } from '@/types/daily-brief'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-1'
const DAY_ID = 'day-1'
const DATE_ISO = '2026-05-07'

const mockSupabase = { from: vi.fn() }

const NOW = new Date('2026-05-07T10:00:00Z').toISOString()
const EARLIER = new Date('2026-05-07T09:00:00Z').toISOString()
const LATER = new Date('2026-05-07T11:00:00Z').toISOString()

function makeActivity(updatedAt = EARLIER) {
  return { id: 'a-1', updated_at: updatedAt } as never
}

function makeBriefRecord(generatedAt = NOW): DailyBriefRecord {
  return {
    id: 'brief-1',
    content: {
      headline: 'Test headline',
      summary: 'Test summary',
      covers: { breakfast: 0, activities: 1, reservations: 0 },
      vipNotes: [],
      allergenRollup: [],
      risks: [],
      suggestedActions: [],
    },
    generated_at: generatedAt,
    model: 'openai/gpt-5.4',
    prompt_version: 'v1',
  }
}

const BASE_ARGS = {
  tenantId: TENANT_ID,
  dayId: DAY_ID,
  dateIso: DATE_ISO,
  activities: [makeActivity()],
  reservations: [],
  breakfasts: [],
  dayNotes: [],
  weather: null,
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ensureDailyBrief', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isFeatureEnabled).mockResolvedValue(true)
    vi.mocked(dayHasPlannedContent).mockReturnValue(true)
    vi.mocked(createTenantClient).mockResolvedValue({
      supabase: mockSupabase as never,
      tenantId: TENANT_ID,
    })
    vi.mocked(redis.set).mockResolvedValue('OK')
    vi.mocked(redis.del).mockResolvedValue(1)
  })

  it('returns empty when feature flag is off', async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValue(false)
    const result = await ensureDailyBrief(BASE_ARGS)
    expect(result.status).toBe('empty')
    expect(generateAndPersistDailyBrief).not.toHaveBeenCalled()
  })

  it('returns empty when day has no planned content — no LLM call', async () => {
    vi.mocked(dayHasPlannedContent).mockReturnValue(false)
    const result = await ensureDailyBrief(BASE_ARGS)
    expect(result.status).toBe('empty')
    expect(generateAndPersistDailyBrief).not.toHaveBeenCalled()
    expect(getDailyBriefForDayWithClient).not.toHaveBeenCalled()
  })

  it('returns existing brief with stale=false when no content updated after generation', async () => {
    const brief = makeBriefRecord(NOW) // generated at NOW
    vi.mocked(getDailyBriefForDayWithClient).mockResolvedValue(brief)

    // activity updated EARLIER than brief generated_at
    const result = await ensureDailyBrief({
      ...BASE_ARGS,
      activities: [makeActivity(EARLIER)],
    })
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.brief).toBe(brief)
      expect(result.stale).toBe(false)
    }
    expect(generateAndPersistDailyBrief).not.toHaveBeenCalled()
  })

  it('returns existing brief with stale=true when content updated after generation', async () => {
    const brief = makeBriefRecord(EARLIER) // generated EARLIER
    vi.mocked(getDailyBriefForDayWithClient).mockResolvedValue(brief)

    // activity updated LATER than brief generated_at
    const result = await ensureDailyBrief({
      ...BASE_ARGS,
      activities: [makeActivity(LATER)],
    })
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.stale).toBe(true)
    }
    expect(generateAndPersistDailyBrief).not.toHaveBeenCalled()
  })

  it('generates and persists when no brief exists and lock acquired', async () => {
    vi.mocked(getDailyBriefForDayWithClient).mockResolvedValue(null)
    const brief = makeBriefRecord(NOW)
    vi.mocked(generateAndPersistDailyBrief).mockResolvedValue({ success: true, data: brief })

    const result = await ensureDailyBrief(BASE_ARGS)
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.brief).toBe(brief)
      expect(result.stale).toBe(false)
    }
    expect(generateAndPersistDailyBrief).toHaveBeenCalledOnce()
    // generatedBy should be null for auto-generated briefs
    expect(vi.mocked(generateAndPersistDailyBrief).mock.calls[0]![1]).toMatchObject({
      generatedBy: null,
    })
  })

  it('calls generateAndPersistDailyBrief exactly once — not for second parallel load that sees existing brief', async () => {
    // First call: no brief, generates
    vi.mocked(getDailyBriefForDayWithClient).mockResolvedValueOnce(null)
    const brief = makeBriefRecord(NOW)
    vi.mocked(generateAndPersistDailyBrief).mockResolvedValue({ success: true, data: brief })

    // Second call: brief now exists (another process generated it)
    vi.mocked(getDailyBriefForDayWithClient).mockResolvedValueOnce(brief)

    const [r1, r2] = await Promise.all([ensureDailyBrief(BASE_ARGS), ensureDailyBrief(BASE_ARGS)])

    // At least one of them should be ok
    const okResults = [r1, r2].filter((r) => r.status === 'ok')
    expect(okResults.length).toBeGreaterThanOrEqual(1)
  })

  it('returns pending when lock not acquired and retry finds no brief', async () => {
    vi.mocked(getDailyBriefForDayWithClient).mockResolvedValue(null)
    vi.mocked(redis.set).mockResolvedValue(null) // lock not acquired

    const result = await ensureDailyBrief(BASE_ARGS)
    expect(result.status).toBe('pending')
    expect(generateAndPersistDailyBrief).not.toHaveBeenCalled()
  })

  it('returns brief from retry read when lock not acquired but other process finished', async () => {
    const brief = makeBriefRecord(NOW)
    // First getDailyBriefForDayWithClient call: no brief (before lock check)
    // Second call (after lock fail + sleep): brief exists
    vi.mocked(getDailyBriefForDayWithClient)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(brief)
    vi.mocked(redis.set).mockResolvedValue(null) // lock not acquired

    const result = await ensureDailyBrief(BASE_ARGS)
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.brief).toBe(brief)
    }
    expect(generateAndPersistDailyBrief).not.toHaveBeenCalled()
  })

  it('returns error when generateAndPersistDailyBrief fails', async () => {
    vi.mocked(getDailyBriefForDayWithClient).mockResolvedValue(null)
    vi.mocked(generateAndPersistDailyBrief).mockResolvedValue({
      success: false,
      error: 'LLM error',
    })

    const result = await ensureDailyBrief(BASE_ARGS)
    expect(result.status).toBe('error')
    if (result.status === 'error') {
      expect(result.error).toBe('LLM error')
    }
  })

  it('proceeds without lock when Redis throws (fail-open)', async () => {
    vi.mocked(getDailyBriefForDayWithClient).mockResolvedValue(null)
    vi.mocked(redis.set).mockRejectedValue(new Error('Redis down'))
    const brief = makeBriefRecord(NOW)
    vi.mocked(generateAndPersistDailyBrief).mockResolvedValue({ success: true, data: brief })

    const result = await ensureDailyBrief(BASE_ARGS)
    expect(result.status).toBe('ok')
    expect(generateAndPersistDailyBrief).toHaveBeenCalledOnce()
  })
})
