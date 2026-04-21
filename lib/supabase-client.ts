import { createBrowserClient } from '@supabase/ssr';
import { rootDomain } from '@/lib/utils';

const cookieDomain = '.' + rootDomain.split(':')[0];

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookieOptions: { domain: cookieDomain, path: '/' } }
  );
}
