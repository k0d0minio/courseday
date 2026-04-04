import { z } from 'zod';

export const hotelBookingSchema = z.object({
  guestName: z.string().min(1, 'Guest name is required'),
  guestCount: z.number().int().min(1, 'Guest count must be at least 1'),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid check-in date'),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid check-out date'),
  isTourOperator: z.boolean().default(false),
  notes: z.string().optional(),
}).refine((d) => d.checkIn < d.checkOut, {
  message: 'Check-out must be after check-in',
  path: ['checkOut'],
});

export type HotelBookingFormData = z.infer<typeof hotelBookingSchema>;
