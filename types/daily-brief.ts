export type DailyBriefCovers = {
  breakfast: number
  activities: number
  reservations: number
}

export type DailyBriefAllergenRollupEntry = {
  code: string
  inActivities: number
  inReservations: number
  inBreakfast: number
}

export const REGENERATABLE_SECTIONS = ['vipNotes', 'risks', 'suggestedActions'] as const
export type RegenerableSection = (typeof REGENERATABLE_SECTIONS)[number]

export type DailyBriefSectionTimestamps = {
  vipNotes?: string | undefined
  risks?: string | undefined
  suggestedActions?: string | undefined
}

export type DailyBriefContent = {
  headline: string
  summary: string
  covers: DailyBriefCovers
  vipNotes: string[]
  allergenRollup: DailyBriefAllergenRollupEntry[]
  risks: string[]
  suggestedActions: string[]
  sectionTimestamps?: DailyBriefSectionTimestamps | undefined
}

export type DailyBriefRecord = {
  id: string
  content: DailyBriefContent
  generated_at: string
  model: string
  prompt_version: string
}
