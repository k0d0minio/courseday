'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { updateBreakfastConfiguration } from '@/app/actions/breakfast';
import type { BreakfastConfiguration } from '@/types/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  editItem: BreakfastConfiguration;
  onSuccess: (config: BreakfastConfiguration) => void;
};

export function AddBreakfastModal({ isOpen, onClose, editItem, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();
  const [tableBreakdown, setTableBreakdown] = useState('');
  const [startTime, setStartTime] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setTableBreakdown(
      Array.isArray(editItem.table_breakdown)
        ? (editItem.table_breakdown as number[]).join('+')
        : ''
    );
    setStartTime(editItem.start_time ?? '');
    setNotes(editItem.notes ?? '');
  }, [isOpen, editItem]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateBreakfastConfiguration(editItem.id, {
        tableBreakdown: tableBreakdown || undefined,
        startTime: startTime || undefined,
        notes: notes || undefined,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success('Breakfast updated.');
      onSuccess(result.data);
      onClose();
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit breakfast</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="bf-breakdown">Table breakdown</Label>
            <Input
              id="bf-breakdown"
              placeholder="e.g. 3+2+1"
              value={tableBreakdown}
              onChange={(e) => setTableBreakdown(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Enter seat counts separated by +
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="bf-time">Start time</Label>
            <Input
              id="bf-time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="bf-notes">Notes</Label>
            <Textarea
              id="bf-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
