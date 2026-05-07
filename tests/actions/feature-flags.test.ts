import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase-server', () => ({
  createSupabaseServiceClient: vi.fn(),
}))

vi.mock('@/lib/superadmin', () => ({
  getSuperadminStatus: vi.fn().mockResolvedValue(false),
}))

import { createSupabaseServiceClient } from '@/lib/supabase-server'
import { getSuperadminStatus } from '@/lib/superadmin'
import {
  getFeatureFlags,
  getFeatureFlagsByTenants,
  isFeatureEnabled,
  setFeatureFlag,
} from '@/app/actions/feature-flags'
import { KNOWN_FLAGS } from '@/lib/feature-flags'

const TENANT_ID = 'tenant-abc'

function makeSupabase(rows: { flag_key: string; enabled: boolean }[]) {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: rows, error: null }),
        in: vi.fn().mockResolvedValue({ data: rows, error: null }),
      }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }),
  }
}

function makeMultiTenantSupabase(
  rows: { tenant_id: string; flag_key: string; enabled: boolean }[]
) {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ data: rows, error: null }),
      }),
    }),
  }
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('getFeatureFlags', () => {
  it('defaults all flags to true when DB has no rows', async () => {
    vi.mocked(createSupabaseServiceClient).mockReturnValue(makeSupabase([]) as never)

    const flags = await getFeatureFlags(TENANT_ID)

    for (const key of KNOWN_FLAGS) {
      expect(flags[key]).toBe(true)
    }
  })

  it('returns stored value when flag is explicitly disabled', async () => {
    vi.mocked(createSupabaseServiceClient).mockReturnValue(
      makeSupabase([{ flag_key: 'reservations', enabled: false }]) as never
    )

    const flags = await getFeatureFlags(TENANT_ID)

    expect(flags.reservations).toBe(false)
  })

  it('returns true for flags absent from DB even when others are set', async () => {
    vi.mocked(createSupabaseServiceClient).mockReturnValue(
      makeSupabase([
        { flag_key: 'reservations', enabled: false },
        { flag_key: 'daily_brief', enabled: false },
      ]) as never
    )

    const flags = await getFeatureFlags(TENANT_ID)

    expect(flags.reservations).toBe(false)
    expect(flags.daily_brief).toBe(false)
    expect(flags.breakfast_config).toBe(true)
    expect(flags.weather_reporting).toBe(true)
    expect(flags.checklists).toBe(true)
    expect(flags.staff_schedule).toBe(true)
  })

  it('returns a complete map covering every KNOWN_FLAG', async () => {
    vi.mocked(createSupabaseServiceClient).mockReturnValue(makeSupabase([]) as never)

    const flags = await getFeatureFlags(TENANT_ID)

    expect(Object.keys(flags).sort()).toEqual([...KNOWN_FLAGS].sort())
  })

  it('ignores unknown flag_key rows from DB', async () => {
    vi.mocked(createSupabaseServiceClient).mockReturnValue(
      makeSupabase([{ flag_key: 'unknown_future_flag', enabled: false }]) as never
    )

    const flags = await getFeatureFlags(TENANT_ID)

    expect(Object.keys(flags)).not.toContain('unknown_future_flag')
    for (const key of KNOWN_FLAGS) {
      expect(flags[key]).toBe(true)
    }
  })
})

describe('getFeatureFlagsByTenants', () => {
  it('returns empty object for empty tenantIds array', async () => {
    const result = await getFeatureFlagsByTenants([])
    expect(result).toEqual({})
  })

  it('returns flag maps keyed by tenantId', async () => {
    vi.mocked(createSupabaseServiceClient).mockReturnValue(
      makeMultiTenantSupabase([
        { tenant_id: 'tenant-1', flag_key: 'reservations', enabled: false },
        { tenant_id: 'tenant-2', flag_key: 'daily_brief', enabled: false },
      ]) as never
    )

    const result = await getFeatureFlagsByTenants(['tenant-1', 'tenant-2'])

    expect(result['tenant-1'].reservations).toBe(false)
    expect(result['tenant-1'].daily_brief).toBe(true)
    expect(result['tenant-2'].daily_brief).toBe(false)
    expect(result['tenant-2'].reservations).toBe(true)
  })

  it('defaults all flags to true when DB has no rows', async () => {
    vi.mocked(createSupabaseServiceClient).mockReturnValue(makeMultiTenantSupabase([]) as never)

    const result = await getFeatureFlagsByTenants(['tenant-1'])

    for (const key of KNOWN_FLAGS) {
      expect(result['tenant-1'][key]).toBe(true)
    }
  })
})

describe('isFeatureEnabled', () => {
  it('returns true when flag is enabled', async () => {
    vi.mocked(createSupabaseServiceClient).mockReturnValue(makeSupabase([]) as never)

    const enabled = await isFeatureEnabled(TENANT_ID, 'reservations')

    expect(enabled).toBe(true)
  })

  it('returns false when flag is explicitly disabled', async () => {
    vi.mocked(createSupabaseServiceClient).mockReturnValue(
      makeSupabase([{ flag_key: 'reservations', enabled: false }]) as never
    )

    const enabled = await isFeatureEnabled(TENANT_ID, 'reservations')

    expect(enabled).toBe(false)
  })
})

describe('setFeatureFlag', () => {
  it('returns error when caller is not superadmin', async () => {
    vi.mocked(getSuperadminStatus).mockResolvedValue(false)

    const result = await setFeatureFlag(TENANT_ID, 'reservations', false)

    expect(result.success).toBe(false)
    expect((result as { success: false; error: string }).error).toBe('Not authorized.')
  })

  it('returns error for unknown flag key', async () => {
    vi.mocked(getSuperadminStatus).mockResolvedValue(true)
    vi.mocked(createSupabaseServiceClient).mockReturnValue(makeSupabase([]) as never)

    const result = await setFeatureFlag(TENANT_ID, 'unknown_key' as never, true)

    expect(result.success).toBe(false)
  })

  it('persists flag when caller is superadmin', async () => {
    vi.mocked(getSuperadminStatus).mockResolvedValue(true)
    const sb = makeSupabase([])
    vi.mocked(createSupabaseServiceClient).mockReturnValue(sb as never)

    const result = await setFeatureFlag(TENANT_ID, 'reservations', false)

    expect(result.success).toBe(true)
    expect(sb.from).toHaveBeenCalledWith('feature_flags')
    expect(sb.from('feature_flags').upsert).toHaveBeenCalled()
  })
})
