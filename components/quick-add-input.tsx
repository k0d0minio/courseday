'use client';

import { useState, useTransition, type FormEvent, useId } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Sparkles } from 'lucide-react';
import { parseQuickAdd } from '@/app/actions/quick-add';
import type { QuickAddParseData } from '@/lib/quick-add-types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contextDate: string;
  onSuccess: (data: QuickAddParseData, raw: string) => void;
  /** Any server failure: parent decides (toast only vs open form with raw in notes). */
  onParseFailed: (raw: string, errorMessage: string) => void;
  disabled?: boolean;
};

export function QuickAddInput({
  open,
  onOpenChange,
  contextDate,
  onSuccess,
  onParseFailed,
  disabled,
}: Props) {
  const t = useTranslations('Tenant.quickAdd');
  const [text, setText] = useState('');
  const [isPending, startTransition] = useTransition();
  const errId = useId();

  function close() {
    onOpenChange(false);
    setText('');
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const v = text.trim();
    if (!v || isPending) return;
    startTransition(async () => {
      const r = await parseQuickAdd(v, contextDate);
      if (!r.success) {
        onParseFailed(v, r.error);
        close();
        return;
      }
      onSuccess(r.data, v);
      close();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          onOpenChange(false);
          setText('');
        } else onOpenChange(true);
      }}
    >
      <DialogContent className="sm:max-w-md" aria-describedby={errId}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            {t('title')}
          </DialogTitle>
        </DialogHeader>
        <p id={errId} className="text-sm text-muted-foreground">
          {t('description', { contextDate })}
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="quick-add-textarea">{t('inputLabel')}</Label>
            <Textarea
              id="quick-add-textarea"
              className="min-h-[100px] resize-y"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('placeholder')}
              autoFocus
              disabled={isPending || disabled}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={close} disabled={isPending}>
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isPending || !text.trim() || disabled}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  {t('parsing')}
                </>
              ) : (
                t('submit')
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
