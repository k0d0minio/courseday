export type DailyBriefCovers = {
  breakfast: number;
  activities: number;
  reservations: number;
};

export type DailyBriefAllergenRollupEntry = {
  code: string;
  inActivities: number;
  inReservations: number;
  inBreakfast: number;
};

export type DailyBriefContent = {
  headline: string;
  summary: string;
  covers: DailyBriefCovers;
  vipNotes: string[];
  allergenRollup: DailyBriefAllergenRollupEntry[];
  risks: string[];
  suggestedActions: string[];
};

export type DailyBriefRecord = {
  id: string;
  content: DailyBriefContent;
  generated_at: string;
  model: string;
  prompt_version: string;
};
