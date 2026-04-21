import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { resolvePendingInviteSlugForUser } from '@/lib/pending-invite';
import { protocol, rootDomain } from '@/lib/utils';

const cookieDomain = '.' + rootDomain.split(':')[0];

function tenantUrl(slug: string, pathname: string) {
  return `${protocol}://${slug}.${rootDomain}${pathname}`;
}

const ONBOARDING_PATH = '/admin/onboarding';

async function membershipSlugsForUser(
  service: ReturnType<typeof createSupabaseServiceClient>,
  userId: string
): Promise<string[]> {
  const { data: rows } = await service
    .from('memberships')
    .select('tenants(slug)')
    .eq('user_id', userId);

  return (rows ?? [])
    .map((r) => (r.tenants as unknown as { slug: string } | null)?.slug)
    .filter((s): s is string => Boolean(s));
}

async function resolveTenantRedirect(
  userId: string,
  slugHint: string | null
): Promise<{ slug: string; pathname: string } | null> {
  const service = createSupabaseServiceClient();
  const slugs = await membershipSlugsForUser(service, userId);

  const trimmed = slugHint?.trim();
  if (slugs.length > 0) {
    const slug =
      trimmed && slugs.includes(trimmed) ? trimmed : (slugs[0] ?? null);
    if (!slug) return null;

    const { data: tenant } = await service
      .from('tenants')
      .select('id, onboarding_completed')
      .eq('slug', slug)
      .maybeSingle();

    if (!tenant?.id) {
      return { slug, pathname: '/' };
    }

    const { data: mem } = await service
      .from('memberships')
      .select('role')
      .eq('user_id', userId)
      .eq('tenant_id', tenant.id)
      .maybeSingle();

    const row = tenant as { onboarding_completed?: boolean };
    const onboardingDone = row.onboarding_completed === true;
    const isEditor = mem?.role === 'editor';
    const pathname =
      isEditor && !onboardingDone ? ONBOARDING_PATH : '/';

    return { slug, pathname };
  }

  const pendingSlug = await resolvePendingInviteSlugForUser(service, userId, slugHint);
  if (!pendingSlug) return null;
  // Invited members have no membership until first visit; skip editor onboarding.
  return { slug: pendingSlug, pathname: '/' };
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const slugHint = request.nextUrl.searchParams.get('slug');
  const flow = request.nextUrl.searchParams.get('flow');

  const failRedirect = () => {
    const u = new URL('/auth/sign-in', request.url);
    u.searchParams.set('error', 'confirm_failed');
    return NextResponse.redirect(u);
  };

  if (!code) {
    return failRedirect();
  }

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

  if (flow === 'invite') {
    const trimmed = slugHint?.trim();
    if (trimmed) {
      const service = createSupabaseServiceClient();
      const slugs = await membershipSlugsForUser(service, user.id);
      if (slugs.includes(trimmed)) {
        response.headers.set('Location', tenantUrl(trimmed, '/auth/join'));
        return response;
      }
    }
  }

  const tenantRedirect = await resolveTenantRedirect(user.id, slugHint);
  if (!tenantRedirect) {
    const u = new URL('/auth/sign-in', request.url);
    u.searchParams.set('error', 'no_tenant');
    response.headers.set('Location', u.toString());
    return response;
  }

  response.headers.set(
    'Location',
    tenantUrl(tenantRedirect.slug, tenantRedirect.pathname)
  );
  return response;
}
