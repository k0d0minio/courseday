import { z } from 'zod'

const phoneRegex = /^\+?[1-9]\d{7,14}$/

export const memberEditSchema = z.object({
  first_name: z.string().max(100),
  last_name: z.string().max(100),
  phone: z
    .string()
    .max(20)
    .refine((v) => v === '' || phoneRegex.test(v.replace(/\s/g, '')), {
      message: 'Enter a valid phone number (e.g. +33612345678)',
    }),
  job_title: z.string().max(100),
  hourly_rate: z.preprocess((v) => {
    if (v === '' || v === null || v === undefined) return null
    const n = parseFloat(String(v))
    return isNaN(n) ? null : n
  }, z.number().nonnegative().nullable()),
  currency: z
    .string()
    .max(3)
    .refine((v) => v === '' || /^[A-Z]{3}$/.test(v.toUpperCase()), {
      message: 'Currency must be a 3-letter ISO code (e.g. EUR)',
    }),
})

export type MemberEditInput = z.infer<typeof memberEditSchema>

export const scheduleRowSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().min(1),
  end_time: z.string().nullable(),
})

export type ScheduleRow = z.infer<typeof scheduleRowSchema>
