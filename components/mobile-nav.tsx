'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, CalendarDays, Settings, Sparkles, CalendarCheck, Bell } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer'
import { getVisibleSettingsRoutes } from '@/components/settings-dropdown'
import { useFeatureFlag } from '@/lib/feature-flags-context'
import { useQuickAdd } from '@/lib/quick-add-context'
import { getUnreadCount } from '@/app/actions/notifications'

interface MobileNavProps {
  today: string
  isEditor: boolean
  isMember: boolean
  initialUnreadCount: number
}

const POLL_INTERVAL_MS = 30_000

export function MobileNav({ today, isEditor, isMember, initialUnreadCount }: MobileNavProps) {
  const pathname = usePathname()
  const navT = useTranslations('Tenant.nav')
  const settingsT = useTranslations('Tenant.settings')
  const qaT = useTranslations('Tenant.quickAdd')
  const showChecklists = useFeatureFlag('checklists')
  const showStaffSchedule = useFeatureFlag('staff_schedule')
  const { setQuickAddOpen } = useQuickAdd()
  const settingsRoutes = getVisibleSettingsRoutes({
    checklists: showChecklists,
    staffSchedule: showStaffSchedule,
  })

  const [unreadCount, setUnreadCount] = useState(initialUnreadCount)

  useEffect(() => {
    if (!isMember) return
    let cancelled = false
    async function refresh() {
      const count = await getUnreadCount()
      if (!cancelled) setUnreadCount(count)
    }
    const id = setInterval(refresh, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [isMember, pathname])

  const notificationsActive = pathname.startsWith('/notifications')

  const navItems = [
    { href: '/', label: navT('home'), icon: Home, active: pathname === '/' },
    {
      href: `/day/${today}`,
      label: navT('today'),
      icon: CalendarDays,
      active: pathname.startsWith('/day/'),
    },
    ...(showStaffSchedule && !isEditor
      ? [
          {
            href: '/my-schedule',
            label: navT('mySchedule'),
            icon: CalendarCheck,
            active: pathname.startsWith('/my-schedule'),
          },
        ]
      : []),
  ]

  const settingsActive = pathname.startsWith('/admin/')

  return (
    <nav
      aria-label="Main navigation"
      className="bg-background fixed right-0 bottom-0 left-0 z-50 border-t sm:hidden"
    >
      <div className="flex h-16">
        {navItems.map(({ href, label, icon: Icon, active }) => (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
              active ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            <Icon className={cn('h-5 w-5', active && 'stroke-[2.5]')} aria-hidden="true" />
            {label}
          </Link>
        ))}

        {isMember && (
          <Link
            href="/notifications"
            aria-current={notificationsActive ? 'page' : undefined}
            aria-label={
              unreadCount > 0
                ? `${navT('notifications')} (${unreadCount} ${navT('unread')})`
                : navT('notifications')
            }
            className={cn(
              'relative flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
              notificationsActive ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            <span className="relative">
              <Bell
                className={cn('h-5 w-5', notificationsActive && 'stroke-[2.5]')}
                aria-hidden="true"
              />
              {unreadCount > 0 && (
                <span className="bg-primary text-primary-foreground absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </span>
            {navT('notifications')}
          </Link>
        )}

        {isEditor && (
          /* Quick-add center slot — tab nav trigger, bespoke surface. */
          /* eslint-disable-next-line no-restricted-syntax */
          <button
            aria-label={qaT('openButton')}
            onClick={() => setQuickAddOpen(true)}
            className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors"
          >
            <Sparkles className="h-5 w-5" aria-hidden="true" />
            {qaT('openButton')}
          </button>
        )}

        {isEditor && (
          <Drawer direction="bottom">
            <DrawerTrigger asChild>
              {/* Tab nav drawer trigger — matches sibling Link layout, bespoke surface. */}
              {/* eslint-disable-next-line no-restricted-syntax */}
              <button
                aria-label={navT('settings')}
                aria-current={settingsActive ? 'page' : undefined}
                className={cn(
                  'flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
                  settingsActive ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                <Settings
                  className={cn('h-5 w-5', settingsActive && 'stroke-[2.5]')}
                  aria-hidden="true"
                />
                {navT('settings')}
              </button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>{settingsT('title')}</DrawerTitle>
              </DrawerHeader>
              <div className="flex flex-col gap-1 px-4 pb-8">
                <DrawerClose asChild>
                  <Link
                    href="/profile"
                    className="hover:bg-accent flex items-center rounded-md px-3 py-3 text-sm transition-colors"
                  >
                    {navT('profile')}
                  </Link>
                </DrawerClose>
                {settingsRoutes.map(({ href, labelKey }) => (
                  <DrawerClose key={href} asChild>
                    <Link
                      href={href}
                      className="hover:bg-accent flex items-center rounded-md px-3 py-3 text-sm transition-colors"
                    >
                      {settingsT(labelKey as Parameters<typeof settingsT>[0])}
                    </Link>
                  </DrawerClose>
                ))}
              </div>
            </DrawerContent>
          </Drawer>
        )}
      </div>
    </nav>
  )
}
