'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { copyDayActivities } from '@/app/actions/schedule-templates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
}

export function CopyDayDialog({ isOpen, onClose, sourceDayId, today }: Props) {
  const isMobile = useIsMobile();
  const router = useRouter();
  const [targetDate, setTargetDate] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!targetDate) return;
    setSaving(true);
    try {
      const result = await copyDayActivities(sourceDayId, targetDate);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('Activities copied.');
      onClose();
      router.push(`/day/${targetDate}`);
    } finally {
      setSaving(false);
    }
  }

  const body = (
    <div className="space-y-4 py-2">
      <div className="space-y-1.5">
        <Label htmlFor="copy-target-date">Target date</Label>
        <Input
          id="copy-target-date"
          type="date"
          min={today}
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
        />
      </div>
    </div>
  );

  const footer = (
    <>
      <Button variant="outline" onClick={onClose} disabled={saving}>
        Cancel
      </Button>
      <Button onClick={handleSubmit} disabled={saving || !targetDate}>
        {saving ? 'Copying…' : 'Copy'}
      </Button>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(o) => !o && onClose()}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Copy activities to another day</DrawerTitle>
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
          <DialogTitle>Copy activities to another day</DialogTitle>
        </DialogHeader>
        {body}
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
