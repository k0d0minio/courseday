import { describe, it, expect } from 'vitest'
import { getWeekdayName, datesInRange } from '@/lib/day-utils'

// ---------------------------------------------------------------------------
// Weekday computation (used by ensureDayExists / ensureDaysRange)
// ---------------------------------------------------------------------------
describe('getWeekdayName', () => {
  it('returns Monday for 2024-04-01', () => {
    expect(getWeekdayName('2024-04-01')).toBe('Monday')
  })

  it('returns Sunday for 2024-03-31', () => {
    expect(getWeekdayName('2024-03-31')).toBe('Sunday')
  })

  it('returns Saturday for 2024-06-01', () => {
    expect(getWeekdayName('2024-06-01')).toBe('Saturday')
  })
})

// ---------------------------------------------------------------------------
// datesInRange (used by ensureDaysRange)
// ---------------------------------------------------------------------------
describe('datesInRange', () => {
  it('returns a single date when start equals end', () => {
    expect(datesInRange('2024-06-15', '2024-06-15')).toEqual(['2024-06-15'])
  })

  it('returns all dates in a short range', () => {
    expect(datesInRange('2024-06-01', '2024-06-05')).toEqual([
      '2024-06-01',
      '2024-06-02',
      '2024-06-03',
      '2024-06-04',
      '2024-06-05',
    ])
  })

  it('returns empty array when start is after end', () => {
    expect(datesInRange('2024-06-10', '2024-06-05')).toEqual([])
  })

  it('crosses a month boundary correctly', () => {
    const result = datesInRange('2024-01-30', '2024-02-02')
    expect(result).toEqual(['2024-01-30', '2024-01-31', '2024-02-01', '2024-02-02'])
  })

  it('handles a full month range for February in a leap year', () => {
    const result = datesInRange('2024-02-01', '2024-02-29')
    expect(result).toHaveLength(29)
    expect(result[0]).toBe('2024-02-01')
    expect(result[28]).toBe('2024-02-29')
  })

  it('handles a full month range for February in a non-leap year', () => {
    const result = datesInRange('2023-02-01', '2023-02-28')
    expect(result).toHaveLength(28)
    expect(result[27]).toBe('2023-02-28')
  })

  it('crosses a year boundary', () => {
    const result = datesInRange('2024-12-30', '2025-01-02')
    expect(result).toEqual(['2024-12-30', '2024-12-31', '2025-01-01', '2025-01-02'])
  })
})
