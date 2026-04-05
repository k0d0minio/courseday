import { z } from 'zod';

export const createBreakfastSchema = z.object({
  dayId: z.string().uuid('Day ID is required'),
  groupName: z.string().optional(),
  guestCount: z.number().int().min(1).optional(),
  tableBreakdown: z.array(z.number().int().min(1)).optional(),
  startTime: z.string().optional(),
  notes: z.string().optional(),
});

export const updateBreakfastSchema = z.object({
  groupName: z.string().optional(),
  guestCount: z.number().int().min(1).optional(),
  tableBreakdown: z.array(z.number().int().min(1)).optional(),
  startTime: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateBreakfastFormData = z.infer<typeof createBreakfastSchema>;
export type UpdateBreakfastFormData = z.infer<typeof updateBreakfastSchema>;
