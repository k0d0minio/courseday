'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { signUp } from '@/app/actions/auth';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SignUpPage() {
  const [state, action, isPending] = useActionState(signUp, null);
  const t = useTranslations('Platform.auth');

  if (state?.success) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex justify-center">
            <Logo className="text-2xl" />
          </div>
          <Card>
            <CardContent className="pt-6 text-center space-y-2">
              <p className="font-medium">{t('checkEmail')}</p>
              <p className="text-sm text-muted-foreground">
                {t('checkEmailBody')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-center">
          <Logo className="text-2xl" />
        </div>

        <Card>
          <CardHeader>
            <h1 className="text-xl font-semibold tracking-tight text-center">
              {t('signUpTitle')}
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
                  autoComplete="new-password"
                  required
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? t('creatingAccount') : t('signUpButton')}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                {t('haveAccount')}{' '}
                <Link href="/auth/sign-in" className="underline underline-offset-4">
                  {t('signInLink')}
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
