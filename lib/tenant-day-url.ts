import { protocol, rootDomain } from '@/lib/utils';

/** Absolute URL to tenant day page (subdomain + path). */
export function tenantDayUrl(slug: string, dateIso: string): string {
  return `${protocol}://${slug}.${rootDomain}/day/${dateIso}`;
}
