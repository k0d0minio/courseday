import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Logo } from '@/components/logo'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createSupabaseServiceClient } from '@/lib/supabase-server'

type Props = {
  params: Promise<{ tenant: string }>
}

export default async function TenantSignUpPage({ params }: Props) {
  const { tenant } = await params

  const supabase = createSupabaseServiceClient()
  const { data } = await supabase
    .from('tenants')
    .select('name, logo_url')
    .eq('slug', tenant)
    .maybeSingle()

  const t = await getTranslations('Platform.auth')
  const tenantName = data?.name ?? null
  const logoUrl = data?.logo_url ?? null
  const heading = tenantName ? `Join ${tenantName}` : t('signInTitle')

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

          <CardContent className="space-y-4 pt-2 text-center">
            <p className="text-muted-foreground text-sm">{t('inviteOnlyHint')}</p>
            <Button asChild className="w-full">
              <Link href="/auth/sign-in">{t('backToSignIn')}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
