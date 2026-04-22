import { z } from 'zod';

export const staffMemberSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  role: z.string().max(200).optional().or(z.literal('')),
  active: z.boolean().optional(),
});

export type StaffMemberFormData = z.infer<typeof staffMemberSchema>;
