import { z } from 'zod';

export const createBreakfastSchema = z.object({
  dayId: z.string().uuid('Day ID is required'),
  groupName: z.string().max(200).optional(),
  guestCount: z.number().int().min(1).max(9999).optional(),
  tableBreakdown: z.array(z.number().int().min(1).max(999)).max(100).optional(),
  startTime: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export const updateBreakfastSchema = z.object({
  groupName: z.string().max(200).optional(),
  guestCount: z.number().int().min(1).max(9999).optional(),
  tableBreakdown: z.array(z.number().int().min(1).max(999)).max(100).optional(),
  startTime: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export type CreateBreakfastFormData = z.infer<typeof createBreakfastSchema>;
export type UpdateBreakfastFormData = z.infer<typeof updateBreakfastSchema>;
