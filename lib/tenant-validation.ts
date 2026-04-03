/**
 * Validates a tenant slug.
 * Rules: lowercase alphanumeric and hyphens, 3–63 characters,
 * must not start or end with a hyphen.
 */
export function isValidSlug(slug: string): boolean {
  if (slug.length < 3 || slug.length > 63) return false;
  if (!/^[a-z0-9-]+$/.test(slug)) return false;
  if (slug.startsWith('-') || slug.endsWith('-')) return false;
  return true;
}
