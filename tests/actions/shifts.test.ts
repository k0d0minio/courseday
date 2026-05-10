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
  createSupabaseServiceClient: vi.fn(),
}))
vi.mock('@/app/actions/auth', () => ({
  getUser: vi.fn().mockResolvedValue({ id: 'actor-user-id' }),
}))
vi.mock('@/app/[tenant]/day/[date]/queries', () => ({
  getTenantAssignees: vi.fn().mockResolvedValue(new Map()),
}))
vi.mock('@/lib/notifications', () => ({
  awaitNotifications: vi.fn().mockResolvedValue(undefined),
  getDayDate: vi.fn().mockResolvedValue('2026-05-10'),
}))
vi.mock('@/lib/shift-notifications', () => ({
  notifyShiftAssigned: vi.fn().mockResolvedValue(undefined),
  notifyShiftUpdatedSameUser: vi.fn().mockResolvedValue(undefined),
  notifyShiftReassigned: vi.fn().mockResolvedValue(undefined),
  notifyShiftCancelled: vi.fn().mockResolvedValue(undefined),
}))

// ── Imports ───────────────────────────────────────────────────────────────────

import { isFeatureEnabled } from '@/app/actions/feature-flags'
import { createTenantClient } from '@/lib/supabase-server'
import { awaitNotifications } from '@/lib/notifications'
import {
  notifyShiftAssigned,
  notifyShiftUpdatedSameUser,
  notifyShiftReassigned,
  notifyShiftCancelled,
} from '@/lib/shift-notifications'
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
const OTHER_UUID = '223e4567-e89b-12d3-a456-426614174001'

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

  it('calls notifyShiftAssigned after success when flag is on', async () => {
    const dayChain = makeChain({ data: { id: DAY_ID }, error: null })
    const memberChain = makeChain({ data: { id: 'member-1' }, error: null })
    const insertChain = makeChain({ data: SHIFT_ROW, error: null })
    const from = vi
      .fn()
      .mockReturnValueOnce(dayChain)
      .mockReturnValueOnce(memberChain)
      .mockReturnValueOnce(insertChain)
    mockClient(from)

    await createShift(DAY_ID, VALID_SHIFT_DATA)

    expect(awaitNotifications).toHaveBeenCalledOnce()
    expect(notifyShiftAssigned).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        assigneeId: USER_UUID,
        dayId: DAY_ID,
      })
    )
  })

  it('skips notifyShiftAssigned when staff_schedule flag is off', async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValue(false)
    const dayChain = makeChain({ data: { id: DAY_ID }, error: null })
    const memberChain = makeChain({ data: { id: 'member-1' }, error: null })
    const insertChain = makeChain({ data: SHIFT_ROW, error: null })
    const from = vi
      .fn()
      .mockReturnValueOnce(dayChain)
      .mockReturnValueOnce(memberChain)
      .mockReturnValueOnce(insertChain)
    mockClient(from)

    await createShift(DAY_ID, VALID_SHIFT_DATA)

    expect(notifyShiftAssigned).not.toHaveBeenCalled()
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
    const oldShiftChain = makeChain({ data: { user_id: USER_UUID }, error: null })
    const updateChain = makeChain({ data: { ...SHIFT_ROW, role: 'Manager' }, error: null })
    const from = vi
      .fn()
      .mockReturnValueOnce(dayChain)
      .mockReturnValueOnce(memberChain)
      .mockReturnValueOnce(oldShiftChain)
      .mockReturnValueOnce(updateChain)
    mockClient(from)

    const result = await updateShift(SHIFT_ID, DAY_ID, { ...VALID_SHIFT_DATA, role: 'Manager' })
    assertSuccess(result)
    expect(result.data).toMatchObject({ role: 'Manager' })
  })

  it('calls notifyShiftUpdatedSameUser when user unchanged', async () => {
    const dayChain = makeChain({ data: { id: DAY_ID }, error: null })
    const memberChain = makeChain({ data: { id: 'member-1' }, error: null })
    const oldShiftChain = makeChain({ data: { user_id: USER_UUID }, error: null })
    const updateChain = makeChain({ data: SHIFT_ROW, error: null })
    const from = vi
      .fn()
      .mockReturnValueOnce(dayChain)
      .mockReturnValueOnce(memberChain)
      .mockReturnValueOnce(oldShiftChain)
      .mockReturnValueOnce(updateChain)
    mockClient(from)

    await updateShift(SHIFT_ID, DAY_ID, VALID_SHIFT_DATA)

    expect(notifyShiftUpdatedSameUser).toHaveBeenCalledWith(
      expect.objectContaining({ assigneeId: USER_UUID, dayId: DAY_ID })
    )
    expect(notifyShiftReassigned).not.toHaveBeenCalled()
  })

  it('calls notifyShiftReassigned when user changes', async () => {
    const dayChain = makeChain({ data: { id: DAY_ID }, error: null })
    const memberChain = makeChain({ data: { id: 'member-1' }, error: null })
    const oldShiftChain = makeChain({ data: { user_id: OTHER_UUID }, error: null })
    const updateChain = makeChain({ data: { ...SHIFT_ROW, user_id: USER_UUID }, error: null })
    const from = vi
      .fn()
      .mockReturnValueOnce(dayChain)
      .mockReturnValueOnce(memberChain)
      .mockReturnValueOnce(oldShiftChain)
      .mockReturnValueOnce(updateChain)
    mockClient(from)

    await updateShift(SHIFT_ID, DAY_ID, VALID_SHIFT_DATA)

    expect(notifyShiftReassigned).toHaveBeenCalledWith(
      expect.objectContaining({
        newAssigneeId: USER_UUID,
        oldAssigneeId: OTHER_UUID,
        dayId: DAY_ID,
      })
    )
    expect(notifyShiftUpdatedSameUser).not.toHaveBeenCalled()
  })

  it('skips notification when staff_schedule flag is off', async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValue(false)
    const dayChain = makeChain({ data: { id: DAY_ID }, error: null })
    const memberChain = makeChain({ data: { id: 'member-1' }, error: null })
    const oldShiftChain = makeChain({ data: { user_id: USER_UUID }, error: null })
    const updateChain = makeChain({ data: SHIFT_ROW, error: null })
    const from = vi
      .fn()
      .mockReturnValueOnce(dayChain)
      .mockReturnValueOnce(memberChain)
      .mockReturnValueOnce(oldShiftChain)
      .mockReturnValueOnce(updateChain)
    mockClient(from)

    await updateShift(SHIFT_ID, DAY_ID, VALID_SHIFT_DATA)

    expect(notifyShiftUpdatedSameUser).not.toHaveBeenCalled()
    expect(notifyShiftReassigned).not.toHaveBeenCalled()
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
    const existingChain = makeChain({ data: { user_id: USER_UUID }, error: null })
    const deleteChain = makeChain({ data: null, error: null })
    const from = vi.fn().mockReturnValueOnce(existingChain).mockReturnValueOnce(deleteChain)
    mockClient(from)

    const result = await deleteShift(SHIFT_ID, DAY_ID)
    expect(result.success).toBe(true)
  })

  it('calls notifyShiftCancelled after delete', async () => {
    const existingChain = makeChain({ data: { user_id: USER_UUID }, error: null })
    const deleteChain = makeChain({ data: null, error: null })
    const from = vi.fn().mockReturnValueOnce(existingChain).mockReturnValueOnce(deleteChain)
    mockClient(from)

    await deleteShift(SHIFT_ID, DAY_ID)

    expect(notifyShiftCancelled).toHaveBeenCalledWith(
      expect.objectContaining({ assigneeId: USER_UUID, dayId: DAY_ID })
    )
  })

  it('skips notification when staff_schedule flag is off', async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValue(false)
    const existingChain = makeChain({ data: { user_id: USER_UUID }, error: null })
    const deleteChain = makeChain({ data: null, error: null })
    const from = vi.fn().mockReturnValueOnce(existingChain).mockReturnValueOnce(deleteChain)
    mockClient(from)

    await deleteShift(SHIFT_ID, DAY_ID)

    expect(notifyShiftCancelled).not.toHaveBeenCalled()
  })

  it('surfaces DB error', async () => {
    const existingChain = makeChain({ data: null, error: null })
    const deleteChain = makeChain({ data: null, error: { message: 'DB error' } })
    const from = vi.fn().mockReturnValueOnce(existingChain).mockReturnValueOnce(deleteChain)
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
