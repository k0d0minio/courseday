import { SignInForm } from '@/components/auth/sign-in-form'
import { createSupabaseServiceClient } from '@/lib/supabase-server'

type Props = {
  params: Promise<{ tenant: string }>
}

export default async function TenantSignInPage({ params }: Props) {
  const { tenant } = await params

  const supabase = createSupabaseServiceClient()
  const { data } = await supabase
    .from('tenants')
    .select('name, logo_url')
    .eq('slug', tenant)
    .maybeSingle()

  return (
    <SignInForm
      defaultSlug={tenant}
      tenantName={data?.name ?? null}
      logoUrl={data?.logo_url ?? null}
    />
  )
}
