import { z } from 'zod';

export const createBreakfastSchema = z.object({
  hotelBookingId: z.string().uuid('Hotel booking ID is required'),
  breakfastDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
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
