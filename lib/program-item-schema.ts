import { z } from 'zod';

export const programItemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: z.enum(['golf', 'event']),
  dayId: z.string().uuid('Day ID is required'),
  description: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  guestCount: z.number().int().min(0).optional(),
  capacity: z.number().int().min(0).optional(),
  venueTypeId: z.string().uuid().optional().nullable(),
  pocId: z.string().uuid().optional().nullable(),
  tableBreakdown: z.array(z.number().int().min(1)).optional().nullable(),
  isTourOperator: z.boolean().optional(),
  notes: z.string().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceFrequency: z
    .enum(['weekly', 'biweekly', 'monthly', 'yearly'])
    .optional()
    .nullable(),
});

export type ProgramItemFormData = z.infer<typeof programItemSchema>;
