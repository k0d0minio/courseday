'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { platformSignIn } from '@/app/actions/auth';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function SignInForm() {
  const [state, action, isPending] = useActionState(platformSignIn, null);
  const t = useTranslations('Platform.auth');

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-center">
          <Logo className="text-2xl" />
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
              <p className="text-sm text-muted-foreground text-center">
                {t('noAccount')}{' '}
                <Link href="/new" className="underline underline-offset-4">
                  {t('signUpLink')}
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
