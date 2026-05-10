import { after } from 'next/server'
import { streamObject } from 'ai'
import { gateway } from '@ai-sdk/gateway'
import { createTenantClient } from '@/lib/supabase-server'
import { getTenantFromHeaders } from '@/lib/tenant'
import { getUserRole } from '@/lib/membership'
import { getUser } from '@/app/actions/auth'
import { isFeatureEnabled } from '@/app/actions/feature-flags'
import { dailyBriefRateLimit } from '@/lib/rate-limit'
import { ensureDayExists } from '@/app/actions/days'
import {
  getProgramItemsForDay,
  getReservationsForDay,
  getBreakfastConfigsForDay,
  getDayNotesForDay,
} from '@/app/[tenant]/day/[date]/queries'
import { getWeatherForDay } from '@/app/actions/weather'
import { dailyBriefContentSchema } from '@/lib/daily-brief-schema'
import {
  buildCovers,
  buildAllergenRollup,
  llmPayload,
  buildBriefSystem,
  DAILY_BRIEF_MODEL_ID,
  PROMPT_VERSION,
} from '@/lib/daily-brief-generate'

export async function POST(request: Request) {
  let tenantId: string
  try {
    const tenant = await getTenantFromHeaders()
    tenantId = tenant.id
  } catch {
    return new Response('Tenant context required', { status: 400 })
  }

  if (!(await isFeatureEnabled(tenantId, 'daily_brief'))) {
    return new Response(JSON.stringify({ error: 'Feature disabled' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const user = await getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })
  const role = await getUserRole(tenantId)
  if (role !== 'editor') return new Response('Forbidden', { status: 403 })

  let body: { dateIso?: string }
  try {
    body = (await request.json()) as { dateIso?: string }
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }
  const { dateIso } = body
  if (!dateIso || typeof dateIso !== 'string') {
    return new Response('Missing dateIso', { status: 400 })
  }

  const rl = await dailyBriefRateLimit(tenantId, dateIso)
  if (!rl.success) {
    return new Response(JSON.stringify({ error: 'Rate limit reached. Try again tomorrow.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const dayResult = await ensureDayExists(dateIso)
  if (!dayResult.success) return new Response(dayResult.error, { status: 500 })
  const dayId = dayResult.data.id

  const { supabase: sbForTenant } = await createTenantClient()
  const { data: tenantRow } = await sbForTenant
    .from('tenants')
    .select('language')
    .eq('id', tenantId)
    .single()
  const language = tenantRow?.language ?? 'en'

  const [activities, reservations, breakfasts, dayNotes, weather] = await Promise.all([
    getProgramItemsForDay(tenantId, dayId),
    getReservationsForDay(tenantId, dayId),
    getBreakfastConfigsForDay(tenantId, dayId),
    getDayNotesForDay(tenantId, dayId),
    getWeatherForDay(dateIso),
  ])

  const covers = buildCovers(activities, reservations, breakfasts)
  const allergenRollup = buildAllergenRollup(activities, reservations, breakfasts)
  const payload = llmPayload({
    dateIso,
    weather,
    activities,
    reservations,
    breakfasts,
    dayNotes,
    covers,
    allergenRollup,
  })

  const result = streamObject({
    model: gateway(DAILY_BRIEF_MODEL_ID),
    schema: dailyBriefContentSchema,
    system: buildBriefSystem(language),
    prompt: `Produce a daily briefing from this JSON. The covers and allergenRollup values in the input are authoritative — echo them back verbatim:\n${JSON.stringify(payload)}`,
    maxOutputTokens: 2048,
  })

  // Persist the final validated object after the stream completes.
  // `after()` runs after the streaming response is fully sent to the client.
  after(async () => {
    try {
      const streamed = await result.object
      // Override LLM-produced covers/allergenRollup with deterministically computed values
      const content = { ...streamed, covers, allergenRollup }
      const { supabase } = await createTenantClient()
      const row: Record<string, unknown> = {
        tenant_id: tenantId,
        day_id: dayId,
        content,
        language,
        generated_at: new Date().toISOString(),
        model: DAILY_BRIEF_MODEL_ID,
        prompt_version: PROMPT_VERSION,
        generated_by: user.id,
      }
      await supabase.from('daily_brief').upsert(row as never, { onConflict: 'tenant_id,day_id' })
    } catch {
      // best-effort persist; client refreshes on finish
    }
  })

  return result.toTextStreamResponse()
}
