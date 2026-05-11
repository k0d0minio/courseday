'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  getNotificationsPage,
  markNotificationRead,
  markAllRead,
} from '@/app/actions/notifications'
import type { Notification } from '@/app/actions/notifications'
import { cn } from '@/lib/utils'

export const PAGE_SIZE = 30

interface NotificationsClientProps {
  initialNotifications: Notification[]
  initialHasMore: boolean
}

export function NotificationsClient({
  initialNotifications,
  initialHasMore,
}: NotificationsClientProps) {
  const t = useTranslations('Tenant.notifications')
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [isLoadingMore, startLoadMoreTransition] = useTransition()
  const [isMarkingAll, startMarkAllTransition] = useTransition()

  const hasUnread = notifications.some((n) => !n.read)

  function handleClickNotification(notification: Notification) {
    if (!notification.read) {
      markNotificationRead(notification.id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      )
    }
  }

  function handleMarkAllRead() {
    startMarkAllTransition(async () => {
      await markAllRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    })
  }

  function handleLoadMore() {
    startLoadMoreTransition(async () => {
      const result = await getNotificationsPage(notifications.length, PAGE_SIZE)
      if (result.success) {
        setNotifications((prev) => [...prev, ...result.data.notifications])
        setHasMore(result.data.hasMore)
      }
    })
  }

  if (notifications.length === 0) {
    return <p className="text-muted-foreground py-12 text-center text-sm">{t('empty')}</p>
  }

  return (
    <div>
      {hasUnread && (
        <div className="mb-3 flex justify-end">
          <Button
            variant="link"
            size="sm"
            disabled={isMarkingAll}
            onClick={handleMarkAllRead}
            data-testid="notifications-mark-all-read"
          >
            {t('markAllRead')}
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-md border">
        {notifications.map((n) => {
          const rowClass = cn(
            'border-b px-4 py-3 transition-colors last:border-0',
            n.read ? 'bg-background' : 'bg-primary/5'
          )
          const rowContent = (
            <div className="flex items-start gap-2">
              {!n.read && <span className="bg-primary mt-1.5 h-2 w-2 shrink-0 rounded-full" />}
              <div className={cn('flex-1', n.read && 'pl-4')}>
                <p className="text-sm leading-snug font-medium">{n.title}</p>
                {n.body && <p className="text-muted-foreground mt-0.5 text-xs">{n.body}</p>}
                <p className="text-muted-foreground mt-1 text-[10px]">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          )

          if (n.link) {
            return (
              <Link
                key={n.id}
                href={n.link}
                className={cn(rowClass, 'hover:bg-accent block cursor-pointer')}
                onClick={() => handleClickNotification(n)}
              >
                {rowContent}
              </Link>
            )
          }
          if (!n.read) {
            return (
              // Bespoke notification row — full-bleed block layout doesn't fit Button primitive.
              // eslint-disable-next-line no-restricted-syntax
              <button
                key={n.id}
                type="button"
                className={cn(rowClass, 'hover:bg-accent w-full cursor-pointer text-left')}
                onClick={() => handleClickNotification(n)}
              >
                {rowContent}
              </button>
            )
          }
          return (
            <div key={n.id} className={rowClass}>
              {rowContent}
            </div>
          )
        })}
      </div>

      {hasMore && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            disabled={isLoadingMore}
            onClick={handleLoadMore}
            data-testid="notifications-load-more"
          >
            {isLoadingMore ? t('loading') : t('loadMore')}
          </Button>
        </div>
      )}
    </div>
  )
}
