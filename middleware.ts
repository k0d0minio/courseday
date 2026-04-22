import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { redis } from '@/lib/redis';
import { extractSubdomain } from '@/lib/subdomain';
import { protocol, rootDomain } from '@/lib/utils';
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

  // Cookies must be shared across subdomains — strip port, prepend '.'.
  const cookieDomain = '.' + rootDomain.split(':')[0];

  function applyAuthCookies(response: NextResponse): NextResponse {
    authCookies.forEach(({ name, value, options }) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      response.cookies.set(name, value, { ...(options as any), domain: cookieDomain })
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

  // Block /admin (exactly) on tenant subdomains — platform admin is root-domain only.
  // Note: /admin/settings is the tenant settings path and must not be blocked.
  if (pathname === '/admin') {
    const url = request.nextUrl.clone();
    url.host = rootDomain;
    url.pathname = '/';
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
  // 3b. Suspended / archived tenants — show a branded gate page.
  // -------------------------------------------------------------------------
  if (tenant.status === 'suspended' || tenant.status === 'archived') {
    const isSuspended = tenant.status === 'suspended';
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${tenant.name} · Courseday</title>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; background: #f9fafb; color: #111; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 2.5rem 3rem; max-width: 420px; width: 90%; text-align: center; }
    h1 { font-size: 1.5rem; font-weight: 700; margin: 0 0 0.5rem; }
    p { color: #6b7280; margin: 0; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${tenant.name}</h1>
    <p>${isSuspended ? 'This venue has been temporarily suspended.' : 'This venue is no longer active.'}</p>
  </div>
</body>
</html>`;
    return new NextResponse(html, {
      status: 403,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const platformSignInUrl = new URL(`${protocol}://${rootDomain}/auth/sign-in`);
  platformSignInUrl.searchParams.set('slug', subdomain);
  const redirectTo = request.nextUrl.searchParams.get('redirectTo');
  if (redirectTo) {
    platformSignInUrl.searchParams.set('redirectTo', redirectTo);
  }

  if (pathname === '/auth/sign-in' || pathname === '/auth/sign-up') {
    return applyAuthCookies(NextResponse.redirect(platformSignInUrl));
  }

  // -------------------------------------------------------------------------
  // 4. Auth guard for tenant routes.
  //    Public paths (no login required): /auth/*
  // -------------------------------------------------------------------------
  const isPublicPath =
    pathname === '/auth/sign-in' ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/pwa/');

  if (!user && !isPublicPath) {
    const signInUrl = new URL(`${protocol}://${rootDomain}/auth/sign-in`);
    signInUrl.searchParams.set('slug', subdomain);
    signInUrl.searchParams.set('redirectTo', pathname);
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
  requestHeaders.set('x-tenant-language', tenant.language ?? 'en');

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
