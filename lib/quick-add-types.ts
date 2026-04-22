import type { AllergenCode } from '@/lib/allergens';

export const QUICK_ADD_GAP_ACTIVITY = ['title', 'startTime', 'expectedCovers'] as const;
export const QUICK_ADD_GAP_RESERVATION = ['guestName', 'guestCount', 'startTime'] as const;
export const QUICK_ADD_GAP_BREAKFAST = ['groupName', 'guestCount', 'startTime'] as const;

export type QuickAddGapId =
  | (typeof QUICK_ADD_GAP_ACTIVITY)[number]
  | (typeof QUICK_ADD_GAP_RESERVATION)[number]
  | (typeof QUICK_ADD_GAP_BREAKFAST)[number];

export type QuickAddActivityFormDefaults = {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  expectedCovers: string;
  notes: string;
};

export type QuickAddReservationFormDefaults = {
  guestName: string;
  guestCount: string;
  startTime: string;
  endTime: string;
  notes: string;
};

export type QuickAddBreakfastFormDefaults = {
  groupName: string;
  guestCount: string;
  startTime: string;
  notes: string;
};

export type QuickAddParseData =
  | {
      kind: 'activity';
      dayId: string;
      contextDate: string;
      dateAmbiguous: boolean;
      defaults: QuickAddActivityFormDefaults;
      allergens: AllergenCode[];
      gapFieldKeys: readonly QuickAddGapId[];
      modelFilledFieldKeys: string[];
    }
  | {
      kind: 'reservation';
      dayId: string;
      contextDate: string;
      dateAmbiguous: boolean;
      defaults: QuickAddReservationFormDefaults;
      tableBreakdown: number[];
      allergens: AllergenCode[];
      gapFieldKeys: readonly QuickAddGapId[];
      modelFilledFieldKeys: string[];
    }
  | {
      kind: 'breakfast';
      dayId: string;
      contextDate: string;
      dateAmbiguous: boolean;
      defaults: QuickAddBreakfastFormDefaults;
      tableBreakdown: number[];
      allergens: AllergenCode[];
      gapFieldKeys: readonly QuickAddGapId[];
      modelFilledFieldKeys: string[];
    };
