'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { rootDomain } from '@/lib/utils';
import {
  finalizeEmailAuthRedirect,
  finalizeEmailAuthRedirectWithToken,
} from '@/app/actions/auth-confirm';
import { Button } from '@/components/ui/button';

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

async function tryVerifyOtpFromHashCandidates(
  supabase: ReturnType<typeof createAuthConfirmBrowserClient>,
  tokenHash: string,
  preferredType: EmailOtpType | null
) {
  const candidates: EmailOtpType[] = preferredType
    ? [preferredType, 'magiclink', 'email', 'invite', 'signup', 'recovery', 'email_change']
    : ['magiclink', 'email', 'invite', 'signup', 'recovery', 'email_change'];
  const deduped = Array.from(new Set(candidates));

  for (const type of deduped) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (!error) {
      return {
        ok: true as const,
        type,
        accessToken: data.session?.access_token ?? null,
      };
    }
  }

  return { ok: false as const };
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  const [message] = useState('Confirming your session...');

  const code = params.get('code');
  const slug = params.get('slug');
  const flow = params.get('flow');
  const queryType = params.get('type');
  const tokenHash = params.get('token_hash');
  const queryErrorCode = params.get('error_code');
  const [isArmed, setIsArmed] = useState(flow !== 'magic');

  useEffect(() => {
    if (!isArmed) return;
    let cancelled = false;

    async function run() {
      // For recovery links, avoid consuming one-time tokens on page load.
      // Email scanners can preload this URL and burn tokens before user action.
      if (flow === 'recovery') {
        const target = new URL('/auth/reset-password', window.location.origin);
        if (slug) target.searchParams.set('slug', slug);
        target.searchParams.set('flow', 'recovery');
        if (code) target.searchParams.set('code', code);
        if (tokenHash) target.searchParams.set('token_hash', tokenHash);
        if (queryType) target.searchParams.set('type', queryType);
        if (typeof window !== 'undefined' && window.location.hash) {
          window.location.assign(target.pathname + target.search + window.location.hash);
          return;
        }
        router.replace(target.pathname + target.search);
        return;
      }

      const supabase = createAuthConfirmBrowserClient();
      let authType = toEmailOtpType(queryType ?? (flow === 'recovery' ? 'recovery' : null));
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      const fragment = hash.startsWith('#') ? hash.slice(1) : hash;
      const hp = new URLSearchParams(fragment);
      const errorCode = queryErrorCode ?? hp.get('error_code');
      let accessToken: string | null = null;

      if (errorCode) {
        router.replace('/auth/sign-in?error=confirm_failed');
        return;
      }

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        accessToken = data.session?.access_token ?? null;
        if (error) {
          // Some email templates/providers deliver token hash in `code` query param.
          // Fallback avoids hard-fail when PKCE verifier is unavailable.
          const fallback = await tryVerifyOtpFromHashCandidates(supabase, code, authType);
          if (cancelled) return;
          if (!fallback.ok) {
            router.replace('/auth/sign-in?error=confirm_failed');
            return;
          }
          authType = fallback.type;
          accessToken = fallback.accessToken;
        }
      } else if (tokenHash && authType) {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: authType,
        });
        if (cancelled) return;
        accessToken = data.session?.access_token ?? null;
        if (error) {
          router.replace('/auth/sign-in?error=confirm_failed');
          return;
        }
      } else {
        authType = toEmailOtpType(hp.get('type')) ?? authType;
        const access_token = hp.get('access_token');
        const refresh_token = hp.get('refresh_token');
        if (access_token && refresh_token) {
          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (cancelled) return;
          accessToken = data.session?.access_token ?? access_token;
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

      if (!accessToken) {
        const { data } = await supabase.auth.getSession();
        accessToken = data.session?.access_token ?? null;
      }

      let result = accessToken
        ? await finalizeEmailAuthRedirectWithToken(accessToken, slug, flow)
        : await finalizeEmailAuthRedirect(slug, flow);
      if (!result.ok && result.error === 'no_session') {
        await wait(350);
        result = accessToken
          ? await finalizeEmailAuthRedirectWithToken(accessToken, slug, flow)
          : await finalizeEmailAuthRedirect(slug, flow);
      }
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
  }, [code, slug, flow, queryType, tokenHash, queryErrorCode, router, isArmed]);

  if (!isArmed) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Ready to sign you in. Click button below to continue.
        </p>
        <Button onClick={() => setIsArmed(true)}>Continue sign in</Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6 text-sm text-muted-foreground">
      {message}
    </div>
  );
}
