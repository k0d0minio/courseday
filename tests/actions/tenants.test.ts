import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/redis', () => ({
  redis: {
    del: vi.fn().mockResolvedValue(1),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
  },
}))

vi.mock('@/app/actions/auth', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/superadmin', () => ({ isUserSuperadmin: vi.fn() }))
vi.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: vi.fn(),
  createSupabaseServiceClient: vi.fn(),
}))

import { redis } from '@/lib/redis'
import { getUser } from '@/app/actions/auth'
import { isUserSuperadmin } from '@/lib/superadmin'
import { createSupabaseServiceClient } from '@/lib/supabase-server'
import {
  deleteTenant,
  getTenantBySlug,
  suspendTenant,
  reactivateTenant,
  archiveTenant,
} from '@/app/actions/tenants'
import { assertFailure, assertSuccess } from '@/tests/helpers/action-response'

// ── Helpers ──────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-uuid-1'
const TENANT_SLUG = 'my-club'
const USER_A = 'user-uuid-a'
const USER_B = 'user-uuid-b'
const SUPERADMIN = { id: 'admin-uuid' }

function makeStorageChain({
  listData = [] as { name: string }[],
  listError = null,
}: { listData?: { name: string }[]; listError?: null | { message: string } } = {}) {
  return {
    from: vi.fn().mockReturnValue({
      list: vi.fn().mockResolvedValue({ data: listData, error: listError }),
      remove: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  }
}

function _makeFrom(rows: Record<string, unknown[]>, deleteError: { message: string } | null = null) {
  const remaining: Record<string, unknown[]> = { ...rows }

  return vi.fn().mockImplementation((table: string) => {
    const chain: Record<string, unknown> = {}
    let currentEq: { col: string; val: unknown } | null = null
    let isDelete = false
    let limitN = Infinity

    chain.select = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockImplementation((_col: string, _val: unknown) => {
      currentEq = { col: _col, val: _val }
      return chain
    })
    chain.limit = vi.fn().mockImplementation((n: number) => {
      limitN = n
      return chain
    })
    chain.single = vi.fn().mockImplementation(() => {
      const tableRows = remaining[table] ?? []
      const row = tableRows[0] ?? null
      return Promise.resolve({ data: row, error: row ? null : { message: 'not found' } })
    })
    chain.maybeSingle = vi.fn().mockImplementation(() => {
      const tableRows = remaining[table] ?? []
      const row = tableRows[0] ?? null
      return Promise.resolve({ data: row, error: null })
    })
    chain.delete = vi.fn().mockReturnValue(chain)
    chain.insert = vi.fn().mockReturnValue(chain)
    ;(chain as { then?: unknown }).then = (fn: (v: unknown) => void) => {
      if (isDelete) return Promise.resolve({ data: null, error: deleteError }).then(fn)
      const tableRows = remaining[table] ?? []
      const filtered = currentEq
        ? tableRows.filter((r) => (r as Record<string, unknown>)[currentEq!.col] === currentEq!.val)
        : tableRows
      const sliced = filtered.slice(0, limitN)
      return Promise.resolve({ data: sliced, error: null }).then(fn)
    }

    // track delete intent
    const origDelete = chain.delete as ReturnType<typeof vi.fn>
    chain.delete = vi.fn().mockImplementation(() => {
      isDelete = true
      return chain
    })
    void origDelete

    return chain
  })
}

// ── deleteTenant ──────────────────────────────────────────────────────────────

describe('deleteTenant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getUser).mockResolvedValue(SUPERADMIN as never)
    vi.mocked(isUserSuperadmin).mockResolvedValue(true)
    vi.mocked(redis.del).mockResolvedValue(1)
  })

  it('returns error when not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await deleteTenant(TENANT_ID)
    assertFailure(res)
    expect(res.error).toMatch(/not authenticated/i)
  })

  it('returns error when caller is not superadmin', async () => {
    vi.mocked(isUserSuperadmin).mockResolvedValue(false)
    const res = await deleteTenant(TENANT_ID)
    assertFailure(res)
    expect(res.error).toMatch(/not authorized/i)
  })

  it('returns error when tenant not found', async () => {
    const from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    })
    vi.mocked(createSupabaseServiceClient).mockReturnValue({
      from,
      storage: makeStorageChain(),
      auth: { admin: { deleteUser: vi.fn() } },
    } as never)

    const res = await deleteTenant(TENANT_ID)
    assertFailure(res)
    expect(res.error).toMatch(/not found/i)
  })

  it('deletes storage objects, then tenant, then orphaned users', async () => {
    const deleteUser = vi.fn().mockResolvedValue({})
    const storageRemove = vi.fn().mockResolvedValue({ data: null, error: null })

    const tenantRow = { id: TENANT_ID, slug: TENANT_SLUG }
    const membershipRows = [{ user_id: USER_A }, { user_id: USER_B }]
    // USER_A has no other memberships; USER_B does
    const remainingMemberships: Record<string, { user_id: string }[]> = {
      [USER_A]: [],
      [USER_B]: [{ user_id: USER_B }],
    }

    let tenantDeleted = false
    const from = vi.fn().mockImplementation((table: string) => {
      if (table === 'tenants') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: tenantRow, error: null }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation(() => {
              tenantDeleted = true
              return Promise.resolve({ data: null, error: null })
            }),
          }),
        }
      }
      if (table === 'memberships') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation((_col: string, val: string) => ({
            // initial collection call (tenant_id = TENANT_ID)
            then: (fn: (v: unknown) => void) =>
              Promise.resolve({ data: membershipRows, error: null }).then(fn),
            // per-user remaining check
            limit: vi.fn().mockImplementation(() => ({
              then: (fn: (v: unknown) => void) =>
                Promise.resolve({
                  data: remainingMemberships[val] ?? [],
                  error: null,
                }).then(fn),
            })),
          })),
        }
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() }
    })

    vi.mocked(createSupabaseServiceClient).mockReturnValue({
      from,
      storage: {
        from: vi.fn().mockReturnValue({
          list: vi.fn().mockResolvedValue({
            data: [{ name: 'logo.png' }],
            error: null,
          }),
          remove: storageRemove,
        }),
      },
      auth: { admin: { deleteUser } },
    } as never)

    const res = await deleteTenant(TENANT_ID)

    expect(res.success).toBe(true)
    expect(tenantDeleted).toBe(true)

    // Storage cleaned up with correct path
    expect(storageRemove).toHaveBeenCalledWith([`${TENANT_ID}/logo.png`])

    // Only USER_A (no remaining memberships) is deleted from auth
    expect(deleteUser).toHaveBeenCalledTimes(1)
    expect(deleteUser).toHaveBeenCalledWith(USER_A)

    // Redis key cleared
    expect(vi.mocked(redis.del)).toHaveBeenCalledWith(`subdomain:${TENANT_SLUG}`)
  })

  it('skips storage removal when bucket is empty', async () => {
    const deleteUser = vi.fn()
    const storageRemove = vi.fn()

    const from = vi.fn().mockImplementation((table: string) => {
      if (table === 'tenants') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: TENANT_ID, slug: TENANT_SLUG },
            error: null,
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }
      }
      if (table === 'memberships') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnValue({
            then: (fn: (v: unknown) => void) => Promise.resolve({ data: [], error: null }).then(fn),
            limit: vi.fn().mockReturnValue({
              then: (fn: (v: unknown) => void) =>
                Promise.resolve({ data: [], error: null }).then(fn),
            }),
          }),
        }
      }
      return {}
    })

    vi.mocked(createSupabaseServiceClient).mockReturnValue({
      from,
      storage: {
        from: vi.fn().mockReturnValue({
          list: vi.fn().mockResolvedValue({ data: [], error: null }),
          remove: storageRemove,
        }),
      },
      auth: { admin: { deleteUser } },
    } as never)

    const res = await deleteTenant(TENANT_ID)
    expect(res.success).toBe(true)
    expect(storageRemove).not.toHaveBeenCalled()
    expect(deleteUser).not.toHaveBeenCalled()
  })

  it('returns error when tenant row delete fails', async () => {
    const from = vi.fn().mockImplementation((table: string) => {
      if (table === 'tenants') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: TENANT_ID, slug: TENANT_SLUG },
            error: null,
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'FK violation' },
            }),
          }),
        }
      }
      if (table === 'memberships') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnValue({
            then: (fn: (v: unknown) => void) => Promise.resolve({ data: [], error: null }).then(fn),
          }),
        }
      }
      return {}
    })

    vi.mocked(createSupabaseServiceClient).mockReturnValue({
      from,
      storage: {
        from: vi.fn().mockReturnValue({
          list: vi.fn().mockResolvedValue({ data: [], error: null }),
          remove: vi.fn(),
        }),
      },
      auth: { admin: { deleteUser: vi.fn() } },
    } as never)

    const res = await deleteTenant(TENANT_ID)
    assertFailure(res)
    expect(res.error).toMatch(/failed to delete tenant/i)
  })
})

