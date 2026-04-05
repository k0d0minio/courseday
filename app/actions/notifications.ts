'use server';

import { createTenantClient, createSupabaseServiceClient } from '@/lib/supabase-server';
import { getTenantId } from '@/lib/tenant';
import { getUserRole } from '@/lib/membership';
import { getUser } from '@/app/actions/auth';
import type { ActionResponse } from '@/types/actions';

export interface Notification {
  id: string;
  tenant_id: string;
  user_id: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export async function getNotifications(): Promise<ActionResponse<Notification[]>> {
  const tenantId = await getTenantId();
  const role = await getUserRole(tenantId);
  if (!role) return { success: false, error: 'Not a member.' };

  const user = await getUser();
  if (!user) return { success: false, error: 'Not authenticated.' };

  const { supabase } = await createTenantClient();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as Notification[] };
}

export async function markNotificationRead(id: string): Promise<ActionResponse> {
  const user = await getUser();
  if (!user) return { success: false, error: 'Not authenticated.' };

  const { supabase } = await createTenantClient();
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function markAllRead(): Promise<ActionResponse> {
  const tenantId = await getTenantId();
  const user = await getUser();
  if (!user) return { success: false, error: 'Not authenticated.' };

  const serviceClient = createSupabaseServiceClient();
  const { error } = await serviceClient
    .from('notifications')
    .update({ read: true })
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .eq('read', false);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function getUnreadCount(): Promise<number> {
  const tenantId = await getTenantId();
  const role = await getUserRole(tenantId);
  if (!role) return 0;

  const user = await getUser();
  if (!user) return 0;

  const { supabase } = await createTenantClient();
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .eq('read', false);

  return count ?? 0;
}
