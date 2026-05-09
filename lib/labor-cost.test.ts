import { describe, it, expect } from 'vitest'
import { scheduledMinutesFromTimes, actualMinutesFromTimestamps } from './labor-cost'

describe('scheduledMinutesFromTimes', () => {
  it('computes normal shift duration', () => {
    expect(scheduledMinutesFromTimes('08:00', '16:00')).toBe(480)
  })

  it('computes partial hour shift', () => {
    expect(scheduledMinutesFromTimes('09:30', '11:45')).toBe(135)
  })

  it('handles overnight shift (end < start)', () => {
    expect(scheduledMinutesFromTimes('22:00', '06:00')).toBe(480)
  })

  it('handles zero-length shift', () => {
    expect(scheduledMinutesFromTimes('10:00', '10:00')).toBe(0)
  })

  it('returns 0 when start is null', () => {
    expect(scheduledMinutesFromTimes(null, '16:00')).toBe(0)
  })

  it('returns 0 when end is null', () => {
    expect(scheduledMinutesFromTimes('08:00', null)).toBe(0)
  })

  it('returns 0 when both null', () => {
    expect(scheduledMinutesFromTimes(null, null)).toBe(0)
  })
})

describe('actualMinutesFromTimestamps', () => {
  it('computes duration from ISO timestamps', () => {
    expect(actualMinutesFromTimestamps('2026-05-05T08:00:00Z', '2026-05-05T16:00:00Z')).toBe(480)
  })

  it('handles sub-minute rounding', () => {
    expect(actualMinutesFromTimestamps('2026-05-05T08:00:00Z', '2026-05-05T08:01:30Z')).toBe(2)
  })

  it('returns 0 when start is null', () => {
    expect(actualMinutesFromTimestamps(null, '2026-05-05T16:00:00Z')).toBe(0)
  })

  it('returns 0 when end is null', () => {
    expect(actualMinutesFromTimestamps('2026-05-05T08:00:00Z', null)).toBe(0)
  })

  it('returns 0 for negative duration', () => {
    expect(actualMinutesFromTimestamps('2026-05-05T16:00:00Z', '2026-05-05T08:00:00Z')).toBe(0)
  })
})

describe('cost math', () => {
  it('computes hourly cost from scheduled minutes', () => {
    const minutes = scheduledMinutesFromTimes('08:00', '16:00') // 480
    const cost = (minutes / 60) * 15 // 8h * €15 = €120
    expect(cost).toBeCloseTo(120)
  })

  it('computes zero cost when rate is null (treat as 0)', () => {
    const minutes = scheduledMinutesFromTimes('08:00', '16:00') // 480
    const rate = null
    const cost = (minutes / 60) * (rate ?? 0)
    expect(cost).toBe(0)
  })
})
