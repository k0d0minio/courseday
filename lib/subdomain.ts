/**
 * Extracts the subdomain from a hostname string.
 * Returns null if the hostname is the root domain (or www), meaning no tenant.
 * Handles three environments:
 *   - Local dev:        tenant.localhost
 *   - Vercel preview:  tenant---branch.vercel.app
 *   - Production:      tenant.yourdomain.com
 */
export function extractSubdomain(hostname: string, rootDomain: string): string | null {
  // Strip port if present
  const host = hostname.split(':')[0];
  const root = rootDomain.split(':')[0];

  // Local dev: [subdomain].localhost
  if (host.endsWith('.localhost')) {
    const sub = host.slice(0, host.length - '.localhost'.length);
    return sub || null;
  }

  // Vercel preview: [subdomain]---branch-name.vercel.app
  if (host.includes('---') && host.endsWith('.vercel.app')) {
    const sub = host.split('---')[0];
    return sub || null;
  }

  // Production: [subdomain].[rootDomain]
  if (
    host !== root &&
    host !== `www.${root}` &&
    host.endsWith(`.${root}`)
  ) {
    return host.slice(0, host.length - root.length - 1);
  }

  return null;
}
