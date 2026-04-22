'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createBrowserClient } from '@supabase/ssr';
import { finalizeEmailAuthRedirect } from '@/app/actions/auth-confirm';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { rootDomain } from '@/lib/utils';

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

function createRecoveryBrowserClient() {
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

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const slug = params.get('slug');
  const flow = params.get('flow');
  const code = params.get('code');
  const tokenHash = params.get('token_hash');
  const queryType = params.get('type');
  const router = useRouter();
  const t = useTranslations('Platform.auth');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [displayError, setDisplayError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDisplayError(null);

    if (password.length < 8) {
      setDisplayError(t('passwordResetErrors.TOO_SHORT'));
      return;
    }
    if (password !== confirm) {
      setDisplayError(t('passwordResetErrors.MISMATCH'));
      return;
    }

    setIsPending(true);
    try {
      const supabase = createRecoveryBrowserClient();
      let authType = toEmailOtpType(queryType ?? (flow === 'recovery' ? 'recovery' : null));
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      const fragment = hash.startsWith('#') ? hash.slice(1) : hash;
      const hp = new URLSearchParams(fragment);

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setDisplayError('Reset link expired or already used. Request a new reset email.');
          setIsPending(false);
          return;
        }
      } else if (tokenHash && authType) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: authType,
        });
        if (error) {
          setDisplayError('Reset link expired or already used. Request a new reset email.');
          setIsPending(false);
          return;
        }
      } else {
        authType = toEmailOtpType(hp.get('type')) ?? authType;
        const accessToken = hp.get('access_token');
        const refreshToken = hp.get('refresh_token');
        if (!accessToken || !refreshToken) {
          setDisplayError('Reset link is invalid. Request a new reset email.');
          setIsPending(false);
          return;
        }
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          setDisplayError('Reset link expired or already used. Request a new reset email.');
          setIsPending(false);
          return;
        }
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setDisplayError(updateError.message);
        setIsPending(false);
        return;
      }

      setSuccessMessage(t('resettingPassword'));
      const result = await finalizeEmailAuthRedirect(slug, flow);
      if (!result.ok) {
        router.replace('/auth/sign-in?error=confirm_failed');
        return;
      }

      window.location.assign(result.redirectUrl);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-center">
          <Link href="/" className="inline-flex" aria-label="Home">
            <Logo className="text-2xl" />
          </Link>
        </div>

        <Card>
          <CardHeader>
            <h1 className="text-xl font-semibold tracking-tight text-center">
              {t('resetPasswordTitle')}
            </h1>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {displayError && (
                <p className="text-sm text-destructive">{displayError}</p>
              )}
              {successMessage && (
                <p className="text-sm text-green-700">{successMessage}</p>
              )}
              <div className="space-y-2">
                <Label htmlFor="password">{t('newPasswordLabel')}</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm">{t('confirmPasswordLabel')}</Label>
                <Input
                  id="confirm"
                  name="confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? t('resettingPassword') : t('resetPasswordButton')}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
