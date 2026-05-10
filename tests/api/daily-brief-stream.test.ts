import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/app/actions/feature-flags', () => ({
  isFeatureEnabled: vi.fn().mockResolvedValue(true),
}))

vi.mock('@/lib/tenant', () => ({
  getTenantFromHeaders: vi.fn().mockResolvedValue({ id: 'tenant-1', slug: 'test' }),
}))

vi.mock('@/app/actions/auth', () => ({
  getUser: vi.fn().mockResolvedValue({ id: 'user-1', email: 'editor@test.com' }),
}))

vi.mock('@/lib/membership', () => ({
  getUserRole: vi.fn().mockResolvedValue('editor'),
}))

vi.mock('@/lib/rate-limit', () => ({
  dailyBriefRateLimit: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock('@/app/actions/days', () => ({
  ensureDayExists: vi.fn().mockResolvedValue({ success: true, data: { id: 'day-1' } }),
}))

vi.mock('@/app/[tenant]/day/[date]/queries', () => ({
  getProgramItemsForDay: vi
    .fn()
    .mockResolvedValue([
      { id: 'a-1', expected_covers: 10, allergens: ['gluten'], updated_at: '2026-05-09T08:00:00Z' },
    ]),
  getReservationsForDay: vi
    .fn()
    .mockResolvedValue([
      { id: 'r-1', guest_count: 4, allergens: [], updated_at: '2026-05-09T08:00:00Z' },
    ]),
  getBreakfastConfigsForDay: vi.fn().mockResolvedValue([]),
  getDayNotesForDay: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/app/actions/weather', () => ({
  getWeatherForDay: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/lib/supabase-server', () => ({
  createTenantClient: vi.fn().mockResolvedValue({
    supabase: {
      from: vi.fn().mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }),
    },
    tenantId: 'tenant-1',
  }),
}))

vi.mock('ai', () => ({
  streamObject: vi.fn().mockReturnValue({
    toTextStreamResponse: vi
      .fn()
      .mockReturnValue(
        new Response('streamed', { status: 200, headers: { 'Content-Type': 'text/plain' } })
      ),
    object: Promise.resolve({
      headline: 'A Busy Day Ahead',
      summary: 'Ten guests expected for activities, four for lunch reservations.',
      covers: { breakfast: 0, activities: 10, reservations: 4 },
      vipNotes: ['Large party at noon'],
      allergenRollup: [{ code: 'gluten', inActivities: 1, inReservations: 0, inBreakfast: 0 }],
      risks: [],
      suggestedActions: [],
    }),
  }),
}))

vi.mock('@ai-sdk/gateway', () => ({
  gateway: vi.fn().mockReturnValue('mocked-model'),
}))

vi.mock('next/server', () => ({
  after: vi.fn((fn: () => Promise<void>) => {
    // Execute the callback synchronously in tests so we can assert on it
    return fn()
  }),
}))

// ── Imports ───────────────────────────────────────────────────────────────────

import { isFeatureEnabled } from '@/app/actions/feature-flags'
import { getTenantFromHeaders } from '@/lib/tenant'
import { getUser } from '@/app/actions/auth'
import { getUserRole } from '@/lib/membership'
import { dailyBriefRateLimit } from '@/lib/rate-limit'
import { streamObject } from 'ai'
import { POST } from '@/app/api/daily-brief/stream/route'

// ── Tests ─────────────────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown> = { dateIso: '2026-05-09' }) {
  return new Request('http://localhost/api/daily-brief/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/daily-brief/stream', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isFeatureEnabled).mockResolvedValue(true)
    vi.mocked(getTenantFromHeaders).mockResolvedValue({ id: 'tenant-1', slug: 'test' })
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1', email: 'editor@test.com' } as never)
    vi.mocked(getUserRole).mockResolvedValue('editor')
    vi.mocked(dailyBriefRateLimit).mockResolvedValue({ success: true })
  })

  it('happy-path: returns 200 streaming response and calls streamObject', async () => {
    const response = await POST(makeRequest())
    expect(response.status).toBe(200)
    expect(streamObject).toHaveBeenCalledOnce()
    expect(streamObject).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: expect.anything(),
        prompt: expect.stringContaining('daily briefing'),
      })
    )
  })

  it('returns 403 when feature flag is disabled', async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValue(false)
    const response = await POST(makeRequest())
    expect(response.status).toBe(403)
    expect(streamObject).not.toHaveBeenCalled()
  })

  it('returns 401 when user is not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const response = await POST(makeRequest())
    expect(response.status).toBe(401)
    expect(streamObject).not.toHaveBeenCalled()
  })

  it('returns 403 when user is not an editor', async () => {
    vi.mocked(getUserRole).mockResolvedValue('staff')
    const response = await POST(makeRequest())
    expect(response.status).toBe(403)
    expect(streamObject).not.toHaveBeenCalled()
  })

  it('returns 429 when rate limit is exceeded', async () => {
    vi.mocked(dailyBriefRateLimit).mockResolvedValue({ success: false })
    const response = await POST(makeRequest())
    expect(response.status).toBe(429)
    expect(streamObject).not.toHaveBeenCalled()
  })

  it('returns 400 when dateIso is missing', async () => {
    const response = await POST(makeRequest({}))
    expect(response.status).toBe(400)
    expect(streamObject).not.toHaveBeenCalled()
  })

  it('returns 400 when tenant context is missing', async () => {
    vi.mocked(getTenantFromHeaders).mockRejectedValue(new Error('no tenant'))
    const response = await POST(makeRequest())
    expect(response.status).toBe(400)
    expect(streamObject).not.toHaveBeenCalled()
  })
})
