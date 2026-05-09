import { getTranslations } from 'next-intl/server'
import { requireTenantMember } from '@/lib/guards'
import { getMemberProfile } from '@/app/actions/memberships'
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
    </div>
  )
}