// ── getTenantBySlug ───────────────────────────────────────────────────────────

describe('getTenantBySlug', () => {
  const REDIS_DATA = JSON.stringify({
    id: TENANT_ID,
    slug: TENANT_SLUG,
    name: 'My Club',
    language: 'en',
    status: 'active',
  })

  beforeEach(() => vi.clearAllMocks())

  it('returns cached data from Redis when key exists', async () => {
    vi.mocked(redis.get).mockResolvedValue(REDIS_DATA)
    const res = await getTenantBySlug(TENANT_SLUG)
    assertSuccess(res)
    expect(res.data.slug).toBe(TENANT_SLUG)
    expect(createSupabaseServiceClient).not.toHaveBeenCalled()
  })

  it('falls back to Supabase when Redis miss and backfills cache', async () => {
    vi.mocked(redis.get).mockResolvedValue(null)
    const tenantRow = {
      id: TENANT_ID,
      name: 'My Club',
      slug: TENANT_SLUG,
      language: 'en',
      status: 'active',
    }
    vi.mocked(createSupabaseServiceClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: tenantRow, error: null }),
      }),
    } as never)

    const res = await getTenantBySlug(TENANT_SLUG)
    assertSuccess(res)
    expect(res.data.id).toBe(TENANT_ID)
    expect(vi.mocked(redis.set)).toHaveBeenCalled()
  })

  it('returns error when tenant not found in Supabase', async () => {
    vi.mocked(redis.get).mockResolvedValue(null)
    vi.mocked(createSupabaseServiceClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    } as never)

    const res = await getTenantBySlug(TENANT_SLUG)
    assertFailure(res)
    expect(res.error).toMatch(/not found/i)
  })

  it('falls back to Supabase when Redis throws', async () => {
    vi.mocked(redis.get).mockRejectedValue(new Error('redis down'))
    const tenantRow = {
      id: TENANT_ID,
      name: 'My Club',
      slug: TENANT_SLUG,
      language: 'fr',
      status: 'active',
    }
    vi.mocked(createSupabaseServiceClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: tenantRow, error: null }),
      }),
    } as never)

    const res = await getTenantBySlug(TENANT_SLUG)
    assertSuccess(res)
    expect(res.data.language).toBe('fr')
  })
})

