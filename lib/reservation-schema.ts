import { z } from 'zod';

export const reservationSchema = z.object({
  dayId: z.string().uuid('Day ID is required'),
  guestName: z.string().optional(),
  guestEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  guestPhone: z.string().optional(),
  guestCount: z.number().int().min(1).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  notes: z.string().optional(),
  hotelBookingId: z.string().uuid().optional().nullable(),
  programItemId: z.string().uuid().optional().nullable(),
  tableIndex: z.number().int().min(0).optional().nullable(),
});

export type ReservationFormData = z.infer<typeof reservationSchema>;
