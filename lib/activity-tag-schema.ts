import { z } from 'zod';

export const activityTagSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
});

export type ActivityTagFormData = z.infer<typeof activityTagSchema>;
