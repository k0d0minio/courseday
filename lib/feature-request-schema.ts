import { z } from 'zod';

export const featureRequestSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required.')
    .max(100, 'Title must be 100 characters or fewer.'),
  description: z
    .string()
    .max(1000, 'Description must be 1000 characters or fewer.')
    .optional(),
});

export type FeatureRequestFormData = z.infer<typeof featureRequestSchema>;
