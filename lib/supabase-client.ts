import { createBrowserClient } from '@supabase/ssr'
import { sharedCookieDomain } from '@/lib/utils'

type BrowserClientOptions = {
  flowType?: 'pkce' | 'implicit'
  isSingleton?: boolean
}

export function createSupabaseBrowserClient(options?: BrowserClientOptions) {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      isSingleton: options?.isSingleton ?? true,
      cookieOptions: { ...(sharedCookieDomain ? { domain: sharedCookieDomain } : {}), path: '/' },
      ...(options?.flowType ? { auth: { flowType: options.flowType } } : {}),
    }
  )
}
