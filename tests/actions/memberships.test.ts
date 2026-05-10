import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/tenant', () => ({ getTenantId: vi.fn().mockResolvedValue('tenant-1') }))
vi.mock('@/lib/membership', () => ({
  getUserRole: vi.fn().mockResolvedValue('editor'),
}))
vi.mock('@/lib/supabase-server', () => ({
  createTenantClient: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  createSupabaseServiceClient: vi.fn(),
}))
vi.mock('@/app/actions/auth', () => ({
  getUser: vi.fn().mockResolvedValue({ id: 'actor-user-id' }),
}))

// ── Imports ───────────────────────────────────────────────────────────────────

import { getUserRole } from '@/lib/membership'
import { createSupabaseServiceClient } from '@/lib/supabase-server'
import { updateStaffProfile } from '@/app/actions/memberships'
import { assertSuccess, assertFailure } from '@/tests/helpers/action-response'

// ── Helpers ───────────────────────────────────────────────────────────────────

type QueryResult = { data: unknown; error: { message: string } | null }

function makeChain(result: QueryResult = { data: null, error: null }) {
  const chain: Record<string, unknown> = {}
  ;['select', 'update', 'eq', 'order', 'limit'].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain)
  })
  chain.single = vi.fn().mockResolvedValue(result)
  chain.maybeSingle = vi.fn().mockResolvedValue(result)
  ;(chain as { then?: unknown }).then = (fn: (v: QueryResult) => void) =>
    Promise.resolve(result).then(fn)
  return chain
}

function mockServiceClient(fromFn: ReturnType<typeof vi.fn>) {
  vi.mocked(createSupabaseServiceClient).mockReturnValue({ from: fromFn } as never)
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MEMBERSHIP_ID = 'membership-1'
const PROFILE_DATA = { first_name: 'Jane', last_name: 'Smith', job_title: 'Barman' }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getUserRole).mockResolvedValue('editor')
})

// ── updateStaffProfile ────────────────────────────────────────────────────────

describe('updateStaffProfile', () => {
  it('editor can update a staff member profile', async () => {
    const fetchChain = makeChain({ data: { role: 'staff' }, error: null })
    const updateChain = makeChain({ data: null, error: null })
    const fromFn = vi.fn().mockReturnValueOnce(fetchChain).mockReturnValueOnce(updateChain)
    mockServiceClient(fromFn)

    const result = await updateStaffProfile(MEMBERSHIP_ID, PROFILE_DATA)

    assertSuccess(result)
    expect(updateChain.update).toHaveBeenCalledWith({
      first_name: 'Jane',
      last_name: 'Smith',
      job_title: 'Barman',
    })
  })

  it('rejects when caller is not editor', async () => {
    vi.mocked(getUserRole).mockResolvedValue('staff')

    const result = await updateStaffProfile(MEMBERSHIP_ID, PROFILE_DATA)

    assertFailure(result)
    expect(result.error).toBe('Not authorized.')
  })

  it('rejects when target membership not found', async () => {
    const fetchChain = makeChain({ data: null, error: null })
    const fromFn = vi.fn().mockReturnValue(fetchChain)
    mockServiceClient(fromFn)

    const result = await updateStaffProfile(MEMBERSHIP_ID, PROFILE_DATA)

    assertFailure(result)
    expect(result.error).toBe('Member not found.')
  })

  it('rejects when target is an editor (not staff)', async () => {
    const fetchChain = makeChain({ data: { role: 'editor' }, error: null })
    const fromFn = vi.fn().mockReturnValue(fetchChain)
    mockServiceClient(fromFn)

    const result = await updateStaffProfile(MEMBERSHIP_ID, PROFILE_DATA)

    assertFailure(result)
    expect(result.error).toBe('Can only edit staff profiles.')
  })

  it('propagates DB error on update', async () => {
    const fetchChain = makeChain({ data: { role: 'staff' }, error: null })
    const updateChain = makeChain({ data: null, error: { message: 'DB error' } })
    const fromFn = vi.fn().mockReturnValueOnce(fetchChain).mockReturnValueOnce(updateChain)
    mockServiceClient(fromFn)

    const result = await updateStaffProfile(MEMBERSHIP_ID, PROFILE_DATA)

    assertFailure(result)
    expect(result.error).toBe('DB error')
  })
})
