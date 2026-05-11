import { z } from 'zod'

export const FEATURE_REQUEST_PRIORITY = ['nice_to_have', 'would_help', 'blocking'] as const
export type FeatureRequestPriority = (typeof FEATURE_REQUEST_PRIORITY)[number]

export const featureRequestSchema = z.object({
  title: z.string().min(1, 'Title is required.').max(100, 'Title must be 100 characters or fewer.'),
  description: z.string().max(1000, 'Description must be 1000 characters or fewer.').optional(),
  priority: z.enum(FEATURE_REQUEST_PRIORITY).optional(),
  workaround: z.string().max(1000, 'Workaround must be 1000 characters or fewer.').optional(),
  expected_outcome: z
    .string()
    .max(1000, 'Expected outcome must be 1000 characters or fewer.')
    .optional(),
})

export type FeatureRequestFormData = z.infer<typeof featureRequestSchema>

export function makeFeatureRequestSchema(t: (key: string) => string) {
  return z.object({
    title: z.string().min(1, t('titleRequired')).max(100, t('titleTooLong')),
    description: z.string().max(1000, t('descriptionTooLong')).optional(),
    priority: z.enum(FEATURE_REQUEST_PRIORITY).optional(),
    workaround: z.string().max(1000, t('workaroundTooLong')).optional(),
    expected_outcome: z.string().max(1000, t('expectedOutcomeTooLong')).optional(),
  })
}
