import { createSupabaseServiceClient } from '@/lib/supabase-server'

export type AiCallFeature = 'quick_add' | 'daily_brief'
export type AiCallStatus = 'ok' | 'error'

export type LogAiCallArgs = {
  tenantId: string | null
  feature: AiCallFeature
  model: string
  promptTokens: number | null
  completionTokens: number | null
  durationMs: number
  status: AiCallStatus
  error?: string | null
}

type AiCallLogInsert = {
  tenant_id: string | null
  feature: AiCallFeature
  model: string
  prompt_tokens: number | null
  completion_tokens: number | null
  duration_ms: number
  status: AiCallStatus
  error_message: string | null
}

const ERROR_MAX = 500

/**
 * Record one LLM invocation. Never throws — telemetry failures must not break
 * the user-facing AI call. Token counts come from the AI SDK `usage` field on
 * generateObject / streamObject responses.
 *
 * No PII is stored: caller must NOT pass prompt content, completion content,
 * or user identifiers in `error`.
 */
export async function logAiCall(args: LogAiCallArgs): Promise<void> {
  try {
    const supabase = createSupabaseServiceClient()
    const row: AiCallLogInsert = {
      tenant_id: args.tenantId,
      feature: args.feature,
      model: args.model,
      prompt_tokens: args.promptTokens,
      completion_tokens: args.completionTokens,
      duration_ms: args.durationMs,
      status: args.status,
      error_message: args.error ? args.error.slice(0, ERROR_MAX) : null,
    }
    const { error } = await supabase.from('ai_call_log').insert(row)
    if (error) {
      console.error('[ai-call-log] insert failed:', error.message)
    }
  } catch (e) {
    console.error('[ai-call-log] unexpected error:', e)
  }
}
