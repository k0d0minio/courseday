import { z } from 'zod';
import { ALLERGEN_CODES } from '@/lib/allergens';

export const reservationSchema = z.object({
  dayId: z.string().uuid('Day ID is required'),
  guestName: z.string().max(200).optional(),
  guestCount: z.number().int().min(1).max(9999).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  notes: z.string().max(2000).optional(),
  tableBreakdown: z.array(z.number().int().min(1).max(999)).max(100).optional(),
  allergens: z.array(z.enum(ALLERGEN_CODES)).max(ALLERGEN_CODES.length).optional(),
});

export type ReservationFormData = z.infer<typeof reservationSchema>;
