'use client';

import { useActionState, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { platformSignIn } from '@/app/actions/auth';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';

export function SignInForm() {
  const [state, action, isPending] = useActionState(platformSignIn, null);
  const [magicState, setMagicState] = useState<{ error?: string; success?: string } | null>(null);
  const [isMagicPending, setIsMagicPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const searchParams = useSearchParams();
  const slug = searchParams.get('slug')?.trim() ?? '';
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

  async function handleMagicLink() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setMagicState({ error: 'Email is required.' });
      return;
    }

    setIsMagicPending(true);
    setMagicState(null);

    const redirectUrl = new URL('/auth/confirm', window.location.origin);
    redirectUrl.searchParams.set('flow', 'magic');
    if (slug) redirectUrl.searchParams.set('slug', slug);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: redirectUrl.toString(),
      },
    });

    if (error) {
      setMagicState({ error: error.message });
    } else {
      setMagicState({ success: 'Check your email for a sign-in link.' });
    }
    setIsMagicPending(false);
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
              {t('signInTitle')}
            </h1>
          </CardHeader>

          <form action={action}>
            <input type="hidden" name="slug" value={slug} />
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
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>

              {showPassword && (
                <div className="space-y-2">
                  <Label htmlFor="password">{t('passwordLabel')}</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required={showPassword}
                  />
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={isMagicPending}
                onClick={handleMagicLink}
              >
                {isMagicPending ? t('sendingMagicLink') : t('magicLinkButton')}
              </Button>
              {!showPassword ? (
                <Button
                  type="button"
                  className="w-full"
                  variant="secondary"
                  onClick={() => setShowPassword(true)}
                >
                  {t('usePasswordButton')}
                </Button>
              ) : (
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? t('signingIn') : t('signInButton')}
                </Button>
              )}
              <Link href="/auth/forgot-password" className="text-sm underline underline-offset-4">
                {t('forgotPasswordLink')}
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
