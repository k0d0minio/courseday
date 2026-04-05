import { z } from 'zod';

export const pocSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: z
    .string()
    .email('Invalid email address')
    .max(254)
    .optional()
    .or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
});

export type PocFormData = z.infer<typeof pocSchema>;
