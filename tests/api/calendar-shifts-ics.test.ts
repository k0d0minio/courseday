import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockFrom = vi.fn()
vi.mock('@/lib/supabase-server', () => ({
  createSupabaseServiceClient: vi.fn(() => ({ from: mockFrom })),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeChain(data: unknown, error: unknown = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    single: vi.fn().mockResolvedValue({ data, error }),
  }
  return chain
}

function importRoute() {
  return import('@/app/api/calendar/[token]/shifts.ics/route')
}

function makeRequest(token: string) {
  return new Request(`http://localhost:3000/api/calendar/${token}/shifts.ics`)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/calendar/[token]/shifts.ics', () => {
  beforeEach(() => {
    vi.resetModules()
    mockFrom.mockReset()
  })

  it('returns 404 for unknown token', async () => {
    mockFrom.mockReturnValue(makeChain(null))

    const { GET } = await importRoute()
    const res = await GET(makeRequest('bad-token'), {
      params: Promise.resolve({ token: 'bad-token' }),
    })

    expect(res.status).toBe(404)
  })

  it('returns 404 when staff_schedule flag is disabled', async () => {
    const membership = { id: 'mem-1', user_id: 'user-1', tenant_id: 'tenant-1' }
    const flagDisabled = { enabled: false }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'memberships') return makeChain(membership)
      if (table === 'feature_flags') return makeChain(flagDisabled)
      if (table === 'tenants') return makeChain({ timezone: 'UTC' })
      return makeChain([])
    })

    const { GET } = await importRoute()
    const res = await GET(makeRequest('valid-token'), {
      params: Promise.resolve({ token: 'valid-token' }),
    })

    expect(res.status).toBe(404)
  })

  it('returns 200 with text/calendar content type for valid token', async () => {
    const membership = { id: 'mem-1', user_id: 'user-1', tenant_id: 'tenant-1' }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'memberships') return makeChain(membership)
      if (table === 'feature_flags') return makeChain(null) // missing = enabled
      if (table === 'tenants') return makeChain({ timezone: 'UTC' })
      if (table === 'day') return makeChain([])
      if (table === 'shift') return makeChain([])
      return makeChain(null)
    })

    const { GET } = await importRoute()
    const res = await GET(makeRequest('valid-token'), {
      params: Promise.resolve({ token: 'valid-token' }),
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/calendar; charset=utf-8')
    const body = await res.text()
    expect(body).toContain('BEGIN:VCALENDAR')
    expect(body).toContain('END:VCALENDAR')
  })

  it('includes VEVENT blocks for shifts with start and end times', async () => {
    const membership = { id: 'mem-1', user_id: 'user-1', tenant_id: 'tenant-1' }
    const days = [{ id: 'day-1', date_iso: '2026-06-01' }]
    const shiftRows = [
      {
        id: 'shift-1',
        day_id: 'day-1',
        start_time: '09:00',
        end_time: '17:00',
        role: 'Starter',
        notes: null,
      },
    ]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'memberships') return makeChain(membership)
      if (table === 'feature_flags') return makeChain(null)
      if (table === 'tenants') return makeChain({ timezone: 'UTC' })
      if (table === 'day') return makeChain(days)
      if (table === 'shift') return makeChain(shiftRows)
      return makeChain(null)
    })

    const { GET } = await importRoute()
    const res = await GET(makeRequest('valid-token'), {
      params: Promise.resolve({ token: 'valid-token' }),
    })

    const body = await res.text()
    expect(body).toContain('BEGIN:VEVENT')
    expect(body).toContain('END:VEVENT')
    expect(body).toContain('SUMMARY:Starter')
    // UTC times (timezone=UTC so local == UTC)
    expect(body).toContain('DTSTART:20260601T090000Z')
    expect(body).toContain('DTEND:20260601T170000Z')
    // DTSTAMP must not have double Z
    const dtstampMatch = body.match(/DTSTAMP:(\S+)/)
    expect(dtstampMatch).not.toBeNull()
    expect(dtstampMatch![1]).toMatch(/^\d{8}T\d{6}Z$/)
  })

  it('converts shift times from tenant timezone to UTC', async () => {
    const membership = { id: 'mem-1', user_id: 'user-1', tenant_id: 'tenant-1' }
    const days = [{ id: 'day-1', date_iso: '2026-06-01' }]
    // 09:00 America/New_York = 13:00 UTC (EDT, UTC-4)
    const shiftRows = [
      {
        id: 'shift-1',
        day_id: 'day-1',
        start_time: '09:00',
        end_time: '17:00',
        role: 'Server',
        notes: null,
      },
    ]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'memberships') return makeChain(membership)
      if (table === 'feature_flags') return makeChain(null)
      if (table === 'tenants') return makeChain({ timezone: 'America/New_York' })
      if (table === 'day') return makeChain(days)
      if (table === 'shift') return makeChain(shiftRows)
      return makeChain(null)
    })

    const { GET } = await importRoute()
    const res = await GET(makeRequest('valid-token'), {
      params: Promise.resolve({ token: 'valid-token' }),
    })

    const body = await res.text()
    // 09:00 EDT = 13:00 UTC; 17:00 EDT = 21:00 UTC
    expect(body).toContain('DTSTART:20260601T130000Z')
    expect(body).toContain('DTEND:20260601T210000Z')
  })

  it('skips shifts missing start or end time', async () => {
    const membership = { id: 'mem-1', user_id: 'user-1', tenant_id: 'tenant-1' }
    const days = [{ id: 'day-1', date_iso: '2026-06-01' }]
    const shiftRows = [
      {
        id: 'shift-1',
        day_id: 'day-1',
        start_time: null,
        end_time: null,
        role: 'Ranger',
        notes: null,
      },
    ]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'memberships') return makeChain(membership)
      if (table === 'feature_flags') return makeChain(null)
      if (table === 'tenants') return makeChain({ timezone: 'UTC' })
      if (table === 'day') return makeChain(days)
      if (table === 'shift') return makeChain(shiftRows)
      return makeChain(null)
    })

    const { GET } = await importRoute()
    const res = await GET(makeRequest('valid-token'), {
      params: Promise.resolve({ token: 'valid-token' }),
    })

    const body = await res.text()
    expect(body).not.toContain('BEGIN:VEVENT')
  })
})
