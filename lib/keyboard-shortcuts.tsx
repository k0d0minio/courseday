'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import { useFeatureFlag } from '@/lib/feature-flags-context';
import {
  SUPERADMIN_ROLE_QUERY_PARAM,
  type SuperadminRole,
} from '@/lib/superadmin-impersonation';
import { adjacentDayYmd } from '@/lib/day-navigation';
import { useActiveDay } from '@/lib/active-day-context';
import { CommandPalette } from '@/components/command-palette';
import { KeyboardShortcutsSheet } from '@/components/keyboard-shortcuts-sheet';
import { isEditableTarget } from '@/lib/is-editable-target';

export { isEditableTarget };

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

type KeyboardShortcutsContextValue = {
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  shortcutsSheetOpen: boolean;
  setShortcutsSheetOpen: (open: boolean) => void;
  /** When true, day-level single-letter shortcuts should not run. */
  dayHotkeysSuspended: boolean;
};

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextValue | null>(null);

export function useKeyboardShortcuts(): KeyboardShortcutsContextValue {
  const ctx = useContext(KeyboardShortcutsContext);
  if (!ctx) {
    throw new Error('useKeyboardShortcuts must be used within KeyboardShortcutsProvider');
  }
  return ctx;
}

export function KeyboardShortcutsProvider({ children }: { children: ReactNode }) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsSheetOpen, setShortcutsSheetOpen] = useState(false);

  const dayHotkeysSuspended = commandPaletteOpen || shortcutsSheetOpen;

  const value = useMemo(
    () => ({
      commandPaletteOpen,
      setCommandPaletteOpen,
      shortcutsSheetOpen,
      setShortcutsSheetOpen,
      dayHotkeysSuspended,
    }),
    [commandPaletteOpen, shortcutsSheetOpen, dayHotkeysSuspended]
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented) return;
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen((o) => !o);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <KeyboardShortcutsContext.Provider value={value}>
      {children}
      <CommandPalette />
      <KeyboardShortcutsSheet />
    </KeyboardShortcutsContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Day view hotkeys
// ---------------------------------------------------------------------------

export type DayViewHotkeyHandlers = {
  date: string;
  today: string;
  onOpenActivity?: () => void;
  onOpenReservation?: () => void;
  onOpenBreakfast?: () => void;
  /** Superadmin impersonation only — toggles viewer/editor preview. */
  impersonationRole?: SuperadminRole | null;
};

export function useDayViewHotkeys({
  date,
  today,
  onOpenActivity,
  onOpenReservation,
  onOpenBreakfast,
  impersonationRole,
}: DayViewHotkeyHandlers) {
  const router = useRouter();
  const { isEditor } = useAuth();
  const { dayHotkeysSuspended, setShortcutsSheetOpen } = useKeyboardShortcuts();
  const showReservations = useFeatureFlag('reservations');
  const showBreakfast = useFeatureFlag('breakfast_config');

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented) return;
      if (dayHotkeysSuspended) return;
      const target = e.target;
      if (isEditableTarget(target)) return;

      const key = e.key;

      if (key === '?' || (key === '/' && e.shiftKey)) {
        e.preventDefault();
        setShortcutsSheetOpen(true);
        return;
      }

      if (key === 't' || key === 'T') {
        e.preventDefault();
        if (date !== today) router.push(`/day/${today}`);
        return;
      }

      if (key === 'e' || key === 'E') {
        if (!impersonationRole) return;
        e.preventDefault();
        const next: SuperadminRole = impersonationRole === 'viewer' ? 'editor' : 'viewer';
        const url = new URL(window.location.href);
        url.searchParams.set(SUPERADMIN_ROLE_QUERY_PARAM, next);
        window.location.assign(url.toString());
        return;
      }

      if (key === 'ArrowLeft' || key === 'j' || key === 'J') {
        const prev = adjacentDayYmd(date, today, -1);
        if (prev) {
          e.preventDefault();
          router.push(`/day/${prev}`);
        }
        return;
      }

      if (key === 'ArrowRight' || key === 'k' || key === 'K') {
        const next = adjacentDayYmd(date, today, 1);
        if (next) {
          e.preventDefault();
          router.push(`/day/${next}`);
        }
        return;
      }

      if (!isEditor) return;

      if ((key === 'a' || key === 'A') && onOpenActivity) {
        e.preventDefault();
        onOpenActivity();
        return;
      }
      if ((key === 'r' || key === 'R') && showReservations && onOpenReservation) {
        e.preventDefault();
        onOpenReservation();
        return;
      }
      if ((key === 'b' || key === 'B') && showBreakfast && onOpenBreakfast) {
        e.preventDefault();
        onOpenBreakfast();
        return;
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [
    date,
    today,
    router,
    isEditor,
    dayHotkeysSuspended,
    setShortcutsSheetOpen,
    showReservations,
    showBreakfast,
    onOpenActivity,
    onOpenReservation,
    onOpenBreakfast,
    impersonationRole,
  ]);
}
