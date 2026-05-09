import { describe, it, expect } from 'vitest'
import { recommendStaffCount } from './staffing-forecast'

describe('recommendStaffCount', () => {
  it('empty input returns 0', () => {
    expect(
      recommendStaffCount({ activitiesCovers: 0, reservationsCovers: 0, breakfastCovers: 0 })
    ).toMatchObject({ recommended: 0 })
  })

  it('all zeros returns 0', () => {
    expect(
      recommendStaffCount({ activitiesCovers: 0, reservationsCovers: 0, breakfastCovers: 0 })
    ).toMatchObject({ recommended: 0 })
  })

  it('1 cover returns 1', () => {
    expect(
      recommendStaffCount({ activitiesCovers: 1, reservationsCovers: 0, breakfastCovers: 0 })
    ).toMatchObject({ recommended: 1 })
  })

  it('25 covers returns 1', () => {
    expect(
      recommendStaffCount({ activitiesCovers: 25, reservationsCovers: 0, breakfastCovers: 0 })
    ).toMatchObject({ recommended: 1 })
  })

  it('26 covers returns 2', () => {
    expect(
      recommendStaffCount({ activitiesCovers: 26, reservationsCovers: 0, breakfastCovers: 0 })
    ).toMatchObject({ recommended: 2 })
  })

  it('mixed sources sum correctly', () => {
    const result = recommendStaffCount({
      activitiesCovers: 10,
      reservationsCovers: 10,
      breakfastCovers: 10,
    })
    // total = 30 → ceil(30/25) = 2
    expect(result).toMatchObject({ recommended: 2 })
    expect(result.breakdown).toHaveLength(3)
  })
})
