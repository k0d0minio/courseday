import { generateObject } from 'ai'
import { gateway } from '@ai-sdk/gateway'
import type { z } from 'zod'
import { logAiCall } from '@/lib/ai-call-log'

import { PROMPT_VERSION, QUICK_ADD_SYSTEM, buildUserPrompt } from './quick-add-prompt'
import { buildDataFromLlm, quickAddLlmSchema } from '@/lib/quick-add-build'
import type { QuickAddParseData } from '@/lib/quick-add-types'

export const QUICK_ADD_MODEL_ID = 'anthropic/claude-haiku-4-5' as const

function hasGatewayAuth(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN)
}

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

export type GenerateQuickAddError = { success: false; error: string }
export type GenerateQuickAddResult =
  | { success: true; items: QuickAddParseData[]; promptVersion: string }
  | GenerateQuickAddError

type AiUsage = {
  promptTokens?: number | null
  completionTokens?: number | null
  inputTokens?: number | null
  outputTokens?: number | null
}

function readUsage(usage: AiUsage | undefined): {
  promptTokens: number | null
  completionTokens: number | null
} {
  if (!usage) return { promptTokens: null, completionTokens: null }
  return {
    promptTokens: usage.promptTokens ?? usage.inputTokens ?? null,
    completionTokens: usage.completionTokens ?? usage.outputTokens ?? null,
  }
}

export async function generateQuickAddParse(
  userText: string,
  dayId: string,
  contextDate: string,
  tenantId: string | null = null
): Promise<GenerateQuickAddResult> {
  const t = userText.trim()
  if (t.length < 2) {
    return { success: false, error: 'Text too short.' }
  }

  if (!hasGatewayAuth()) {
    return {
      success: false,
      error: 'AI is not configured (set AI_GATEWAY_API_KEY or run `vercel env pull`).',
    }
  }

  const prompt = buildUserPrompt(t, dayId, contextDate)

  let out: z.infer<typeof quickAddLlmSchema>
  const startedAt = Date.now()
  try {
    const res = await generateObject({
      model: gateway(QUICK_ADD_MODEL_ID),
      schema: quickAddLlmSchema,
      system: QUICK_ADD_SYSTEM,
      prompt,
      maxOutputTokens: 2048,
    })
    out = res.object
    const { promptTokens, completionTokens } = readUsage(res.usage as AiUsage | undefined)
    void logAiCall({
      tenantId,
      feature: 'quick_add',
      model: QUICK_ADD_MODEL_ID,
      promptTokens,
      completionTokens,
      durationMs: Date.now() - startedAt,
      status: 'ok',
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Generation failed.'
    console.error('[quick-add] generateObject failed:', e)
    void logAiCall({
      tenantId,
      feature: 'quick_add',
      model: QUICK_ADD_MODEL_ID,
      promptTokens: null,
      completionTokens: null,
      durationMs: Date.now() - startedAt,
      status: 'error',
      error: msg,
    })
    const short = msg.length > 200 ? msg.slice(0, 200) : msg
    return { success: false, error: `Quick add AI error: ${short}` }
  }

  const items = out.items.map((item) => buildDataFromLlm(item, dayId, contextDate))
  return { success: true, items, promptVersion: PROMPT_VERSION }
}
