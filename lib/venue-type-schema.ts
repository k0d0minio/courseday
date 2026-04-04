import { z } from 'zod';

export const venueTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().optional().or(z.literal('')),
});

export type VenueTypeFormData = z.infer<typeof venueTypeSchema>;
