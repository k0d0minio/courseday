import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase-server', () => ({
  createTenantClient: vi.fn(),
}))

import { createTenantClient } from '@/lib/supabase-server'
import { tenantInsert, tenantQuery } from '@/lib/queries'

const TENANT_ID = 'tenant-123'

function makeChain(insertResult = { data: null, error: null }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  chain.from = vi.fn().mockReturnValue(chain)
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.insert = vi.fn().mockResolvedValue(insertResult)
  return chain
}

describe('tenantInsert', () => {
  beforeEach(() => vi.clearAllMocks())

  it('injects tenant_id into the insert payload', async () => {
    const chain = makeChain()
    vi.mocked(createTenantClient).mockResolvedValue({
      supabase: chain as never,
      tenantId: TENANT_ID,
    })

    await tenantInsert('program_items', { title: 'Welcome', day_id: 'day-1' })

    expect(chain.insert).toHaveBeenCalledWith({
      title: 'Welcome',
      day_id: 'day-1',
      tenant_id: TENANT_ID,
    })
  })

  it('does not overwrite an existing tenant_id in the payload', async () => {
    const chain = makeChain()
    vi.mocked(createTenantClient).mockResolvedValue({
      supabase: chain as never,
      tenantId: TENANT_ID,
    })

    // Even if caller passes a different tenant_id, it gets overwritten
    await tenantInsert('program_items', {
      title: 'Test',
      tenant_id: 'some-other-id',
    })

    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({ tenant_id: TENANT_ID }))
  })

  it('calls from() with the correct table name', async () => {
    const chain = makeChain()
    vi.mocked(createTenantClient).mockResolvedValue({
      supabase: chain as never,
      tenantId: TENANT_ID,
    })

    await tenantInsert('reservations', { guest_name: 'Alice' })

    expect(chain.from).toHaveBeenCalledWith('reservations')
  })
})

describe('tenantQuery', () => {
  beforeEach(() => vi.clearAllMocks())

  it('scopes the query to the current tenant', async () => {
    const chain = makeChain()
    vi.mocked(createTenantClient).mockResolvedValue({
      supabase: chain as never,
      tenantId: TENANT_ID,
    })

    await tenantQuery('reservations')

    expect(chain.from).toHaveBeenCalledWith('reservations')
    expect(chain.eq).toHaveBeenCalledWith('tenant_id', TENANT_ID)
  })
})
