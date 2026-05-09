'use server'

import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase-server'
import { getTenantFromHeaders } from '@/lib/tenant'
import { getUser } from '@/app/actions/auth'
import type { ActionResponse } from '@/types/actions'

function buildFeedUrl(slug: string, token: string): string {
  const domain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000'
  const protocol = domain.startsWith('localhost') ? 'http' : 'https'
  return `${protocol}://${domain}/api/calendar/${token}/shifts.ics`
}

export async function getOrCreateIcalToken(): Promise<
  ActionResponse<{ url: string; token: string }>
> {
  const user = await getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  const tenant = await getTenantFromHeaders()
  const supabase = await createSupabaseServerClient()

  const { data: membership, error } = await supabase
    .from('memberships')
    .select('id, ical_token')
    .eq('user_id', user.id)
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  if (error) return { success: false, error: error.message }
  if (!membership) return { success: false, error: 'Not a member of this tenant.' }

  if (membership.ical_token) {
    return {
      success: true,
      data: { token: membership.ical_token, url: buildFeedUrl(tenant.slug, membership.ical_token) },
    }
  }

  const token = crypto.randomUUID()
  const { error: updateError } = await supabase
    .from('memberships')
    .update({ ical_token: token, ical_token_created_at: new Date().toISOString() })
    .eq('id', membership.id)

  if (updateError) return { success: false, error: updateError.message }

  return { success: true, data: { token, url: buildFeedUrl(tenant.slug, token) } }
}

export async function rotateIcalToken(): Promise<ActionResponse<{ url: string; token: string }>> {
  const user = await getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  const tenant = await getTenantFromHeaders()
  const supabase = await createSupabaseServerClient()

  const { data: membership, error } = await supabase
    .from('memberships')
    .select('id')
    .eq('user_id', user.id)
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  if (error) return { success: false, error: error.message }
  if (!membership) return { success: false, error: 'Not a member of this tenant.' }

  const token = crypto.randomUUID()
  const { error: updateError } = await supabase
    .from('memberships')
    .update({ ical_token: token, ical_token_created_at: new Date().toISOString() })
    .eq('id', membership.id)

  if (updateError) return { success: false, error: updateError.message }

  return { success: true, data: { token, url: buildFeedUrl(tenant.slug, token) } }
}
