import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { redis } from '@/lib/redis';
import { extractSubdomain } from '@/lib/subdomain';
import { rootDomain } from '@/lib/utils';
import type { TenantRedisData } from '@/app/actions/tenants';

// Node.js runtime required for ioredis (TCP sockets).
export const runtime = 'nodejs';

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const { pathname } = request.nextUrl;

  // -------------------------------------------------------------------------
  // 1. Refresh Supabase auth session on every request.
  //    We collect any cookies Supabase wants to set and apply them to the
  //    final response (which may be a rewrite, redirect, or next).
  // -------------------------------------------------------------------------
  type AuthCookie = { name: string; value: string; options: Parameters<NextResponse['cookies']['set']>[2] };
  const authCookies: AuthCookie[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach((c) => authCookies.push(c as AuthCookie));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  function applyAuthCookies(response: NextResponse): NextResponse {
    authCookies.forEach(({ name, value, options }) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      response.cookies.set(name, value, options as any)
    );
    return response;
  }

  // -------------------------------------------------------------------------
  // 2. Subdomain detection.
  // -------------------------------------------------------------------------
  const subdomain = extractSubdomain(host, rootDomain);

  // Root domain — pass through to platform pages.
  if (!subdomain) {
    return applyAuthCookies(NextResponse.next());
  }

  // www — redirect to root domain.
  if (subdomain === 'www') {
    const url = request.nextUrl.clone();
    url.host = rootDomain;
    return applyAuthCookies(NextResponse.redirect(url));
  }

  // -------------------------------------------------------------------------
  // 3. Tenant resolution via Redis.
  // -------------------------------------------------------------------------
  const cached = await redis.get(`subdomain:${subdomain}`);
  if (!cached) {
    return new NextResponse('Not found', { status: 404 });
  }

  const tenant = JSON.parse(cached) as TenantRedisData;

  // -------------------------------------------------------------------------
  // 4. Auth guard for tenant routes.
  //    Public paths (no login required): /auth/*, /day/*
  // -------------------------------------------------------------------------
  const isPublicPath =
    pathname === '/auth/sign-in' ||
    pathname === '/auth/sign-up' ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/day/');

  if (!user && !isPublicPath) {
    const signInUrl = new URL('/auth/sign-in', request.url);
    return applyAuthCookies(NextResponse.redirect(signInUrl));
  }

  // -------------------------------------------------------------------------
  // 5. Inject tenant headers and rewrite to the tenant route group.
  //    e.g. pierpont.example.com/dashboard → example.com/pierpont/dashboard
  //    handled by app/[tenant]/dashboard/page.tsx
  // -------------------------------------------------------------------------
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-id', tenant.id);
  requestHeaders.set('x-tenant-slug', tenant.slug);

  return applyAuthCookies(
    NextResponse.rewrite(
      new URL(`/${tenant.slug}${pathname}`, request.url),
      { request: { headers: requestHeaders } }
    )
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
