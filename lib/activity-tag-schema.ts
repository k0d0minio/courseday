import { z } from 'zod';

export const activityTagSchema = z.object({
  name: z.string().min(1, 'Name is required'),
});

export type ActivityTagFormData = z.infer<typeof activityTagSchema>;
