import { z } from 'zod'

export const venueTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
})

export type VenueTypeFormData = z.infer<typeof venueTypeSchema>

export function makeVenueTypeSchema(t: (key: string) => string) {
  return z.object({
    name: z.string().min(1, t('nameRequired')).max(200),
  })
}
