import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ────────────────────────────────────────────────────────────────────

const { mockGet } = vi.hoisted(() => ({
  mockGet: vi.fn().mockReturnValue(null),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({ get: mockGet }),
}))

// ── Tests ────────────────────────────────────────────────────────────────────

import { getTenantFromHeaders, getTenantId } from '@/lib/tenant'

describe('Tenant isolation — getTenantFromHeaders', () => {
  beforeEach(() => {
    mockGet.mockReturnValue(null)
  })

  it('throws when x-tenant-id header is absent', async () => {
    await expect(getTenantFromHeaders()).rejects.toThrow(
      'getTenantFromHeaders() called outside of a tenant context'
    )
  })

  it('throws when only x-tenant-id is present (slug missing)', async () => {
    mockGet.mockImplementation((key: string) => (key === 'x-tenant-id' ? 'tenant-abc' : null))
    await expect(getTenantFromHeaders()).rejects.toThrow(
      'getTenantFromHeaders() called outside of a tenant context'
    )
  })

  it('returns { id, slug } when both headers are present', async () => {
    mockGet.mockImplementation((key: string) => {
      if (key === 'x-tenant-id') return 'tenant-abc'
      if (key === 'x-tenant-slug') return 'my-club'
      return null
    })
    const ctx = await getTenantFromHeaders()
    expect(ctx.id).toBe('tenant-abc')
    expect(ctx.slug).toBe('my-club')
  })
})

describe('Tenant isolation — getTenantId', () => {
  it('throws when called outside of tenant context', async () => {
    mockGet.mockReturnValue(null)
    await expect(getTenantId()).rejects.toThrow()
  })
})
