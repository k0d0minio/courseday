'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { rootDomain } from '@/lib/utils';
import { finalizeEmailAuthRedirect } from '@/app/actions/auth-confirm';

type EmailOtpType =
  | 'signup'
  | 'invite'
  | 'magiclink'
  | 'recovery'
  | 'email_change'
  | 'email';

function toEmailOtpType(value: string | null): EmailOtpType | null {
  if (!value) return null;
  switch (value) {
    case 'signup':
    case 'invite':
    case 'magiclink':
    case 'recovery':
    case 'email_change':
    case 'email':
      return value;
    default:
      return null;
  }
}

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
  const queryType = params.get('type');
  const tokenHash = params.get('token_hash');
  const queryErrorCode = params.get('error_code');

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const supabase = createAuthConfirmBrowserClient();
      let authType = toEmailOtpType(queryType ?? (flow === 'recovery' ? 'recovery' : null));
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      const fragment = hash.startsWith('#') ? hash.slice(1) : hash;
      const hp = new URLSearchParams(fragment);
      const errorCode = queryErrorCode ?? hp.get('error_code');

      if (errorCode) {
        if (flow === 'recovery') {
          const target = new URL('/auth/forgot-password', window.location.origin);
          if (slug) target.searchParams.set('slug', slug);
          target.searchParams.set('error', errorCode);
          router.replace(target.pathname + target.search);
          return;
        }
        router.replace('/auth/sign-in?error=confirm_failed');
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error) {
          router.replace('/auth/sign-in?error=confirm_failed');
          return;
        }
      } else if (tokenHash && authType) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: authType,
        });
        if (cancelled) return;
        if (error) {
          router.replace('/auth/sign-in?error=confirm_failed');
          return;
        }
      } else {
        authType = toEmailOtpType(hp.get('type')) ?? authType;
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

      if (authType === 'recovery' || flow === 'recovery') {
        const target = new URL('/auth/reset-password', window.location.origin);
        if (slug) target.searchParams.set('slug', slug);
        if (flow) target.searchParams.set('flow', flow);
        router.replace(target.pathname + target.search);
        return;
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
  }, [code, slug, flow, queryType, tokenHash, queryErrorCode, router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6 text-sm text-muted-foreground">
      {message}
    </div>
  );
}
