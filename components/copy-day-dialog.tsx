'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { copyDaySections } from '@/app/actions/schedule-templates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sourceDayId: string;
  today: string;
  /** When false, staff schedule is not copied and the toggle is hidden. */
  showCopyShifts?: boolean;
}

export function CopyDayDialog({
  isOpen,
  onClose,
  sourceDayId,
  today,
  showCopyShifts = true,
}: Props) {
  const t = useTranslations('Tenant.copyDay');
  const isMobile = useIsMobile();
  const router = useRouter();
  const [targetDate, setTargetDate] = useState('');
  const [copyActivities, setCopyActivities] = useState(true);
  const [copyShifts, setCopyShifts] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTargetDate('');
    setCopyActivities(true);
    setCopyShifts(false);
  }, [isOpen]);

  useEffect(() => {
    if (!showCopyShifts) setCopyShifts(false);
  }, [showCopyShifts]);

  async function handleSubmit() {
    if (!targetDate) return;
    setSaving(true);
    try {
      const result = await copyDaySections(sourceDayId, targetDate, {
        copyActivities,
        copyShifts: showCopyShifts && copyShifts,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      const didCopyShifts = showCopyShifts && copyShifts;
      if (copyActivities && didCopyShifts) toast.success(t('copiedBoth'));
      else if (copyActivities) toast.success(t('copiedActivities'));
      else toast.success(t('copiedShifts'));
      onClose();
      router.push(`/day/${targetDate}`);
    } finally {
      setSaving(false);
    }
  }

  const canSubmit =
    targetDate && (copyActivities || (showCopyShifts && copyShifts));

  const body = (
    <div className="space-y-4 py-2">
      <div className="space-y-1.5">
        <Label htmlFor="copy-target-date">{t('targetDate')}</Label>
        <Input
          id="copy-target-date"
          type="date"
          min={today}
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
        />
      </div>
      <div className="flex items-center justify-between gap-4 rounded-md border p-3">
        <Label htmlFor="copy-activities" className="cursor-pointer">
          {t('copyActivities')}
        </Label>
        <Switch
          id="copy-activities"
          checked={copyActivities}
          onCheckedChange={setCopyActivities}
        />
      </div>
      {showCopyShifts && (
        <div className="flex items-center justify-between gap-4 rounded-md border p-3">
          <Label htmlFor="copy-shifts" className="cursor-pointer">
            {t('copyShifts')}
          </Label>
          <Switch id="copy-shifts" checked={copyShifts} onCheckedChange={setCopyShifts} />
        </div>
      )}
    </div>
  );

  const footer = (
    <>
      <Button variant="outline" onClick={onClose} disabled={saving}>
        {t('cancel')}
      </Button>
      <Button onClick={handleSubmit} disabled={saving || !canSubmit}>
        {saving ? t('copying') : t('copy')}
      </Button>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(o) => !o && onClose()}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t('title')}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4">{body}</div>
          <DrawerFooter className="flex-row justify-end gap-2">{footer}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>
        {body}
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
