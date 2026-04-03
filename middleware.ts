import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { extractSubdomain } from '@/lib/subdomain';
import { rootDomain } from '@/lib/utils';
import type { TenantRedisData } from '@/app/actions/tenants';

// Node.js runtime is required because ioredis uses TCP sockets,
// which are not available in the Edge runtime.
export const runtime = 'nodejs';

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const subdomain = extractSubdomain(host, rootDomain);

  // No subdomain — root domain, pass through to platform pages.
  if (!subdomain) {
    return NextResponse.next();
  }

  // www — redirect to root domain.
  if (subdomain === 'www') {
    const url = request.nextUrl.clone();
    url.host = rootDomain;
    return NextResponse.redirect(url);
  }

  // Look up tenant in Redis.
  const cached = await redis.get(`subdomain:${subdomain}`);
  if (!cached) {
    return new NextResponse('Not found', { status: 404 });
  }

  const tenant = JSON.parse(cached) as TenantRedisData;

  // Inject tenant context into headers and rewrite to the tenant route group.
  // e.g. pierpont.example.com/day/2026-04-03
  //   → example.com/{slug}/day/2026-04-03  (handled by app/[tenant]/...)
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-id', tenant.id);
  requestHeaders.set('x-tenant-slug', tenant.slug);

  return NextResponse.rewrite(
    new URL(`/${tenant.slug}${pathname}`, request.url),
    { request: { headers: requestHeaders } }
  );
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - /api routes
     * - /_next (Next.js internals)
     * - Static files (favicon.ico, images, etc.)
     */
    '/((?!api|_next|[\\w-]+\\.\\w+).*)',
  ],
};
