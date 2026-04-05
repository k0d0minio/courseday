'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CalendarDays, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  today: string;
  isEditor: boolean;
}

export function MobileNav({ today, isEditor }: MobileNavProps) {
  const pathname = usePathname();

  const items = [
    { href: '/', label: 'Home', icon: Home, active: pathname === '/' },
    { href: `/day/${today}`, label: 'Today', icon: CalendarDays, active: pathname.startsWith('/day/') },
    ...(isEditor
      ? [{ href: '/admin/settings', label: 'Settings', icon: Settings, active: pathname.startsWith('/admin/') }]
      : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background sm:hidden">
      <div className="flex h-16">
        {items.map(({ href, label, icon: Icon, active }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
              active ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            <Icon className={cn('h-5 w-5', active && 'stroke-[2.5]')} />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
