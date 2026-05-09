import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/tenant', () => ({ getTenantId: vi.fn().mockResolvedValue('tenant-1') }))
vi.mock('@/lib/membership', () => ({
  requireEditor: vi.fn().mockResolvedValue({ id: 'user-1', email: 'test@example.com' }),
  getUserRole: vi.fn().mockResolvedValue('editor'),
}))
vi.mock('@/app/actions/feature-flags', () => ({
  isFeatureEnabled: vi.fn().mockResolvedValue(true),
}))
vi.mock('@/lib/supabase-server', () => ({
  createTenantClient: vi.fn(),
  createSupabaseServerClient: vi.fn(),
}))
vi.mock('@/app/actions/auth', () => ({ getUser: vi.fn().mockResolvedValue(null) }))
vi.mock('@/app/[tenant]/day/[date]/queries', () => ({
  getTenantAssignees: vi.fn().mockResolvedValue(new Map()),
}))

// ── Imports ───────────────────────────────────────────────────────────────────

import { isFeatureEnabled } from '@/app/actions/feature-flags'
import { createTenantClient, createSupabaseServerClient } from '@/lib/supabase-server'
import {
  createShift,
  updateShift,
  deleteShift,
  clockInShift,
  clockOutShift,
  setShiftActuals,
} from '@/app/actions/shifts'
import { assertSuccess, assertFailure } from '@/tests/helpers/action-response'

// ── Helpers ───────────────────────────────────────────────────────────────────

type QueryResult = { data: unknown; error: { message: string; code?: string } | null }

function makeChain(result: QueryResult = { data: null, error: null }) {
  const chain: Record<string, unknown> = {}
  ;[
    'select',
    'insert',
    'update',
    'delete',
    'upsert',
    'eq',
    'neq',
    'in',
    'is',
    'order',
    'limit',
  ].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain)
  })
  chain.single = vi.fn().mockResolvedValue(result)
  chain.maybeSingle = vi.fn().mockResolvedValue(result)
  ;(chain as { then?: unknown }).then = (fn: (v: QueryResult) => void) =>
    Promise.resolve(result).then(fn)
  return chain
}

function mockClient(fromFn: ReturnType<typeof vi.fn>) {
  vi.mocked(createTenantClient).mockResolvedValue({
    supabase: { from: fromFn } as never,
    tenantId: 'tenant-1',
  })
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SHIFT_ID = 'shift-1'
const DAY_ID = 'day-1'
const USER_UUID = '123e4567-e89b-12d3-a456-426614174000'

const VALID_SHIFT_DATA = {
  user_id: USER_UUID,
  role: 'Chef',
  start_time: '08:00',
  end_time: '16:00',
  notes: '',
}

const SHIFT_ROW = {
  id: SHIFT_ID,
  tenant_id: 'tenant-1',
  day_id: DAY_ID,
  user_id: USER_UUID,
  role: 'Chef',
  start_time: '08:00',
  end_time: '16:00',
  notes: null,
  actual_start: null,
  actual_end: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(isFeatureEnabled).mockResolvedValue(true)
})

// ── createShift ───────────────────────────────────────────────────────────────

describe('createShift', () => {
  it('creates a shift and returns it', async () => {
    // assertDayAndMemberBelongToTenant: day check → membership check → insert
    const dayChain = makeChain({ data: { id: DAY_ID }, error: null })
    const memberChain = makeChain({ data: { id: 'member-1' }, error: null })
    const insertChain = makeChain({ data: SHIFT_ROW, error: null })
    const from = vi
      .fn()
      .mockReturnValueOnce(dayChain)
      .mockReturnValueOnce(memberChain)
      .mockReturnValueOnce(insertChain)
    mockClient(from)

    const result = await createShift(DAY_ID, VALID_SHIFT_DATA)
    assertSuccess(result)
    expect(result.data).toMatchObject({ role: 'Chef' })
  })

  it('returns validation error for invalid user_id', async () => {
    const result = await createShift(DAY_ID, { ...VALID_SHIFT_DATA, user_id: 'not-a-uuid' })
    assertFailure(result)
    expect(result.error).toMatch(/team member/i)
  })

  it('returns error when day not found', async () => {
    const dayChain = makeChain({ data: null, error: null })
    const from = vi.fn().mockReturnValue(dayChain)
    mockClient(from)

    const result = await createShift(DAY_ID, VALID_SHIFT_DATA)
    assertFailure(result)
    expect(result.error).toMatch(/day not found/i)
  })
})

// ── updateShift ───────────────────────────────────────────────────────────────

