import { z } from 'zod';

export const pocSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z
    .string()
    .email('Invalid email address')
    .optional()
    .or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
});

export type PocFormData = z.infer<typeof pocSchema>;
