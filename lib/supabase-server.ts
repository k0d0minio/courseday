import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getTenantId } from '@/lib/tenant';
import { sharedCookieDomain } from '@/lib/utils';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, { ...options, domain: sharedCookieDomain })
            );
          } catch {
            // setAll called from a Server Component — session refresh still
            // works as long as middleware refreshes the session.
          }
        },
      },
    }
  );
}

/**
 * Returns a Supabase server client together with the current tenant ID.
 * One-stop convenience for server actions and route handlers that need both.
 * RLS is the primary isolation mechanism; tenantId is needed for INSERT columns.
 */
export async function createTenantClient() {
  const [supabase, tenantId] = await Promise.all([
    createSupabaseServerClient(),
    getTenantId(),
  ]);
  return { supabase, tenantId };
}

export function createSupabaseServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
