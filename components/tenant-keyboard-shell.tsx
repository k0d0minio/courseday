'use client';

import type { ReactNode } from 'react';
import { ActiveDayProvider } from '@/lib/active-day-context';
import { KeyboardShortcutsProvider } from '@/lib/keyboard-shortcuts';

export function TenantKeyboardShell({
  tenantTodayYmd,
  children,
}: {
  tenantTodayYmd: string;
  children: ReactNode;
}) {
  return (
    <ActiveDayProvider tenantTodayYmd={tenantTodayYmd}>
      <KeyboardShortcutsProvider>{children}</KeyboardShortcutsProvider>
    </ActiveDayProvider>
  );
}
