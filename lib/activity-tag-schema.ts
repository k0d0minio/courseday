import { z } from 'zod'

export const activityTagSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
})

export type ActivityTagFormData = z.infer<typeof activityTagSchema>

export function makeActivityTagSchema(t: (key: string) => string) {
  return z.object({
    name: z.string().min(1, t('nameRequired')).max(100),
  })
}
