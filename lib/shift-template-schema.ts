import { z } from 'zod'

export const shiftTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  role: z.string().max(200).optional().or(z.literal('')),
  start_time: z.string().max(20).optional().or(z.literal('')),
  end_time: z.string().max(20).optional().or(z.literal('')),
  default_user_id: z.string().uuid().optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
})

export type ShiftTemplateFormData = z.infer<typeof shiftTemplateSchema>

export function makeShiftTemplateSchema(t: (key: string) => string) {
  return z.object({
    name: z.string().min(1, t('nameRequired')).max(200),
    role: z.string().max(200).optional().or(z.literal('')),
    start_time: z.string().max(20).optional().or(z.literal('')),
    end_time: z.string().max(20).optional().or(z.literal('')),
    default_user_id: z.string().uuid().optional().or(z.literal('')),
    notes: z.string().max(2000).optional().or(z.literal('')),
  })
}