describe('updateShift', () => {
  it('updates a shift and returns it', async () => {
    const dayChain = makeChain({ data: { id: DAY_ID }, error: null })
    const memberChain = makeChain({ data: { id: 'member-1' }, error: null })
    const updateChain = makeChain({ data: { ...SHIFT_ROW, role: 'Manager' }, error: null })
    const from = vi
      .fn()
      .mockReturnValueOnce(dayChain)
      .mockReturnValueOnce(memberChain)
      .mockReturnValueOnce(updateChain)
    mockClient(from)

    const result = await updateShift(SHIFT_ID, DAY_ID, { ...VALID_SHIFT_DATA, role: 'Manager' })
    assertSuccess(result)
    expect(result.data).toMatchObject({ role: 'Manager' })
  })

  it('returns validation error for invalid user_id', async () => {
    const result = await updateShift(SHIFT_ID, DAY_ID, {
      ...VALID_SHIFT_DATA,
      user_id: 'not-a-uuid',
    })
    assertFailure(result)
  })
})

// ── deleteShift ───────────────────────────────────────────────────────────────

describe('deleteShift', () => {
  it('deletes the shift and returns success', async () => {
    const chain = makeChain({ data: null, error: null })
    const from = vi.fn().mockReturnValue(chain)
    mockClient(from)

    const result = await deleteShift(SHIFT_ID, DAY_ID)
    expect(result.success).toBe(true)
  })

  it('surfaces DB error', async () => {
    const chain = makeChain({ data: null, error: { message: 'DB error' } })
    const from = vi.fn().mockReturnValue(chain)
    mockClient(from)

    const result = await deleteShift(SHIFT_ID, DAY_ID)
    assertFailure(result)
    expect(result.error).toBe('DB error')
  })
})

// ── clockInShift ──────────────────────────────────────────────────────────────

describe('clockInShift', () => {
  it('sets actual_start when not yet clocked in', async () => {
    const updatedShift = { id: SHIFT_ID, actual_start: new Date().toISOString(), actual_end: null }
    const selectChain = makeChain({ data: { actual_start: null }, error: null })
    const updateChain = makeChain({ data: updatedShift, error: null })
    const from = vi.fn().mockReturnValueOnce(selectChain).mockReturnValueOnce(updateChain)
    mockClient(from)

    const result = await clockInShift(SHIFT_ID)
    assertSuccess(result)
    expect(result.data.actual_start).toBeTruthy()
  })

  it('returns error when already clocked in', async () => {
    const selectChain = makeChain({
      data: { actual_start: new Date().toISOString() },
      error: null,
    })
    const from = vi.fn().mockReturnValue(selectChain)
    mockClient(from)

    const result = await clockInShift(SHIFT_ID)
    assertFailure(result)
    expect(result.error).toMatch(/already clocked in/i)
  })

  it('returns error when staff_schedule feature flag is off', async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValue(false)

    const result = await clockInShift(SHIFT_ID)
    assertFailure(result)
    expect(result.error).toMatch(/disabled/i)
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
    const selectChain = makeChain({
      data: { actual_start: new Date().toISOString(), actual_end: null },
      error: null,
    })
    const updateChain = makeChain({ data: updatedShift, error: null })
    const from = vi.fn().mockReturnValueOnce(selectChain).mockReturnValueOnce(updateChain)
    mockClient(from)

    const result = await clockOutShift(SHIFT_ID)
    assertSuccess(result)
    expect(result.data.actual_end).toBeTruthy()
  })

  it('returns error when not yet clocked in', async () => {
    const selectChain = makeChain({
      data: { actual_start: null, actual_end: null },
      error: null,
    })
    const from = vi.fn().mockReturnValue(selectChain)
    mockClient(from)

    const result = await clockOutShift(SHIFT_ID)
    assertFailure(result)
    expect(result.error).toMatch(/not clocked in/i)
  })

  it('returns error when staff_schedule feature flag is off', async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValue(false)

    const result = await clockOutShift(SHIFT_ID)
    assertFailure(result)
    expect(result.error).toMatch(/disabled/i)
  })
})

// ── setShiftActuals ───────────────────────────────────────────────────────────

describe('setShiftActuals', () => {
  it('saves valid actuals', async () => {
    const start = '2026-05-09T08:00:00Z'
    const end = '2026-05-09T16:00:00Z'
    const updatedShift = { id: SHIFT_ID, actual_start: start, actual_end: end }
    const from = vi.fn().mockReturnValue(makeChain({ data: updatedShift, error: null }))
    mockClient(from)

    const result = await setShiftActuals(SHIFT_ID, { actual_start: start, actual_end: end })
    assertSuccess(result)
  })

  it('returns error when end is before start', async () => {
    const result = await setShiftActuals(SHIFT_ID, {
      actual_start: '2026-05-09T16:00:00Z',
      actual_end: '2026-05-09T08:00:00Z',
    })
    assertFailure(result)
    expect(result.error).toMatch(/end time must be after/i)
  })

  it('returns error when staff_schedule feature flag is off', async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValue(false)

    const result = await setShiftActuals(SHIFT_ID, { actual_start: null, actual_end: null })
    assertFailure(result)
    expect(result.error).toMatch(/disabled/i)
  })
})
