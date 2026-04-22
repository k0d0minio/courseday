import { z } from 'zod';
import { ALLERGEN_CODES } from '@/lib/allergens';

export const activitySchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  dayId: z.string().uuid('Day ID is required'),
  description: z.string().max(2000).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  expectedCovers: z.number().int().min(0).max(9999).optional(),
  venueTypeId: z.string().uuid().optional().nullable(),
  pocId: z.string().uuid().optional().nullable(),
  tagIds: z.array(z.string().uuid()).max(20).optional(),
  allergens: z.array(z.enum(ALLERGEN_CODES)).max(ALLERGEN_CODES.length).optional(),
  notes: z.string().max(2000).optional(),
  isRecurring: z.boolean().optional(),
  recurrenceFrequency: z
    .enum(['weekly', 'biweekly', 'monthly', 'yearly'])
    .optional()
    .nullable(),
});

export type ActivityFormData = z.infer<typeof activitySchema>;
