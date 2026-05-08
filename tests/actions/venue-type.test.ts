import { describe, it, expect } from 'vitest'
import { venueTypeSchema } from '@/lib/venue-type-schema'

describe('venueTypeSchema', () => {
  it('accepts a valid name', () => {
    const result = venueTypeSchema.safeParse({ name: 'Main Restaurant' })
    expect(result.success).toBe(true)
  })

  it('accepts name only', () => {
    const result = venueTypeSchema.safeParse({ name: 'Terrace' })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = venueTypeSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]!.message).toBe('Name is required')
  })

  it('rejects missing name', () => {
    const result = venueTypeSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('accepts name with special characters', () => {
    const result = venueTypeSchema.safeParse({ name: '19th Hole Bar & Grill' })
    expect(result.success).toBe(true)
  })
})
