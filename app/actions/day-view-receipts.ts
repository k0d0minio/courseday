'use server';

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getTenantId } from '@/lib/tenant';
import { getUserRole } from '@/lib/membership';
import { getUser } from '@/app/actions/auth';
import type { ActionResponse } from '@/types/actions';

export type HandoverRemovedItem =
  | { kind: 'activity'; id: string; label: string; deleted_at: string }
  | { kind: 'reservation'; id: string; label: string; deleted_at: string }
  | { kind: 'breakfast'; id: string; label: string; deleted_at: string }
  | { kind: 'day_note'; id: string; label: string; deleted_at: string };

function noteLabel(content: string): string {
  const t = content.trim().replace(/\s+/g, ' ');
  if (t.length <= 72) return t || '—';
  return `${t.slice(0, 72)}…`;
}

export async function ensureDayViewReceipt(
  tenantId: string,
  dayId: string,
  userId: string
): Promise<ActionResponse<{ last_viewed_at: string }>> {
  const role = await getUserRole(tenantId);
  if (!role) return { success: false, error: 'Not authorized.' };

  const supabase = await createSupabaseServerClient();

  const { data: existing, error: selErr } = await supabase
    .from('day_view_receipt')
    .select('last_viewed_at')
    .eq('user_id', userId)
    .eq('day_id', dayId)
    .maybeSingle();

  if (selErr) return { success: false, error: selErr.message };

  if (existing) {
    return {
      success: true,
      data: { last_viewed_at: (existing as { last_viewed_at: string }).last_viewed_at },
    };
  }

  const now = new Date().toISOString();
  const { error: insErr } = await supabase.from('day_view_receipt').insert({
    user_id: userId,
    tenant_id: tenantId,
    day_id: dayId,
    last_viewed_at: now,
  });

  if (insErr) return { success: false, error: insErr.message };
  return { success: true, data: { last_viewed_at: now } };
}

export async function markDayCaughtUp(dayId: string): Promise<ActionResponse<{ last_viewed_at: string }>> {
  const tenantId = await getTenantId();
  const user = await getUser();
  if (!user) return { success: false, error: 'Not signed in.' };

  const role = await getUserRole(tenantId);
  if (!role) return { success: false, error: 'Not authorized.' };

  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();

  const { error } = await supabase.from('day_view_receipt').upsert(
    {
      user_id: user.id,
      tenant_id: tenantId,
      day_id: dayId,
      last_viewed_at: now,
    },
    { onConflict: 'user_id,day_id' }
  );

  if (error) return { success: false, error: error.message };
  return { success: true, data: { last_viewed_at: now } };
}

export async function getSoftDeletedSince(
  tenantId: string,
  dayId: string,
  sinceIso: string
): Promise<ActionResponse<HandoverRemovedItem[]>> {
  const role = await getUserRole(tenantId);
  if (!role) return { success: false, error: 'Not authorized.' };

  const supabase = await createSupabaseServerClient();

  const [actRes, resRes, brkRes, noteRes] = await Promise.all([
    supabase
      .from('activity')
      .select('id, title, deleted_at')
      .eq('tenant_id', tenantId)
      .eq('day_id', dayId)
      .not('deleted_at', 'is', null)
      .gt('deleted_at', sinceIso),
    supabase
      .from('reservation')
      .select('id, guest_name, deleted_at')
      .eq('tenant_id', tenantId)
      .eq('day_id', dayId)
      .not('deleted_at', 'is', null)
      .gt('deleted_at', sinceIso),
    supabase
      .from('breakfast_configuration')
      .select('id, group_name, deleted_at')
      .eq('tenant_id', tenantId)
      .eq('day_id', dayId)
      .not('deleted_at', 'is', null)
      .gt('deleted_at', sinceIso),
    supabase
      .from('day_notes')
      .select('id, content, deleted_at')
      .eq('tenant_id', tenantId)
      .eq('day_id', dayId)
      .not('deleted_at', 'is', null)
      .gt('deleted_at', sinceIso),
  ]);

  const err =
    actRes.error?.message ??
    resRes.error?.message ??
    brkRes.error?.message ??
    noteRes.error?.message;
  if (err) return { success: false, error: err };

  const out: HandoverRemovedItem[] = [];

  for (const row of actRes.data ?? []) {
    const r = row as { id: string; title: string; deleted_at: string };
    out.push({ kind: 'activity', id: r.id, label: r.title, deleted_at: r.deleted_at });
  }
  for (const row of resRes.data ?? []) {
    const r = row as { id: string; guest_name: string | null; deleted_at: string };
    out.push({
      kind: 'reservation',
      id: r.id,
      label: r.guest_name?.trim() || 'Guest',
      deleted_at: r.deleted_at,
    });
  }
  for (const row of brkRes.data ?? []) {
    const r = row as { id: string; group_name: string | null; deleted_at: string };
    out.push({
      kind: 'breakfast',
      id: r.id,
      label: r.group_name?.trim() || 'Breakfast',
      deleted_at: r.deleted_at,
    });
  }
  for (const row of noteRes.data ?? []) {
    const r = row as { id: string; content: string; deleted_at: string };
    out.push({
      kind: 'day_note',
      id: r.id,
      label: noteLabel(r.content),
      deleted_at: r.deleted_at,
    });
  }

  out.sort((a, b) => a.deleted_at.localeCompare(b.deleted_at));
  return { success: true, data: out };
}
