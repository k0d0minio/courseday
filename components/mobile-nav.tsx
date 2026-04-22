'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CalendarDays, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';
import { getVisibleSettingsRoutes } from '@/components/settings-dropdown';
import { useFeatureFlag } from '@/lib/feature-flags-context';

interface MobileNavProps {
  today: string;
  isEditor: boolean;
}

export function MobileNav({ today, isEditor }: MobileNavProps) {
  const pathname = usePathname();
  const navT = useTranslations('Tenant.nav');
  const settingsT = useTranslations('Tenant.settings');
  const showChecklists = useFeatureFlag('checklists');
  const showStaffSchedule = useFeatureFlag('staff_schedule');
  const settingsRoutes = getVisibleSettingsRoutes({
    checklists: showChecklists,
    staffSchedule: showStaffSchedule,
  });

  const navItems = [
    { href: '/', label: navT('home'), icon: Home, active: pathname === '/' },
    {
      href: `/day/${today}`,
      label: navT('today'),
      icon: CalendarDays,
      active: pathname.startsWith('/day/'),
    },
  ];

  const settingsActive = pathname.startsWith('/admin/');

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background sm:hidden"
    >
      <div className="flex h-16">
        {navItems.map(({ href, label, icon: Icon, active }) => (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
              active ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            <Icon className={cn('h-5 w-5', active && 'stroke-[2.5]')} aria-hidden="true" />
            {label}
          </Link>
        ))}

        {isEditor && (
          <Drawer direction="bottom">
            <DrawerTrigger asChild>
              <button
                aria-label={navT('settings')}
                aria-current={settingsActive ? 'page' : undefined}
                className={cn(
                  'flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
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
              <div className="px-4 pb-8 flex flex-col gap-1">
                {settingsRoutes.map(({ href, labelKey }) => (
                  <DrawerClose key={href} asChild>
                    <Link
                      href={href}
                      className="flex items-center rounded-md px-3 py-3 text-sm hover:bg-accent transition-colors"
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
  );
}
