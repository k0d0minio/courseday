import { createBrowserClient } from '@supabase/ssr';
import { sharedCookieDomain } from '@/lib/utils';

type BrowserClientOptions = {
  flowType?: 'pkce' | 'implicit';
  isSingleton?: boolean;
};

export function createSupabaseBrowserClient(options?: BrowserClientOptions) {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      isSingleton: options?.isSingleton ?? true,
      cookieOptions: { domain: sharedCookieDomain, path: '/' },
      auth: options?.flowType ? { flowType: options.flowType } : undefined,
    }
  );
}
