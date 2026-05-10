import { z } from 'zod'

export const narrativeSchema = z.object({
  headline: z.string(),
  summary: z.string(),
  vipNotes: z.array(z.string()),
  risks: z.array(z.string()),
  suggestedActions: z.array(z.string()),
})

export const sectionItemsSchema = z.object({
  items: z.array(z.string()),
})

export const sectionTimestampsSchema = z
  .object({
    vipNotes: z.string().optional(),
    risks: z.string().optional(),
    suggestedActions: z.string().optional(),
  })
  .optional()

export const dailyBriefContentSchema = z.object({
  headline: z.string(),
  summary: z.string(),
  covers: z.object({
    breakfast: z.number(),
    activities: z.number(),
    reservations: z.number(),
  }),
  vipNotes: z.array(z.string()),
  allergenRollup: z.array(
    z.object({
      code: z.string(),
      inActivities: z.number(),
      inReservations: z.number(),
      inBreakfast: z.number(),
    })
  ),
  risks: z.array(z.string()),
  suggestedActions: z.array(z.string()),
  sectionTimestamps: sectionTimestampsSchema,
})
