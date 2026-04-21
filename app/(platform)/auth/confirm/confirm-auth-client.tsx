'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { rootDomain } from '@/lib/utils';
import { finalizeEmailAuthRedirect } from '@/app/actions/auth-confirm';

function createAuthConfirmBrowserClient() {
  const cookieDomain = '.' + rootDomain.split(':')[0];
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      isSingleton: false,
      cookieOptions: { domain: cookieDomain, path: '/' },
      auth: {
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    }
  );
}

export function ConfirmAuthClient() {
  const params = useSearchParams();
  const router = useRouter();
  const [message] = useState('Confirming your session…');

  const code = params.get('code');
  const slug = params.get('slug');
  const flow = params.get('flow');

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const supabase = createAuthConfirmBrowserClient();

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error) {
          router.replace('/auth/sign-in?error=confirm_failed');
          return;
        }
      } else {
        const hash = typeof window !== 'undefined' ? window.location.hash : '';
        const fragment = hash.startsWith('#') ? hash.slice(1) : hash;
        const hp = new URLSearchParams(fragment);
        const access_token = hp.get('access_token');
        const refresh_token = hp.get('refresh_token');
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (cancelled) return;
          if (error) {
            router.replace('/auth/sign-in?error=confirm_failed');
            return;
          }
        } else {
          router.replace('/auth/sign-in?error=confirm_failed');
          return;
        }
      }

      if (typeof window !== 'undefined' && window.location.hash) {
        window.history.replaceState(
          null,
          '',
          window.location.pathname + window.location.search
        );
      }

      const result = await finalizeEmailAuthRedirect(slug, flow);
      if (cancelled) return;
      if (!result.ok) {
        router.replace(
          result.error === 'no_tenant'
            ? '/auth/sign-in?error=no_tenant'
            : '/auth/sign-in?error=confirm_failed'
        );
        return;
      }

      window.location.assign(result.redirectUrl);
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [code, slug, flow, router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6 text-sm text-muted-foreground">
      {message}
    </div>
  );
}
