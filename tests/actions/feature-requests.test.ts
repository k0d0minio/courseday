import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase-server', () => ({
  createTenantClient: vi.fn(),
  createSupabaseServiceClient: vi.fn(),
}))

vi.mock('@/lib/tenant', () => ({
  getTenantFromHeaders: vi.fn(),
  getTenantId: vi.fn(),
}))

vi.mock('@/lib/membership', () => ({
  getUserRole: vi.fn(),
}))

vi.mock('@/app/actions/auth', () => ({
  getUser: vi.fn(),
}))

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: vi.fn().mockResolvedValue({ id: 'email-id' }) },
  })),
}))

import { createTenantClient, createSupabaseServiceClient } from '@/lib/supabase-server'
import { getTenantFromHeaders, getTenantId } from '@/lib/tenant'
import { getUserRole } from '@/lib/membership'
import { getUser } from '@/app/actions/auth'
import { Resend } from 'resend'
import { createFeatureRequest } from '@/app/actions/feature-requests'

const TENANT = { id: 'tenant-1', slug: 'pine-hills', language: 'en' }
const USER = { id: 'user-1', email: 'editor@example.com' }
const INSERTED_ROW = {
  id: 'req-1',
  tenant_id: TENANT.id,
  user_id: USER.id,
  title: 'Better export',
  description: null,
  priority: null,
  workaround: null,
  expected_outcome: null,
  status: 'pending',
  created_at: '2026-05-11T00:00:00Z',
}

function makeSupabaseInsert(row: object) {
  return {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: row, error: null }),
        }),
      }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { name: 'Pine Hills GC' }, error: null }),
        }),
      }),
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getTenantFromHeaders).mockResolvedValue(TENANT)
  vi.mocked(getTenantId).mockResolvedValue(TENANT.id)
  vi.mocked(getUserRole).mockResolvedValue('editor')
  vi.mocked(getUser).mockResolvedValue(USER as never)
  vi.mocked(createTenantClient).mockResolvedValue({
    supabase: makeSupabaseInsert(INSERTED_ROW) as never,
    tenantId: TENANT.id,
  })
  vi.mocked(createSupabaseServiceClient).mockReturnValue(makeSupabaseInsert(INSERTED_ROW) as never)
  process.env.RESEND_API_KEY = 'test-key'
  process.env.SYSTEM_OWNER_EMAIL = 'owner@example.com'
})

describe('createFeatureRequest', () => {
  it('saves and returns the inserted row with only title', async () => {
    const result = await createFeatureRequest({ title: 'Better export' })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.title).toBe('Better export')
    expect(result.data.priority).toBeNull()
  })

  it('saves all optional fields when provided', async () => {
    const row = {
      ...INSERTED_ROW,
      priority: 'blocking',
      workaround: 'We do it manually',
      expected_outcome: 'One-click export',
    }
    vi.mocked(createTenantClient).mockResolvedValue({
      supabase: makeSupabaseInsert(row) as never,
      tenantId: TENANT.id,
    })

    const result = await createFeatureRequest({
      title: 'Better export',
      priority: 'blocking',
      workaround: 'We do it manually',
      expected_outcome: 'One-click export',
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.priority).toBe('blocking')
    expect(result.data.workaround).toBe('We do it manually')
    expect(result.data.expected_outcome).toBe('One-click export')
  })

  it('still returns success when email send throws', async () => {
    vi.mocked(Resend).mockImplementation(
      () =>
        ({
          emails: {
            send: vi.fn().mockRejectedValue(new Error('SMTP timeout')),
          },
        }) as never
    )

    const result = await createFeatureRequest({ title: 'Better export' })
    expect(result.success).toBe(true)
  })

  it('still returns success when RESEND_API_KEY is unset', async () => {
    delete process.env.RESEND_API_KEY

    const result = await createFeatureRequest({ title: 'Better export' })
    expect(result.success).toBe(true)
  })

  it('still returns success when SYSTEM_OWNER_EMAIL is unset', async () => {
    delete process.env.SYSTEM_OWNER_EMAIL

    const result = await createFeatureRequest({ title: 'Better export' })
    expect(result.success).toBe(true)
  })

  it('returns error when title is empty', async () => {
    const result = await createFeatureRequest({ title: '' })
    expect(result.success).toBe(false)
  })

  it('returns error when user is not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)

    const result = await createFeatureRequest({ title: 'Better export' })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error).toMatch(/authenticated/i)
  })
})
