import { z } from 'zod'

export const shiftSchema = z.object({
  user_id: z.string().uuid('Select a team member'),
  role: z.string().max(200).optional().or(z.literal('')),
  start_time: z.string().max(20).optional().or(z.literal('')),
  end_time: z.string().max(20).optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
})

export type ShiftFormData = z.infer<typeof shiftSchema>
