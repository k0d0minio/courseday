'use client';

import { useActionState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { sendSignInMagicLink, signIn } from '@/app/actions/auth';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { protocol, rootDomain } from '@/lib/utils';

export default function SignInPage() {
  const [state, action, isPending] = useActionState(signIn, null);
  const [magicState, magicAction, isMagicPending] = useActionState(sendSignInMagicLink, null);
  const searchParams = useSearchParams();
  const params = useParams<{ tenant: string }>();
  const redirectTo = searchParams.get('redirectTo') ?? '/';
  const tenantSlug = params.tenant ?? '';
  const t = useTranslations('Platform.auth');

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get('code')) {
      window.location.replace(`${protocol}://${rootDomain}/auth/confirm${window.location.search}`);
      return;
    }
    if (query.get('token_hash')) {
      window.location.replace(`${protocol}://${rootDomain}/auth/confirm${window.location.search}`);
      return;
    }
    const hash = window.location.hash;
    if (!hash || !hash.includes('access_token')) return;
    window.location.replace(`${protocol}://${rootDomain}/auth/confirm${hash}`);
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
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <input type="hidden" name="slug" value={tenantSlug} />
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
              <Link
                href={`/auth/forgot-password?slug=${encodeURIComponent(tenantSlug)}`}
                className="text-sm underline underline-offset-4"
              >
                {t('forgotPasswordLink')}
              </Link>
              <p className="text-sm text-muted-foreground text-center">
                {t('inviteOnlyHint')}
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
