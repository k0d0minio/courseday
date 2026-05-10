export const QUICK_ADD_MODEL_ID = 'anthropic/claude-haiku-4-5' as const

export { PROMPT_VERSION } from './quick-add-prompt'
export {
  buildDataFromLlm,
  quickAddLlmSchema,
  quickAddLlmItemSchema,
  mapAllergenHints,
  mapSynonymToCode,
  normalizeToTimeInput,
} from '@/lib/quick-add-build'
export type { QuickAddLlmItem, QuickAddLlmOutput } from '@/lib/quick-add-build'
export type {
  QuickAddActivityFormDefaults,
  QuickAddParseData,
  QuickAddReservationFormDefaults,
  QuickAddBreakfastFormDefaults,
  QuickAddGapId,
} from '@/lib/quick-add-types'
export {
  QUICK_ADD_GAP_ACTIVITY,
  QUICK_ADD_GAP_RESERVATION,
  QUICK_ADD_GAP_BREAKFAST,
} from '@/lib/quick-add-types'
