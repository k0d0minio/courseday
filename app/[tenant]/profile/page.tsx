import { getTranslations } from 'next-intl/server'
import { requireTenantMember } from '@/lib/guards'
import { getMemberProfile } from '@/app/actions/memberships'
import { signOut } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { ProfileForm } from './profile-form'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ProfilePage() {
  await requireTenantMember()
  const t = await getTranslations('Tenant.profile')
  const result = await getMemberProfile()
  const profile = result.success ? result.data : null

  return (
    <div className="mx-auto max-w-lg px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold">{t('title')}</h1>
      <ProfileForm
        initialFirstName={profile?.first_name ?? ''}
        initialLastName={profile?.last_name ?? ''}
        initialJobTitle={profile?.job_title ?? ''}
      />

      <div className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">{t('accountSection')}</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">{t('theme')}</span>
            <ThemeToggle />
          </div>
          <form action={signOut}>
            <Button type="submit" variant="destructive" className="w-full" data-testid="sign-out">
              {t('signOut')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
