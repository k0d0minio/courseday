'use client';

import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/AuthProvider';
import { useFeatureFlag } from '@/lib/feature-flags-context';
import { useKeyboardShortcuts } from '@/lib/keyboard-shortcuts';
import { modKeyLabel } from '@/lib/mod-key';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function Row({ keys, label }: { keys: string; label: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <kbd
        className="shrink-0 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
        aria-hidden
      >
        {keys}
      </kbd>
    </div>
  );
}

export function KeyboardShortcutsSheet() {
  const t = useTranslations('Tenant.shortcuts');
  const { isEditor, impersonationRole } = useAuth();
  const showReservations = useFeatureFlag('reservations');
  const showBreakfast = useFeatureFlag('breakfast_config');
  const { shortcutsSheetOpen, setShortcutsSheetOpen } = useKeyboardShortcuts();
  const mod = modKeyLabel();

  return (
    <Dialog open={shortcutsSheetOpen} onOpenChange={setShortcutsSheetOpen}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t('sheetTitle')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <section>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('sheetGlobal')}
            </h3>
            <Row keys={`${mod} K`} label={t('sheetOpenPalette')} />
          </section>

          <section>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('sheetDayNav')}
            </h3>
            <Row keys="J / ←" label={t('sheetPrevDay')} />
            <Row keys="K / →" label={t('sheetNextDay')} />
            <Row keys="T" label={t('sheetToday')} />
            <Row keys="?" label={t('sheetCheat')} />
          </section>

          {isEditor && (
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('sheetEditor')}
              </h3>
              <Row keys="A" label={t('sheetNewActivity')} />
              {showReservations && <Row keys="R" label={t('sheetNewReservation')} />}
              {showBreakfast && <Row keys="B" label={t('sheetNewBreakfast')} />}
            </section>
          )}

          {impersonationRole ? (
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('sheetPreview')}
              </h3>
              <Row keys="E" label={t('sheetTogglePreview')} />
            </section>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
