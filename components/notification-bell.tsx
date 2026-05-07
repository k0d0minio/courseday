'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { getNotifications, markNotificationRead, markAllRead } from '@/app/actions/notifications'
import type { Notification } from '@/app/actions/notifications'
import { cn } from '@/lib/utils'

const POLL_INTERVAL_MS = 30_000

export function NotificationBell({ initialCount }: { initialCount: number }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [isMarkingAll, startMarkAllTransition] = useTransition()

  const unreadCount = notifications.filter((n) => !n.read).length

  async function refresh() {
    const result = await getNotifications()
    if (result.success) setNotifications(result.data)
  }

  // Initial load + polling
  useEffect(() => {
    refresh()
    const id = setInterval(refresh, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  function handleOpen(v: boolean) {
    setOpen(v)
  }

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

  const hasUnread = unreadCount > 0
  const displayCount = initialCount + unreadCount // just use live unread count

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications${hasUnread ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell className="h-4 w-4" />
          {hasUnread && (
            <span className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {hasUnread && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs"
              disabled={isMarkingAll}
              onClick={handleMarkAllRead}
            >
              Mark all read
            </Button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">No notifications yet.</p>
          ) : (
            notifications.map((n) => {
              const content = (
                <div
                  className={cn(
                    'border-b px-4 py-3 transition-colors last:border-0',
                    n.read ? 'bg-background' : 'bg-primary/5',
                    n.link && 'hover:bg-accent cursor-pointer'
                  )}
                  onClick={() => handleClickNotification(n)}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && (
                      <span className="bg-primary mt-1.5 h-2 w-2 shrink-0 rounded-full" />
                    )}
                    <div className={cn('flex-1', n.read && 'pl-4')}>
                      <p className="text-sm leading-snug font-medium">{n.title}</p>
                      {n.body && (
                        <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                          {n.body}
                        </p>
                      )}
                      <p className="text-muted-foreground mt-1 text-[10px]">
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )

              return n.link ? (
                <Link
                  key={n.id}
                  href={n.link}
                  onClick={() => {
                    handleClickNotification(n)
                    setOpen(false)
                  }}
                >
                  {content}
                </Link>
              ) : (
                <div key={n.id}>{content}</div>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
