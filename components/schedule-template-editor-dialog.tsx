'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { getAllPOCs } from '@/app/actions/poc';
import { getAllVenueTypes } from '@/app/actions/venue-type';
import {
  saveTemplate,
  updateTemplate,
} from '@/app/actions/schedule-templates';
import type { ScheduleTemplate, TemplateItem } from '@/app/actions/schedule-templates';
import type { PointOfContact, VenueType } from '@/types/index';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const NONE = '__none__';

function emptyLine(): TemplateItem {
  return {
    title: '',
    start_time: null,
    end_time: null,
    expected_covers: null,
    venue_type_id: null,
    poc_id: null,
    notes: null,
  };
}

function timeForInput(v: string | null | undefined): string {
  if (!v) return '';
  const s = v.trim();
  return s.length >= 5 ? s.slice(0, 5) : s;
}

function timeFromInput(v: string): string | null {
  const t = v.trim();
  return t ? t : null;
}

function coversForInput(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '';
  return String(n);
}

function coversFromInput(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(n) : null;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = create */
  template: ScheduleTemplate | null;
  onSaved: (t: ScheduleTemplate) => void;
};

export function ScheduleTemplateEditorDialog({
  open,
  onOpenChange,
  template,
  onSaved,
}: Props) {
  const t = useTranslations('Tenant.templates');
  const tAct = useTranslations('Tenant.activityForm');
  const [name, setName] = useState('');
  const [lines, setLines] = useState<TemplateItem[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [venueTypes, setVenueTypes] = useState<VenueType[]>([]);
  const [pocs, setPocs] = useState<PointOfContact[]>([]);
  const [metaLoading, setMetaLoading] = useState(false);

  const resetFromProps = useCallback(() => {
    if (template) {
      setName(template.name);
      setLines(
        template.items.length > 0
          ? template.items.map((i) => ({ ...i }))
          : [emptyLine()]
      );
    } else {
      setName('');
      setLines([emptyLine()]);
    }
  }, [template]);

  useEffect(() => {
    if (!open) return;
    resetFromProps();
  }, [open, template, resetFromProps]);

  useEffect(() => {
    if (!open) return;
    setMetaLoading(true);
    Promise.all([getAllVenueTypes(), getAllPOCs()]).then(([vt, pc]) => {
      if (vt.success) setVenueTypes(vt.data);
      if (pc.success) setPocs(pc.data);
      setMetaLoading(false);
    });
  }, [open]);

  function setLine(index: number, patch: Partial<TemplateItem>) {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(index: number) {
    setLines((prev) => (prev.length <= 1 ? [emptyLine()] : prev.filter((_, i) => i !== index)));
  }

  function moveLine(index: number, dir: -1 | 1) {
    setLines((prev) => {
      const j = index + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  }

  async function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error(t('nameRequired'));
      return;
    }

    const items: TemplateItem[] = lines
      .map((line) => ({
        title: line.title.trim(),
        start_time: line.start_time,
        end_time: line.end_time,
        expected_covers: line.expected_covers,
        venue_type_id: line.venue_type_id,
        poc_id: line.poc_id,
        notes: line.notes?.trim() ? line.notes.trim() : null,
      }))
      .filter((line) => line.title.length > 0);

    if (items.length === 0) {
      toast.error(t('needOneActivity'));
      return;
    }

    setSaving(true);
    try {
      if (template) {
        const result = await updateTemplate(template.id, trimmedName, items);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success(t('templateUpdated'));
        onSaved(result.data);
      } else {
        const result = await saveTemplate(trimmedName, items);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success(t('templateCreated'));
        onSaved(result.data);
      }
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-h-[min(90vh,880px)] overflow-y-auto sm:max-w-2xl',
          'gap-0 p-0'
        )}
      >
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>
            {template ? t('editorEditTitle') : t('editorCreateTitle')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-6 pb-2">
          <div className="space-y-1.5">
            <Label htmlFor="st-name">{t('nameLabel')}</Label>
            <Input
              id="st-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('namePlaceholder')}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-medium">{t('activitiesSection')}</p>
              {metaLoading && (
                <span className="text-xs text-muted-foreground">
                  {t('loadingMeta')}
                </span>
              )}
            </div>

            {lines.map((line, index) => (
              <div
                key={index}
                className="rounded-lg border bg-muted/30 p-3 space-y-3"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <Label htmlFor={`st-title-${index}`}>
                      {tAct('titleLabel')}
                    </Label>
                    <Input
                      id={`st-title-${index}`}
                      value={line.title}
                      onChange={(e) => setLine(index, { title: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-1 shrink-0 sm:pt-7">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => moveLine(index, -1)}
                      disabled={index === 0}
                      aria-label={t('moveUpAria')}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => moveLine(index, 1)}
                      disabled={index === lines.length - 1}
                      aria-label={t('moveDownAria')}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeLine(index)}
                      disabled={lines.length === 1}
                      aria-label={t('removeLineAria')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor={`st-start-${index}`}>{tAct('startTimeLabel')}</Label>
                    <Input
                      id={`st-start-${index}`}
                      type="time"
                      value={timeForInput(line.start_time)}
                      onChange={(e) =>
                        setLine(index, { start_time: timeFromInput(e.target.value) })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`st-end-${index}`}>{tAct('endTimeLabel')}</Label>
                    <Input
                      id={`st-end-${index}`}
                      type="time"
                      value={timeForInput(line.end_time)}
                      onChange={(e) =>
                        setLine(index, { end_time: timeFromInput(e.target.value) })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`st-cov-${index}`}>
                      {tAct('expectedCoversLabel')}
                    </Label>
                    <Input
                      id={`st-cov-${index}`}
                      type="number"
                      min={0}
                      value={coversForInput(line.expected_covers)}
                      onChange={(e) =>
                        setLine(index, { expected_covers: coversFromInput(e.target.value) })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>{tAct('venueTypeLabel')}</Label>
                    <Select
                      value={line.venue_type_id ?? NONE}
                      onValueChange={(v) =>
                        setLine(index, {
                          venue_type_id: v === NONE ? null : v,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={tAct('selectVenueType')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>
                          {t('noneOption')}
                        </SelectItem>
                        {venueTypes.map((vt) => (
                          <SelectItem key={vt.id} value={vt.id}>
                            {vt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{tAct('pocLabel')}</Label>
                    <Select
                      value={line.poc_id ?? NONE}
                      onValueChange={(v) =>
                        setLine(index, { poc_id: v === NONE ? null : v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={tAct('selectPoc')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>
                          {t('noneOption')}
                        </SelectItem>
                        {pocs.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`st-notes-${index}`}>{tAct('notesLabel')}</Label>
                  <Textarea
                    id={`st-notes-${index}`}
                    rows={2}
                    className="resize-y min-h-[2.5rem]"
                    value={line.notes ?? ''}
                    onChange={(e) =>
                      setLine(index, { notes: e.target.value || null })
                    }
                  />
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" size="sm" onClick={addLine}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              {t('addActivityLine')}
            </Button>
          </div>
        </div>
        <DialogFooter className="p-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {t('cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t('editorSaving') : t('editorSave')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
