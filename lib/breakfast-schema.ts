import { z } from 'zod';

export const createBreakfastSchema = z.object({
  dayId: z.string().uuid('Day ID is required'),
  groupName: z.string().optional(),
  tableBreakdown: z.string().optional(),
  startTime: z.string().optional(),
  notes: z.string().optional(),
});

export const updateBreakfastSchema = z.object({
  tableBreakdown: z.string().optional(),
  startTime: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateBreakfastFormData = z.infer<typeof createBreakfastSchema>;
export type UpdateBreakfastFormData = z.infer<typeof updateBreakfastSchema>;
