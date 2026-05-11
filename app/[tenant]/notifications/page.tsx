import { getTranslations } from 'next-intl/server'
import { requireTenantMember } from '@/lib/guards'
import { getNotificationsPage } from '@/app/actions/notifications'
import { NotificationsClient, PAGE_SIZE } from './notifications-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function NotificationsPage() {
  await requireTenantMember()
  const t = await getTranslations('Tenant.notifications')
  const result = await getNotificationsPage(0, PAGE_SIZE)
  const initial = result.success ? result.data : { notifications: [], hasMore: false }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-6 text-xl font-bold">{t('title')}</h1>
      <NotificationsClient
        initialNotifications={initial.notifications}
        initialHasMore={initial.hasMore}
      />
    </div>
  )
}
