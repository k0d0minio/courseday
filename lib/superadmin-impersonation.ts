export const SUPERADMIN_ROLE_QUERY_PARAM = 'superadmin_as'
export const SUPERADMIN_ROLE_COOKIE = 'courseday_superadmin_role'

export type SuperadminRole = 'editor' | 'staff'

export function parseSuperadminRoleCookie(
  raw: string | undefined
): { userId: string; tenantId: string; role: SuperadminRole } | null {
  if (!raw) return null
  const [userId, tenantId, role] = raw.split(':')
  if (!userId || !tenantId || !role) return null
  if (role !== 'editor' && role !== 'staff') return null
  return { userId, tenantId, role }
}

export function buildSuperadminRoleCookie(
  userId: string,
  tenantId: string,
  role: SuperadminRole
): string {
  return `${userId}:${tenantId}:${role}`
}
