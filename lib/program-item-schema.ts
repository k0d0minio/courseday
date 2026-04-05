import { z } from 'zod';

export const activitySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  dayId: z.string().uuid('Day ID is required'),
  description: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  expectedCovers: z.number().int().min(0).optional(),
  venueTypeId: z.string().uuid().optional().nullable(),
  pocId: z.string().uuid().optional().nullable(),
  tagIds: z.array(z.string().uuid()).optional(),
  notes: z.string().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceFrequency: z
    .enum(['weekly', 'biweekly', 'monthly', 'yearly'])
    .optional()
    .nullable(),
});

export type ActivityFormData = z.infer<typeof activitySchema>;
