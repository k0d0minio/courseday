import { createBrowserClient } from '@supabase/ssr';
import { rootDomain } from '@/lib/utils';

const cookieDomain = '.' + rootDomain.split(':')[0];

type BrowserClientOptions = {
  flowType?: 'pkce' | 'implicit';
};

export function createSupabaseBrowserClient(options?: BrowserClientOptions) {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { domain: cookieDomain, path: '/' },
      auth: options?.flowType ? { flowType: options.flowType } : undefined,
    }
  );
}
