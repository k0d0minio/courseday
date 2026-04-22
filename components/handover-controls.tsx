'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { markDayCaughtUp } from '@/app/actions/day-view-receipts';
import type { HandoverRemovedItem } from '@/app/actions/day-view-receipts';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

function removedKindLabel(
  kind: HandoverRemovedItem['kind'],
  t: ReturnType<typeof useTranslations<'Tenant.handover'>>
) {
  switch (kind) {
    case 'activity':
      return t('kindActivity');
    case 'reservation':
      return t('kindReservation');
    case 'breakfast':
      return t('kindBreakfast');
    case 'day_note':
      return t('kindNote');
  }
}

export type HandoverCounts = {
  newCount: number;
  editedCount: number;
  removedCount: number;
};

type Props = {
  dayId: string;
  removed: HandoverRemovedItem[];
  handoverEnabled: boolean;
  onHandoverEnabledChange: (enabled: boolean) => void;
  counts: HandoverCounts;
  onCaughtUp: (nextBaselineIso: string) => void;
};

export function HandoverControls({
  dayId,
  removed,
  handoverEnabled,
  onHandoverEnabledChange,
  counts,
  onCaughtUp,
}: Props) {
  const t = useTranslations('Tenant.handover');
  const [busy, setBusy] = useState(false);
  const [removedOpen, setRemovedOpen] = useState(false);

  const hasAnything =
    counts.newCount > 0 || counts.editedCount > 0 || counts.removedCount > 0;

  async function handleCaughtUp() {
    setBusy(true);
    try {
      const result = await markDayCaughtUp(dayId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      onCaughtUp(result.data.last_viewed_at);
      toast.success(t('caughtUpToast'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border bg-muted/40 px-3 py-3 space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <Switch
            id="handover-mode"
            checked={handoverEnabled}
            onCheckedChange={onHandoverEnabledChange}
            aria-label={t('toggleAria')}
          />
          <Label htmlFor="handover-mode" className="text-sm font-medium cursor-pointer">
            {t('toggle')}
          </Label>
        </div>
        {handoverEnabled && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={handleCaughtUp}
          >
            {t('caughtUp')}
          </Button>
        )}
      </div>

      {handoverEnabled && (
        <>
          <p className="text-sm text-muted-foreground">
            {hasAnything
              ? t('summary', {
                  new: counts.newCount,
                  edited: counts.editedCount,
                  removed: counts.removedCount,
                })
              : t('summaryEmpty')}
          </p>

          <div className="border-t border-border/60 pt-2">
            <button
              type="button"
              onClick={() => setRemovedOpen((o) => !o)}
              className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:underline w-full text-left"
              aria-expanded={removedOpen}
            >
              {removedOpen ? (
                <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
              )}
              {t('removedHeading', { count: removed.length })}
            </button>
            {removedOpen && (
              <ul className="mt-2 space-y-1.5 text-sm pl-5 list-disc text-muted-foreground">
                {removed.length === 0 ? (
                  <li className="list-none pl-0 -ml-5">{t('removedEmpty')}</li>
                ) : (
                  removed.map((item) => (
                    <li key={`${item.kind}-${item.id}`}>
                      <span className="text-foreground/90 font-medium">
                        {removedKindLabel(item.kind, t)}
                      </span>
                      : {item.label}
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
