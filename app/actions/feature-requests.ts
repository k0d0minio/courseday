'use server';

import { z } from 'zod';
import { createTenantClient, createSupabaseServiceClient } from '@/lib/supabase-server';
import { getTenantId } from '@/lib/tenant';
import { getUserRole } from '@/lib/membership';
import { getUser } from '@/app/actions/auth';
import { getSuperadminStatus } from '@/lib/superadmin';
import type { ActionResponse } from '@/types/actions';

export type FeatureRequestStatus = 'pending' | 'reviewing' | 'accepted' | 'rejected' | 'shipped';

export interface FeatureRequest {
  id: string;
  tenant_id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: FeatureRequestStatus;
  created_at: string;
}

export const featureRequestSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required.')
    .max(100, 'Title must be 100 characters or fewer.'),
  description: z
    .string()
    .max(1000, 'Description must be 1000 characters or fewer.')
    .optional(),
});

export type FeatureRequestFormData = z.infer<typeof featureRequestSchema>;

export async function createFeatureRequest(
  raw: FeatureRequestFormData
): Promise<ActionResponse<FeatureRequest>> {
  const parsed = featureRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const tenantId = await getTenantId();
  const role = await getUserRole(tenantId);
  if (!role) return { success: false, error: 'Not authorized.' };

  const user = await getUser();
  if (!user) return { success: false, error: 'Not authenticated.' };

  const { supabase } = await createTenantClient();
  const { data, error } = await supabase
    .from('feature_requests')
    .insert({
      tenant_id: tenantId,
      user_id: user.id,
      title: parsed.data.title.trim(),
      description: parsed.data.description?.trim() || null,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as FeatureRequest };
}

export async function getTenantFeatureRequests(): Promise<ActionResponse<FeatureRequest[]>> {
  const tenantId = await getTenantId();
  const role = await getUserRole(tenantId);
  if (!role) return { success: false, error: 'Not authorized.' };

  const { supabase } = await createTenantClient();
  const { data, error } = await supabase
    .from('feature_requests')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as FeatureRequest[] };
}

export async function getAllFeatureRequests(): Promise<ActionResponse<FeatureRequest[]>> {
  const ok = await getSuperadminStatus();
  if (!ok) return { success: false, error: 'Not authorized.' };

  const serviceClient = createSupabaseServiceClient();
  const { data, error } = await serviceClient
    .from('feature_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as FeatureRequest[] };
}

export async function updateFeatureRequestStatus(
  id: string,
  status: FeatureRequestStatus
): Promise<ActionResponse> {
  const ok = await getSuperadminStatus();
  if (!ok) return { success: false, error: 'Not authorized.' };

  const validStatuses: FeatureRequestStatus[] = [
    'pending', 'reviewing', 'accepted', 'rejected', 'shipped',
  ];
  if (!validStatuses.includes(status)) {
    return { success: false, error: 'Invalid status.' };
  }

  const serviceClient = createSupabaseServiceClient();
  const { error } = await serviceClient
    .from('feature_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}
