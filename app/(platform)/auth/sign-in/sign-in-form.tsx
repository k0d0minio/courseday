'use client';

import { useActionState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { platformSignIn, sendSignInMagicLink } from '@/app/actions/auth';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function SignInForm() {
  const [state, action, isPending] = useActionState(platformSignIn, null);
  const [magicState, magicAction, isMagicPending] = useActionState(sendSignInMagicLink, null);
  const t = useTranslations('Platform.auth');

  // Invite / magic links sometimes land on Site URL (sign-in) with tokens in the
  // hash after a failed server-only confirm — forward to client confirm handler.
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get('code')) {
      window.location.replace(`${window.location.origin}/auth/confirm${window.location.search}`);
      return;
    }
    if (query.get('token_hash')) {
      window.location.replace(`${window.location.origin}/auth/confirm${window.location.search}`);
      return;
    }
    const hash = window.location.hash;
    if (!hash || !hash.includes('access_token')) return;
    window.location.replace(`${window.location.origin}/auth/confirm${hash}`);
  }, []);

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
              {t('signInTitle')}
            </h1>
          </CardHeader>

          <form action={action}>
            <CardContent className="space-y-4">
              {state?.error && (
                <p className="text-sm text-destructive">{state.error}</p>
              )}
              {magicState?.error && (
                <p className="text-sm text-destructive">{magicState.error}</p>
              )}
              {magicState?.success && (
                <p className="text-sm text-green-700">{magicState.success}</p>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">{t('emailLabel')}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('passwordLabel')}</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? t('signingIn') : t('signInButton')}
              </Button>
              <Button
                type="submit"
                formAction={magicAction}
                formNoValidate
                variant="outline"
                className="w-full"
                disabled={isMagicPending}
              >
                {isMagicPending ? t('sendingMagicLink') : t('magicLinkButton')}
              </Button>
              <Link href="/auth/forgot-password" className="text-sm underline underline-offset-4">
                {t('forgotPasswordLink')}
              </Link>
              <Link href="/auth/superadmin-sign-in" className="text-sm underline underline-offset-4">
                {t('superadminSignInLink')}
              </Link>
              <p className="text-sm text-muted-foreground text-center">
                {t('createVenuePrompt')}{' '}
                <Link href="/new" className="underline underline-offset-4">
                  {t('createVenueLink')}
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
