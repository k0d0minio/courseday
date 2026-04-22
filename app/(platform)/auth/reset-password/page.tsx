'use client';

import Link from 'next/link';
import { useActionState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  completePasswordRecovery,
  type PasswordRecoveryErrorCode,
} from '@/app/actions/auth';
import { finalizeEmailAuthRedirect } from '@/app/actions/auth-confirm';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ERROR_CODES: readonly PasswordRecoveryErrorCode[] = [
  'RATE_LIMIT',
  'TOO_SHORT',
  'MISMATCH',
  'NOT_SIGNED_IN',
] as const;

function isRecoveryErrorCode(error: string): error is PasswordRecoveryErrorCode {
  return (ERROR_CODES as readonly string[]).includes(error);
}

export default function ResetPasswordPage() {
  const [state, action, isPending] = useActionState(completePasswordRecovery, null);
  const params = useSearchParams();
  const slug = params.get('slug');
  const flow = params.get('flow');
  const router = useRouter();
  const t = useTranslations('Platform.auth');

  useEffect(() => {
    if (!state?.success) return;
    let cancelled = false;

    async function finishRecovery() {
      const result = await finalizeEmailAuthRedirect(slug, flow);
      if (cancelled) return;

      if (!result.ok) {
        router.replace('/auth/sign-in?error=confirm_failed');
        return;
      }

      window.location.assign(result.redirectUrl);
    }

    void finishRecovery();
    return () => {
      cancelled = true;
    };
  }, [flow, router, slug, state?.success]);

  const displayError =
    state?.error &&
    (isRecoveryErrorCode(state.error)
      ? t(`passwordResetErrors.${state.error}`)
      : state.error);

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
          <form action={action}>
            <CardContent className="space-y-4">
              {displayError && (
                <p className="text-sm text-destructive">{displayError}</p>
              )}
              {state?.success && (
                <p className="text-sm text-green-700">{t('resettingPassword')}</p>
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
