import { z } from 'zod';

export const staffRoleSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
});

export type StaffRoleFormData = z.infer<typeof staffRoleSchema>;
