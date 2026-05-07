import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/tenant', () => ({ getTenantId: vi.fn().mockResolvedValue('tenant-1') }))
vi.mock('@/lib/membership', () => ({
  requireEditor: vi.fn(),
  getUserRole: vi.fn().mockResolvedValue('editor'),
}))
vi.mock('@/lib/supabase-server', () => ({ createTenantClient: vi.fn() }))

// ── Helpers ──────────────────────────────────────────────────────────────────

import { createTenantClient } from '@/lib/supabase-server'
import { createPOC, deletePOC, getAllPOCs } from '@/app/actions/poc'
import { assertSuccess, assertFailure } from '@/tests/helpers/action-response'

type QueryResult = { data: unknown; error: { message: string; code?: string } | null }

function makeChain(result: QueryResult = { data: null, error: null }) {
  const chain: Record<string, unknown> = {}
  ;['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'neq', 'in', 'order'].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain)
  })
  chain.single = vi.fn().mockResolvedValue(result)
  chain.maybeSingle = vi.fn().mockResolvedValue(result)
  ;(chain as { then?: unknown }).then = (fn: (v: QueryResult) => void) =>
    Promise.resolve(result).then(fn)
  return chain
}

const VALID_POC = { name: 'Alice Dupont', email: 'alice@example.com', phone: '' }

const POC_ROW = {
  id: 'poc-1',
  tenant_id: 'tenant-1',
  name: 'Alice Dupont',
  email: 'alice@example.com',
  phone: null,
}

// ── createPOC ─────────────────────────────────────────────────────────────────

describe('createPOC', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a POC and returns it', async () => {
    const from = vi.fn().mockReturnValue(makeChain({ data: POC_ROW, error: null }))
    vi.mocked(createTenantClient).mockResolvedValue({
      supabase: { from } as never,
      tenantId: 'tenant-1',
    })

    const result = await createPOC(VALID_POC)
    assertSuccess(result)
    expect(result.data).toMatchObject({ name: 'Alice Dupont' })
  })

  it('returns validation error for empty name', async () => {
    const result = await createPOC({ name: '', email: '', phone: '' })
    assertFailure(result)
    expect(result.error).toBe('Name is required')
  })

  it('maps Postgres unique-constraint error (23505) to human-readable message', async () => {
    const from = vi
      .fn()
      .mockReturnValue(
        makeChain({ data: null, error: { message: 'duplicate key value', code: '23505' } })
      )
    vi.mocked(createTenantClient).mockResolvedValue({
      supabase: { from } as never,
      tenantId: 'tenant-1',
    })

    const result = await createPOC(VALID_POC)
    assertFailure(result)
    expect(result.error).toBe('A contact with that name, email, or phone already exists.')
  })
})

// ── deletePOC ─────────────────────────────────────────────────────────────────

describe('deletePOC', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deletes the POC and returns success', async () => {
    const chain = makeChain({ data: null, error: null })
    const from = vi.fn().mockReturnValue(chain)
    vi.mocked(createTenantClient).mockResolvedValue({
      supabase: { from } as never,
      tenantId: 'tenant-1',
    })

    const result = await deletePOC('poc-1')
    expect(result.success).toBe(true)
    expect(chain.delete as ReturnType<typeof vi.fn>).toHaveBeenCalled()
  })

  it('surfaces FK constraint error when POC is still referenced by a program item', async () => {
    // Supabase returns error code 23503 (FK violation) when a referencing row exists
    const from = vi.fn().mockReturnValue(
      makeChain({
        data: null,
        error: {
          message: 'update or delete on table "point_of_contact" violates foreign key',
          code: '23503',
        },
      })
    )
    vi.mocked(createTenantClient).mockResolvedValue({
      supabase: { from } as never,
      tenantId: 'tenant-1',
    })

    const result = await deletePOC('poc-1')
    assertFailure(result)
    // Error message is surfaced as-is from Supabase
    expect(result.error).toContain('foreign key')
  })
})

// ── getAllPOCs ────────────────────────────────────────────────────────────────

describe('getAllPOCs', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns all POCs for the tenant', async () => {
    const pocs = [POC_ROW, { ...POC_ROW, id: 'poc-2', name: 'Bob Martin' }]
    const from = vi.fn().mockReturnValue(makeChain({ data: pocs, error: null }))
    vi.mocked(createTenantClient).mockResolvedValue({
      supabase: { from } as never,
      tenantId: 'tenant-1',
    })

    const result = await getAllPOCs()
    assertSuccess(result)
    expect(result.data).toHaveLength(2)
  })

  it('returns error when user has no role (not a member)', async () => {
    const { getUserRole } = await import('@/lib/membership')
    vi.mocked(getUserRole).mockResolvedValueOnce(null)

    const result = await getAllPOCs()
    assertFailure(result)
    expect(result.error).toBe('Not authorized.')
  })
})
