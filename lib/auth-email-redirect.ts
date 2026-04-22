import { protocol, rootDomain } from '@/lib/utils';

export function buildAuthConfirmRedirectUrl(options?: {
  slug?: string | null;
  flow?: string | null;
}) {
  const url = new URL(`${protocol}://${rootDomain}/auth/confirm`);
  const slug = options?.slug?.trim();
  const flow = options?.flow?.trim();

  if (slug) {
    url.searchParams.set('slug', slug);
  }
  if (flow) {
    url.searchParams.set('flow', flow);
  }

  return url.toString();
}
