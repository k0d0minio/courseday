'use server'

import { createTenantClient } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { requireEditor } from '@/lib/membership'
import { isFeatureEnabled } from '@/app/actions/feature-flags'
import type { ActionResponse } from '@/types/actions'

export interface PayRateData {
  hourly_rate: number | null
  currency: string | null
}

export async function updateMemberPayRate(
  membershipId: string,
  data: PayRateData
): Promise<ActionResponse> {
  const tenantId = await getTenantId()
  await requireEditor(tenantId)

  if (!(await isFeatureEnabled(tenantId, 'staff_schedule'))) {
    return { success: false, error: 'Staff scheduling is disabled.' }
  }

  if (data.currency !== null && !/^[A-Z]{3}$/.test(data.currency)) {
    return { success: false, error: 'Currency must be a 3-letter ISO code (e.g. EUR).' }
  }

  const { supabase } = await createTenantClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('memberships') as any)
    .update({
      hourly_rate: data.hourly_rate,
      currency: data.currency,
    })
    .eq('id', membershipId)
    .eq('tenant_id', tenantId)

  if (error) return { success: false, error: error.message }
  return { success: true, data: undefined }
}
