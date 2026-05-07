'use server'

import { cache } from 'react'
import { createTenantClient } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { getUserRole, requireEditor } from '@/lib/membership'
import { venueTypeSchema } from '@/lib/venue-type-schema'
import type { VenueTypeFormData } from '@/lib/venue-type-schema'
import type { ActionResponse } from '@/types/actions'
import type { VenueType } from '@/types/index'

const fetchAllVenueTypes = cache(async (): Promise<ActionResponse<VenueType[]>> => {
  const tenantId = await getTenantId()
  const role = await getUserRole(tenantId)
  if (!role) return { success: false, error: 'Not authorized.' }

  const { supabase } = await createTenantClient()
  const { data, error } = await supabase
    .from('venue_type')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name')

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as VenueType[] }
})

export async function getAllVenueTypes(): Promise<ActionResponse<VenueType[]>> {
  return fetchAllVenueTypes()
}

export async function createVenueType(raw: VenueTypeFormData): Promise<ActionResponse<VenueType>> {
  const parsed = venueTypeSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const tenantId = await getTenantId()
  await requireEditor(tenantId)

  const { supabase } = await createTenantClient()
  const { data, error } = await supabase
    .from('venue_type')
    .insert({
      tenant_id: tenantId,
      name: parsed.data.name.trim(),
    })
    .select()
    .single()

  if (error) {
    const isDupe = error.code === '23505'
    return {
      success: false,
      error: isDupe ? 'A venue type with that name already exists.' : error.message,
    }
  }

  return { success: true, data: data as VenueType }
}

export async function updateVenueType(
  id: string,
  raw: VenueTypeFormData
): Promise<ActionResponse<VenueType>> {
  const parsed = venueTypeSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const tenantId = await getTenantId()
  await requireEditor(tenantId)

  const { supabase } = await createTenantClient()
  const { data, error } = await supabase
    .from('venue_type')
    .update({
      name: parsed.data.name.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) {
    const isDupe = error.code === '23505'
    return {
      success: false,
      error: isDupe ? 'A venue type with that name already exists.' : error.message,
    }
  }

  return { success: true, data: data as VenueType }
}

export async function deleteVenueType(id: string): Promise<ActionResponse> {
  const tenantId = await getTenantId()
  await requireEditor(tenantId)

  const { supabase } = await createTenantClient()

  const { error } = await supabase
    .from('venue_type')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) return { success: false, error: error.message }
  return { success: true, data: undefined }
}
