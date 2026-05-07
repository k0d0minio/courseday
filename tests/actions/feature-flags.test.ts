import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase-server', () => ({
  createSupabaseServiceClient: vi.fn(),
}))

vi.mock('@/lib/superadmin', () => ({
  getSuperadminStatus: vi.fn().mockResolvedValue(false),
}))

import { createSupabaseServiceClient } from '@/lib/supabase-server'
import { getFeatureFlags } from '@/app/actions/feature-flags'
import { KNOWN_FLAGS } from '@/lib/feature-flags'

const TENANT_ID = 'tenant-abc'

function makeSupabase(rows: { flag_key: string; enabled: boolean }[]) {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: rows, error: null }),
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
