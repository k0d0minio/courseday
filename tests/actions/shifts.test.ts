import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/tenant', () => ({
  getTenantId: vi.fn().mockResolvedValue('tenant-1'),
}))

vi.mock('@/lib/membership', () => ({
  requireEditor: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/app/actions/feature-flags', () => ({
  isFeatureEnabled: vi.fn().mockResolvedValue(true),
}))

vi.mock('@/lib/supabase-server', () => ({
  createTenantClient: vi.fn(),
  createSupabaseServerClient: vi.fn(),
}))

vi.mock('@/app/actions/auth', () => ({
  getUser: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/app/[tenant]/day/[date]/queries', () => ({
  getTenantAssignees: vi.fn().mockResolvedValue(new Map()),
}))

// ── Imports ───────────────────────────────────────────────────────────────────

import { isFeatureEnabled } from '@/app/actions/feature-flags'
import { createTenantClient } from '@/lib/supabase-server'
import { clockInShift, clockOutShift, setShiftActuals } from '@/app/actions/shifts'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SHIFT_ID = 'shift-1'
const TENANT_ID = 'tenant-1'

function makeSupabase(overrides: {
  selectResult?: { data: unknown; error: unknown }
  updateResult?: { data: unknown; error: unknown }
}) {
  const selectChain = {
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(overrides.selectResult ?? { data: null, error: null }),
  }
  const updateChain = {
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi
      .fn()
      .mockResolvedValue(overrides.updateResult ?? { data: null, error: { message: 'no update' } }),
  }
  const fromFn = vi.fn().mockImplementation(() => ({
    select: vi.fn().mockReturnValue(selectChain),
    update: vi.fn().mockReturnValue(updateChain),
  }))
  return { from: fromFn }
}

beforeEach(() => {
  vi.mocked(isFeatureEnabled).mockResolvedValue(true)
})

// ── clockInShift ──────────────────────────────────────────────────────────────

describe('clockInShift', () => {
  it('sets actual_start when not yet clocked in', async () => {
    const updatedShift = { id: SHIFT_ID, actual_start: new Date().toISOString(), actual_end: null }
    const supabase = makeSupabase({
      selectResult: { data: { actual_start: null }, error: null },
      updateResult: { data: updatedShift, error: null },
    })
    vi.mocked(createTenantClient).mockResolvedValue({ supabase } as never)

    const result = await clockInShift(SHIFT_ID)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.actual_start).toBeTruthy()
  })

  it('returns error when already clocked in', async () => {
    const supabase = makeSupabase({
      selectResult: { data: { actual_start: new Date().toISOString() }, error: null },
    })
    vi.mocked(createTenantClient).mockResolvedValue({ supabase } as never)

    const result = await clockInShift(SHIFT_ID)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/already clocked in/i)
  })

  it('returns error when feature flag is off', async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValue(false)

    const result = await clockInShift(SHIFT_ID)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/disabled/i)
  })
})

// ── clockOutShift ─────────────────────────────────────────────────────────────

describe('clockOutShift', () => {
  it('sets actual_end when clocked in but not out', async () => {
    const updatedShift = {
      id: SHIFT_ID,
      actual_start: new Date().toISOString(),
      actual_end: new Date().toISOString(),
    }
    const supabase = makeSupabase({
      selectResult: {
        data: { actual_start: new Date().toISOString(), actual_end: null },
        error: null,
      },
      updateResult: { data: updatedShift, error: null },
    })
    vi.mocked(createTenantClient).mockResolvedValue({ supabase } as never)

    const result = await clockOutShift(SHIFT_ID)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.actual_end).toBeTruthy()
  })

  it('returns error when not yet clocked in', async () => {
    const supabase = makeSupabase({
      selectResult: { data: { actual_start: null, actual_end: null }, error: null },
    })
    vi.mocked(createTenantClient).mockResolvedValue({ supabase } as never)

    const result = await clockOutShift(SHIFT_ID)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/not clocked in/i)
  })

  it('returns error when feature flag is off', async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValue(false)

    const result = await clockOutShift(SHIFT_ID)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/disabled/i)
  })
})

// ── setShiftActuals ───────────────────────────────────────────────────────────

describe('setShiftActuals', () => {
  it('saves valid actuals', async () => {
    const start = '2026-05-09T08:00:00Z'
    const end = '2026-05-09T16:00:00Z'
    const updatedShift = { id: SHIFT_ID, actual_start: start, actual_end: end }
    const supabase = makeSupabase({ updateResult: { data: updatedShift, error: null } })
    vi.mocked(createTenantClient).mockResolvedValue({ supabase } as never)

    const result = await setShiftActuals(SHIFT_ID, { actual_start: start, actual_end: end })
    expect(result.success).toBe(true)
  })

  it('returns error when end is before start', async () => {
    const start = '2026-05-09T16:00:00Z'
    const end = '2026-05-09T08:00:00Z'

    const result = await setShiftActuals(SHIFT_ID, { actual_start: start, actual_end: end })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/end time must be after/i)
  })

  it('returns error when feature flag is off', async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValue(false)

    const result = await setShiftActuals(SHIFT_ID, { actual_start: null, actual_end: null })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/disabled/i)
  })
})
