'use client'

import { useActionState, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { platformSignIn } from '@/app/actions/auth'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'
import { protocol, rootDomain } from '@/lib/utils'

interface SignInFormProps {
  defaultSlug?: string
  tenantName?: string | null
  logoUrl?: string | null
}

export function SignInForm({ defaultSlug, tenantName, logoUrl }: SignInFormProps = {}) {
  const [state, action, isPending] = useActionState(platformSignIn, null)
  const [magicState, setMagicState] = useState<{ error?: string; success?: string } | null>(null)
  const [isMagicPending, setIsMagicPending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const searchParams = useSearchParams()
  const slug = defaultSlug ?? searchParams.get('slug')?.trim() ?? ''
  const t = useTranslations('Platform.auth')

  // When auth tokens arrive in the URL (invite / magic link fallback), forward to
  // the confirm handler. On tenant subdomains the handler lives on the root domain.
  useEffect(() => {
    const confirmBase = defaultSlug ? `${protocol}://${rootDomain}` : window.location.origin
    const query = new URLSearchParams(window.location.search)
    if (query.get('code')) {
      window.location.replace(`${confirmBase}/auth/confirm${window.location.search}`)
      return
    }
    if (query.get('token_hash')) {
      window.location.replace(`${confirmBase}/auth/confirm${window.location.search}`)
      return
    }
    const hash = window.location.hash
    if (!hash || !hash.includes('access_token')) return
    window.location.replace(`${confirmBase}/auth/confirm${hash}`)
  }, [defaultSlug])

  async function handleMagicLink() {
    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setMagicState({ error: 'Email is required.' })
      return
    }

    setIsMagicPending(true)
    setMagicState(null)

    // Confirm handler lives on the root domain — always target it directly so
    // tenant-subdomain magic links resolve to a valid route.
    const confirmBase = defaultSlug ? `${protocol}://${rootDomain}` : window.location.origin
    const redirectUrl = new URL('/auth/confirm', confirmBase)
    redirectUrl.searchParams.set('flow', 'magic')
    if (slug) redirectUrl.searchParams.set('slug', slug)

    const supabase = createSupabaseBrowserClient({
      flowType: 'implicit',
      isSingleton: false,
    })
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: redirectUrl.toString(),
      },
    })

    if (error) {
      setMagicState({ error: error.message })
    } else {
      setMagicState({ success: 'Check your email for a sign-in link.' })
    }
    setIsMagicPending(false)
  }

  const heading = tenantName ? `Sign in to ${tenantName}` : t('signInTitle')

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-center">
          <Logo logoUrl={logoUrl} tenantName={tenantName} className="text-2xl" />
        </div>

        <Card>
          <CardHeader>
            <h1 className="text-center text-xl font-semibold tracking-tight">{heading}</h1>
          </CardHeader>

          <form action={action}>
            <input type="hidden" name="slug" value={slug} />
            <CardContent className="space-y-4">
              {state?.error && <p className="text-destructive text-sm">{state.error}</p>}
              {magicState?.error && <p className="text-destructive text-sm">{magicState.error}</p>}
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
              {!defaultSlug && (
                <>
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm underline underline-offset-4"
                  >
                    {t('forgotPasswordLink')}
                  </Link>
                  <p className="text-muted-foreground text-center text-sm">
                    {t('createVenuePrompt')}{' '}
                    <Link href="/new" className="underline underline-offset-4">
                      {t('createVenueLink')}
                    </Link>
                  </p>
                </>
              )}
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
