import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { protocol, rootDomain } from '@/lib/utils';

const cookieDomain = '.' + rootDomain.split(':')[0];

function tenantUrl(slug: string, pathname: string) {
  return `${protocol}://${slug}.${rootDomain}${pathname}`;
}

async function resolveTenantSlug(
  userId: string,
  slugHint: string | null
): Promise<string | null> {
  const service = createSupabaseServiceClient();
  const { data: rows } = await service
    .from('memberships')
    .select('tenants(slug)')
    .eq('user_id', userId);

  const slugs = (rows ?? [])
    .map((r) => (r.tenants as unknown as { slug: string } | null)?.slug)
    .filter((s): s is string => Boolean(s));

  const trimmed = slugHint?.trim();
  if (trimmed && slugs.includes(trimmed)) return trimmed;
  return slugs[0] ?? null;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const slugHint = request.nextUrl.searchParams.get('slug');

  const failRedirect = () => {
    const u = new URL('/auth/sign-in', request.url);
    u.searchParams.set('error', 'confirm_failed');
    return NextResponse.redirect(u);
  };

  if (!code) {
    return failRedirect();
  }

  const onboardingPath = '/admin/onboarding';
  // Placeholder Location; session cookies attach to this response, then we
  // swap Location to the tenant subdomain (same response object).
  const response = NextResponse.redirect(new URL('/', request.url));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              domain: cookieDomain,
            })
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return failRedirect();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return failRedirect();
  }

  const tenantSlug = await resolveTenantSlug(user.id, slugHint);
  if (!tenantSlug) {
    const u = new URL('/auth/sign-in', request.url);
    u.searchParams.set('error', 'no_tenant');
    response.headers.set('Location', u.toString());
    return response;
  }

  response.headers.set('Location', tenantUrl(tenantSlug, onboardingPath));
  return response;
}
