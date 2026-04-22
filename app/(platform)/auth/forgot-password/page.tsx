'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { sendPasswordResetEmail } from '@/app/actions/auth';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordPage() {
  const [state, action, isPending] = useActionState(sendPasswordResetEmail, null);
  const searchParams = useSearchParams();
  const slug = searchParams.get('slug') ?? '';
  const t = useTranslations('Platform.auth');

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
              {t('forgotPasswordTitle')}
            </h1>
          </CardHeader>

          <form action={action}>
            <input type="hidden" name="slug" value={slug} />
            <CardContent className="space-y-4">
              {state?.error && (
                <p className="text-sm text-destructive">{state.error}</p>
              )}
              {state?.success && (
                <p className="text-sm text-green-700">{state.success}</p>
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
            </CardContent>
            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? t('sendingReset') : t('sendResetButton')}
              </Button>
              <Link href="/auth/sign-in" className="text-sm underline underline-offset-4">
                {t('backToSignIn')}
              </Link>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
