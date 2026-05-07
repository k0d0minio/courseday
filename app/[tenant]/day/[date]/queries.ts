import type { SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase-server'
import type { Database } from '@/types/supabase'
import type {
  Activity,
  Reservation,
  BreakfastConfiguration,
  ShiftAssignee,
  ShiftWithAssignee,
} from '@/types/index'
import type { DayNote } from '@/app/actions/day-notes'
import type { DailyBriefRecord } from '@/types/daily-brief'
import { z } from 'zod'

export type AppSupabaseClient = SupabaseClient<Database>

export async function getProgramItemsForDayWithClient(
  supabase: AppSupabaseClient,
  tenantId: string,
  dayId: string
): Promise<Activity[]> {
  const { data } = await supabase
    .from('activity')
    .select('*, point_of_contact(*), venue_type(*)')
    .eq('tenant_id', tenantId)
    .eq('day_id', dayId)
    .is('deleted_at', null)
    .order('start_time', { nullsFirst: true })
  return (data ?? []) as unknown as Activity[]
}

export async function getProgramItemsForDay(tenantId: string, dayId: string): Promise<Activity[]> {
  const supabase = await createSupabaseServerClient()
  return getProgramItemsForDayWithClient(supabase, tenantId, dayId)
}

export async function getReservationsForDayWithClient(
  supabase: AppSupabaseClient,
  tenantId: string,
  dayId: string
): Promise<Reservation[]> {
  const { data } = await supabase
    .from('reservation')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('day_id', dayId)
    .is('deleted_at', null)
    .order('start_time', { nullsFirst: true })
  return (data ?? []) as unknown as Reservation[]
}

export async function getReservationsForDay(
  tenantId: string,
  dayId: string
): Promise<Reservation[]> {
  const supabase = await createSupabaseServerClient()
  return getReservationsForDayWithClient(supabase, tenantId, dayId)
}

export async function getBreakfastConfigsForDayWithClient(
  supabase: AppSupabaseClient,
  tenantId: string,
  dayId: string
): Promise<BreakfastConfiguration[]> {
  const { data } = await supabase
    .from('breakfast_configuration')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('day_id', dayId)
    .is('deleted_at', null)
    .order('start_time', { nullsFirst: true })
  return (data ?? []) as unknown as BreakfastConfiguration[]
}

export async function getBreakfastConfigsForDay(
  tenantId: string,
  dayId: string
): Promise<BreakfastConfiguration[]> {
  const supabase = await createSupabaseServerClient()
  return getBreakfastConfigsForDayWithClient(supabase, tenantId, dayId)
}

export async function getDayNotesForDayWithClient(
  supabase: AppSupabaseClient,
  tenantId: string,
  dayId: string
): Promise<DayNote[]> {
  const { data } = await supabase
    .from('day_notes')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('day_id', dayId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
  return (data ?? []) as unknown as DayNote[]
}

export async function getDayNotesForDay(tenantId: string, dayId: string): Promise<DayNote[]> {
  const supabase = await createSupabaseServerClient()
  return getDayNotesForDayWithClient(supabase, tenantId, dayId)
}

const dailyBriefContentSchema = z.object({
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
})

export async function getDailyBriefForDayWithClient(
  supabase: AppSupabaseClient,
  tenantId: string,
  dayId: string
): Promise<DailyBriefRecord | null> {
  const { data } = await supabase
    .from('daily_brief')
    .select('id, content, generated_at, model, prompt_version')
    .eq('tenant_id', tenantId)
    .eq('day_id', dayId)
    .maybeSingle()

  if (!data) return null
  const parsed = dailyBriefContentSchema.safeParse(data.content)
  if (!parsed.success) return null

  return {
    id: data.id,
    content: parsed.data,
    generated_at: data.generated_at,
    model: data.model,
    prompt_version: data.prompt_version,
  }
}

export async function getDailyBriefForDay(
  tenantId: string,
  dayId: string
): Promise<DailyBriefRecord | null> {
  const supabase = await createSupabaseServerClient()
  return getDailyBriefForDayWithClient(supabase, tenantId, dayId)
}

/**
 * Returns all tenant members (assignees) keyed by user_id, with email and a
 * display name derived from the email local-part. Service-role lookup is
 * required because auth.users is not in the public schema.
 */
export async function getTenantAssignees(tenantId: string): Promise<Map<string, ShiftAssignee>> {
  const supabase = await createSupabaseServerClient()
  const { data: memberships } = await supabase
    .from('memberships')
    .select('user_id')
    .eq('tenant_id', tenantId)

  const userIds = (memberships ?? []).map((m) => m.user_id)
  if (userIds.length === 0) return new Map()

  const serviceClient = createSupabaseServiceClient()
  const lookups = await Promise.allSettled(
    userIds.map((uid) => serviceClient.auth.admin.getUserById(uid))
  )

  const map = new Map<string, ShiftAssignee>()
  userIds.forEach((uid, i) => {
    const settled = lookups[i]
    const email = settled.status === 'fulfilled' ? (settled.value.data.user?.email ?? '') : ''
    map.set(uid, {
      user_id: uid,
      email,
      display_name: email ? email.split('@')[0] : uid.slice(0, 8),
    })
  })
  return map
}

export async function getShiftsForDay(
  tenantId: string,
  dayId: string
): Promise<ShiftWithAssignee[]> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('shift')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('day_id', dayId)
    .order('start_time', { nullsFirst: true })

  const rows = (data ?? []) as unknown as Array<Omit<ShiftWithAssignee, 'assignee'>>
  if (rows.length === 0) return []

  const assignees = await getTenantAssignees(tenantId)
  return rows.map((s) => ({
    ...s,
    assignee: assignees.get(s.user_id) ?? {
      user_id: s.user_id,
      email: '',
      display_name: '—',
    },
  }))
}

export async function getTenantAssigneesList(tenantId: string): Promise<ShiftAssignee[]> {
  const map = await getTenantAssignees(tenantId)
  return [...map.values()].sort((a, b) => a.display_name.localeCompare(b.display_name))
}
