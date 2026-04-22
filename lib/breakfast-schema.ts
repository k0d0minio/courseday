import { z } from 'zod';
import { ALLERGEN_CODES } from '@/lib/allergens';

export const createBreakfastSchema = z.object({
  dayId: z.string().uuid('Day ID is required'),
  groupName: z.string().max(200).optional(),
  guestCount: z.number().int().min(1).max(9999).optional(),
  tableBreakdown: z.array(z.number().int().min(1).max(999)).max(100).optional(),
  startTime: z.string().optional(),
  notes: z.string().max(2000).optional(),
  allergens: z.array(z.enum(ALLERGEN_CODES)).max(ALLERGEN_CODES.length).optional(),
});

export const updateBreakfastSchema = z.object({
  groupName: z.string().max(200).optional(),
  guestCount: z.number().int().min(1).max(9999).optional(),
  tableBreakdown: z.array(z.number().int().min(1).max(999)).max(100).optional(),
  startTime: z.string().optional(),
  notes: z.string().max(2000).optional(),
  allergens: z.array(z.enum(ALLERGEN_CODES)).max(ALLERGEN_CODES.length).optional(),
});

export type CreateBreakfastFormData = z.infer<typeof createBreakfastSchema>;
export type UpdateBreakfastFormData = z.infer<typeof updateBreakfastSchema>;
