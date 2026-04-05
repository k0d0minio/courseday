import { z } from 'zod';

export const reservationSchema = z.object({
  dayId: z.string().uuid('Day ID is required'),
  guestName: z.string().optional(),
  guestCount: z.number().int().min(1).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  notes: z.string().optional(),
  tableBreakdown: z.array(z.number().int().min(1)).optional(),
});

export type ReservationFormData = z.infer<typeof reservationSchema>;
