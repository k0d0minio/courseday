import { after } from 'next/server'
import { streamObject } from 'ai'
import { gateway } from '@ai-sdk/gateway'
import { getTenantId } from '@/lib/tenant'
import { getUserRole } from '@/lib/membership'
import { getUser } from '@/app/actions/auth'
import { quickAddRateLimit } from '@/lib/rate-limit'
import { logAiCall } from '@/lib/ai-call-log'
import { quickAddLlmSchema } from '@/lib/quick-add-build'
import { QUICK_ADD_MODEL_ID } from '@/lib/quick-add-generate'
import { QUICK_ADD_SYSTEM, buildUserPrompt } from '@/lib/quick-add-prompt'

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

function hasGatewayAuth(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN)
}

function jsonError(error: string, status: number): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function POST(request: Request) {
  let tenantId: string
  try {
    tenantId = await getTenantId()
  } catch {
    return jsonError('Tenant context required', 400)
  }

  const user = await getUser()
  if (!user) return jsonError('Unauthorized', 401)
  const role = await getUserRole(tenantId)
  if (role !== 'editor') return jsonError('Forbidden', 403)

  let body: { input?: string; contextDate?: string }
  try {
    body = (await request.json()) as { input?: string; contextDate?: string }
  } catch {
    return jsonError('Invalid JSON', 400)
  }

  const text = (body.input ?? '').trim()
  const contextDate = body.contextDate
  if (!text || text.length < 2) return jsonError('Text too short.', 400)
  if (!contextDate || typeof contextDate !== 'string') return jsonError('Missing contextDate', 400)

  if (!hasGatewayAuth()) {
    return jsonError('AI is not configured (set AI_GATEWAY_API_KEY or run `vercel env pull`).', 500)
  }

  const { success: allowed } = await quickAddRateLimit(user.id)
  if (!allowed) {
    const nowMs = Date.now()
    const secsRemaining = Math.ceil(((Math.floor(nowMs / 60000) + 1) * 60000 - nowMs) / 1000)
    return jsonError(`Too many quick add attempts. Try again in ${secsRemaining}s.`, 429)
  }

  // dayId is not needed for the prompt (buildUserPrompt ignores it). The
  // client resolves dayId separately via ensureDayExists, so we pass an
  // empty string here.
  const prompt = buildUserPrompt(text, '', contextDate)
  const startedAt = Date.now()

  const result = streamObject({
    model: gateway(QUICK_ADD_MODEL_ID),
    schema: quickAddLlmSchema,
    system: QUICK_ADD_SYSTEM,
    prompt,
    maxOutputTokens: 2048,
  })

  // Log usage after the stream finishes — does not block the response.
  after(async () => {
    try {
      await result.object
      const usage = (await (result as unknown as { usage?: Promise<unknown> }).usage) as
        | AiUsage
        | undefined
      const { promptTokens, completionTokens } = readUsage(usage)
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
      console.error('[quick-add] streamObject failed:', e)
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
    }
  })

  return result.toTextStreamResponse()
}
