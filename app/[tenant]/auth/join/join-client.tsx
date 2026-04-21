'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { completeInvitePassword, type InviteJoinErrorCode } from '@/app/actions/auth';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ERROR_CODES: readonly InviteJoinErrorCode[] = [
  'RATE_LIMIT',
  'TOO_SHORT',
  'MISMATCH',
  'NOT_SIGNED_IN',
  'NO_ACCESS',
] as const;

function isInviteErrorCode(e: string): e is InviteJoinErrorCode {
  return (ERROR_CODES as readonly string[]).includes(e);
}

export function JoinClient({
  tenantName,
  email,
}: {
  tenantName: string;
  email: string;
}) {
  const [state, action, isPending] = useActionState(completeInvitePassword, null);
  const t = useTranslations('Tenant.join');

  const displayError =
    state?.error &&
    (isInviteErrorCode(state.error)
      ? t(`errors.${state.error}`)
      : state.error);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Link href="/" className="inline-flex" aria-label={t('homeAria')}>
            <Logo className="text-2xl" />
          </Link>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-center">
              {t('title', { venue: tenantName })}
            </h1>
            <p className="text-sm text-muted-foreground text-center text-pretty">
              {t('subtitle')}
            </p>
          </CardHeader>

          <form action={action}>
            <CardContent className="space-y-4">
              {displayError && (
                <p className="text-sm text-destructive">{displayError}</p>
              )}

              <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm space-y-1">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{t('venueLabel')}</span>
                  <span className="font-medium text-right">{tenantName}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{t('emailLabel')}</span>
                  <span className="font-medium text-right break-all">{email}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="join-password">{t('passwordLabel')}</Label>
                <Input
                  id="join-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="join-confirm">{t('confirmLabel')}</Label>
                <Input
                  id="join-confirm"
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
                {isPending ? t('submitting') : t('submit')}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
