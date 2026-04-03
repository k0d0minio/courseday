import { headers } from 'next/headers';

export type TenantContext = {
  id: string;
  slug: string;
};

/**
 * Reads the tenant context injected by middleware into request headers.
 * Throws if called outside of a tenant subdomain context.
 */
export async function getTenantFromHeaders(): Promise<TenantContext> {
  const headersList = await headers();
  const id = headersList.get('x-tenant-id');
  const slug = headersList.get('x-tenant-slug');

  if (!id || !slug) {
    throw new Error(
      'getTenantFromHeaders() called outside of a tenant context. ' +
        'This function is only available in routes served under a tenant subdomain.'
    );
  }

  return { id, slug };
}

/**
 * Convenience shorthand — returns just the tenant ID.
 */
export async function getTenantId(): Promise<string> {
  const { id } = await getTenantFromHeaders();
  return id;
}
