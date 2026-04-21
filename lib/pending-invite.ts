import type { SupabaseClient } from '@supabase/supabase-js';

/** Service-role client (tables may be ahead of generated Database types). */
type ServiceClient = SupabaseClient;

/** Normalise auth / invite emails for storage and lookup (pending_invitations.email is lowercased on insert). */
export function normaliseInviteEmail(email: string | null | undefined): string | null {
  const e = email?.trim().toLowerCase();
  return e && e.includes('@') ? e : null;
}

/**
 * Most recent pending invitation for this email (service client — bypasses RLS).
 * Returns tenant slug or null.
 */
function slugFromPendingRow(row: unknown): string | null {
  const r = row as { tenants: { slug: string } | { slug: string }[] | null } | null;
  const t = r?.tenants;
  if (!t) return null;
  return (Array.isArray(t) ? t[0] : t)?.slug ?? null;
}

export async function getPendingInviteTenantSlug(
  service: ServiceClient,
  emailNorm: string
): Promise<string | null> {
  const { data } = await service
    .from('pending_invitations')
    .select('tenants(slug)')
    .eq('email', emailNorm)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return slugFromPendingRow(data);
}

/**
 * Pending invite tenant slug for this user. Prefers `slugHint` when it matches
 * a pending row (email confirmation deep-link).
 */
export async function resolvePendingInviteSlugForUser(
  service: ServiceClient,
  userId: string,
  slugHint: string | null
): Promise<string | null> {
  const { data: authUser } = await service.auth.admin.getUserById(userId);
  const emailNorm = normaliseInviteEmail(authUser.user?.email);
  if (!emailNorm) return null;

  const { data: rows } = await service
    .from('pending_invitations')
    .select('tenants(slug)')
    .eq('email', emailNorm)
    .order('created_at', { ascending: false });

  const list = rows ?? [];
  const trimmed = slugHint?.trim();
  if (trimmed) {
    for (const row of list) {
      const s = slugFromPendingRow(row);
      if (s === trimmed) return s;
    }
  }
  return list.length ? slugFromPendingRow(list[0]) : null;
}
