'use server'

import { Resend } from 'resend'
import { createTenantClient, createSupabaseServiceClient } from '@/lib/supabase-server'
import {
  featureRequestSchema,
  type FeatureRequestFormData,
  type FeatureRequestPriority,
} from '@/lib/feature-request-schema'
import { getTenantId, getTenantFromHeaders } from '@/lib/tenant'
import { getUserRole } from '@/lib/membership'
import { getUser } from '@/app/actions/auth'
import { getSuperadminStatus } from '@/lib/superadmin'
import type { ActionResponse } from '@/types/actions'

export type FeatureRequestStatus = 'pending' | 'reviewing' | 'accepted' | 'rejected' | 'shipped'

export interface FeatureRequest {
  id: string
  tenant_id: string
  user_id: string
  title: string
  description: string | null
  priority: FeatureRequestPriority | null
  workaround: string | null
  expected_outcome: string | null
  status: FeatureRequestStatus
  created_at: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const PRIORITY_LABELS: Record<FeatureRequestPriority, string> = {
  nice_to_have: 'Nice to have',
  would_help: 'Would help',
  blocking: 'Blocking',
}

async function sendFeatureRequestEmail(
  request: FeatureRequest,
  tenantSlug: string,
  tenantName: string,
  requesterEmail: string
) {
  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.SYSTEM_OWNER_EMAIL
  if (!apiKey || !to) {
    console.warn('Feature request email skipped: RESEND_API_KEY or SYSTEM_OWNER_EMAIL not set.')
    return
  }

  const from = process.env.RESEND_FROM_EMAIL ?? 'Courseday <onboarding@resend.dev>'
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000'
  const adminUrl = `https://${rootDomain}/admin`

  const rows: Array<[string, string]> = [
    ['Tenant', `${escapeHtml(tenantName)} (${escapeHtml(tenantSlug)})`],
    ['Requester', escapeHtml(requesterEmail)],
    ['Title', escapeHtml(request.title)],
  ]
  if (request.description) rows.push(['Description', escapeHtml(request.description)])
  if (request.priority) rows.push(['Priority', escapeHtml(PRIORITY_LABELS[request.priority])])
  if (request.workaround) rows.push(['Current workaround', escapeHtml(request.workaround)])
  if (request.expected_outcome)
    rows.push(['What good looks like', escapeHtml(request.expected_outcome)])

  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px;font-weight:600;white-space:nowrap;vertical-align:top">${label}</td><td style="padding:6px 12px">${value}</td></tr>`
    )
    .join('')

  const html = `
    <h2 style="margin-bottom:16px">New feature request</h2>
    <table style="border-collapse:collapse;font-size:14px">
      ${tableRows}
    </table>
    <p style="margin-top:24px;font-size:13px">
      <a href="${adminUrl}">View in superadmin dashboard</a>
    </p>
  `

  try {
    const resend = new Resend(apiKey)
    await resend.emails.send({
      from,
      to,
      subject: `Feature request — ${request.title}`,
      html,
    })
  } catch (err) {
    console.error('Failed to send feature request email:', err)
  }
}

export async function createFeatureRequest(
  raw: FeatureRequestFormData
): Promise<ActionResponse<FeatureRequest>> {
  const parsed = featureRequestSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]!.message }
  }

  const tenant = await getTenantFromHeaders()
  const role = await getUserRole(tenant.id)
  if (!role) return { success: false, error: 'Not authorized.' }

  const user = await getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  const { supabase } = await createTenantClient()
  const { data, error } = await supabase
    .from('feature_requests')
    .insert({
      tenant_id: tenant.id,
      user_id: user.id,
      title: parsed.data.title.trim(),
      description: parsed.data.description?.trim() || null,
      priority: parsed.data.priority ?? null,
      workaround: parsed.data.workaround?.trim() || null,
      expected_outcome: parsed.data.expected_outcome?.trim() || null,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  const inserted = data as FeatureRequest

  // Fetch tenant name for email — best-effort, never blocks the response
  let tenantName = tenant.slug
  try {
    const serviceClient = createSupabaseServiceClient()
    const { data: tenantRow } = await serviceClient
      .from('tenants')
      .select('name')
      .eq('id', tenant.id)
      .single()
    if (tenantRow?.name) tenantName = tenantRow.name
  } catch {
    // ignore
  }

  await sendFeatureRequestEmail(inserted, tenant.slug, tenantName, user.email ?? '')

  return { success: true, data: inserted }
}

export async function getTenantFeatureRequests(): Promise<ActionResponse<FeatureRequest[]>> {
  const tenantId = await getTenantId()
  const role = await getUserRole(tenantId)
  if (!role) return { success: false, error: 'Not authorized.' }

  const { supabase } = await createTenantClient()
  const { data, error } = await supabase
    .from('feature_requests')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) return { success: false, error: error.message }
  return { success: true, data: (data ?? []) as FeatureRequest[] }
}

export async function getAllFeatureRequests(): Promise<ActionResponse<FeatureRequest[]>> {
  const ok = await getSuperadminStatus()
  if (!ok) return { success: false, error: 'Not authorized.' }

  const serviceClient = createSupabaseServiceClient()
  const { data, error } = await serviceClient
    .from('feature_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return { success: false, error: error.message }
  return { success: true, data: (data ?? []) as FeatureRequest[] }
}

export async function updateFeatureRequestStatus(
  id: string,
  status: FeatureRequestStatus
): Promise<ActionResponse> {
  const ok = await getSuperadminStatus()
  if (!ok) return { success: false, error: 'Not authorized.' }

  const validStatuses: FeatureRequestStatus[] = [
    'pending',
    'reviewing',
    'accepted',
    'rejected',
    'shipped',
  ]
  if (!validStatuses.includes(status)) {
    return { success: false, error: 'Invalid status.' }
  }

  const serviceClient = createSupabaseServiceClient()
  const { error } = await serviceClient
    .from('feature_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  return { success: true, data: undefined }
}
