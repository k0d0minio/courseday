import { describe, it, expect } from 'vitest'
import { recommendStaffCount } from '@/lib/staffing-forecast'

describe('recommendStaffCount', () => {
  it('returns 0 for empty input', () => {
    expect(
      recommendStaffCount({ activitiesCovers: 0, reservationsCovers: 0, breakfastCovers: 0 })
        .recommended
    ).toBe(0)
  })

  it('returns 0 for all zeros', () => {
    expect(
      recommendStaffCount({ activitiesCovers: 0, reservationsCovers: 0, breakfastCovers: 0 })
        .recommended
    ).toBe(0)
  })

  it('returns 1 for 1 cover', () => {
    expect(
      recommendStaffCount({ activitiesCovers: 1, reservationsCovers: 0, breakfastCovers: 0 })
        .recommended
    ).toBe(1)
  })

  it('returns 1 for 25 covers', () => {
    expect(
      recommendStaffCount({ activitiesCovers: 10, reservationsCovers: 10, breakfastCovers: 5 })
        .recommended
    ).toBe(1)
  })

  it('returns 2 for 26 covers', () => {
    expect(
      recommendStaffCount({ activitiesCovers: 10, reservationsCovers: 10, breakfastCovers: 6 })
        .recommended
    ).toBe(2)
  })

  it('sums mixed sources correctly', () => {
    const result = recommendStaffCount({
      activitiesCovers: 50,
      reservationsCovers: 25,
      breakfastCovers: 25,
    })
    expect(result.recommended).toBe(4)
    expect(result.breakdown).toEqual([
      { source: 'activities', count: 50 },
      { source: 'reservations', count: 25 },
      { source: 'breakfast', count: 25 },
    ])
  })
})