// ── suspendTenant / reactivateTenant / archiveTenant ─────────────────────────

describe('setTenantStatus helpers', () => {
  beforeEach(() => vi.clearAllMocks())

  function makeStatusClient(
    updated: Record<string, unknown> | null,
    error: { message: string } | null = null
  ) {
    return {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updated, error }),
      }),
    }
  }

  const UPDATED = {
    id: TENANT_ID,
    name: 'My Club',
    slug: TENANT_SLUG,
    language: 'en',
    status: 'suspended',
  }

  it('suspendTenant succeeds and refreshes Redis', async () => {
    vi.mocked(createSupabaseServiceClient).mockReturnValue(makeStatusClient(UPDATED) as never)
    const res = await suspendTenant(TENANT_ID)
    expect(res.success).toBe(true)
    expect(vi.mocked(redis.set)).toHaveBeenCalled()
  })

  it('reactivateTenant succeeds', async () => {
    vi.mocked(createSupabaseServiceClient).mockReturnValue(
      makeStatusClient({ ...UPDATED, status: 'active' }) as never
    )
    const res = await reactivateTenant(TENANT_ID)
    expect(res.success).toBe(true)
  })

  it('archiveTenant succeeds', async () => {
    vi.mocked(createSupabaseServiceClient).mockReturnValue(
      makeStatusClient({ ...UPDATED, status: 'archived' }) as never
    )
    const res = await archiveTenant(TENANT_ID)
    expect(res.success).toBe(true)
  })

  it('returns error when DB update fails', async () => {
    vi.mocked(createSupabaseServiceClient).mockReturnValue(
      makeStatusClient(null, { message: 'db error' }) as never
    )
    const res = await suspendTenant(TENANT_ID)
    assertFailure(res)
    expect(res.error).toMatch(/failed to update/i)
  })
})
