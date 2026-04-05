'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { getTemplates, saveTemplate, applyTemplate } from '@/app/actions/schedule-templates';
import type { ScheduleTemplate, TemplateItem } from '@/app/actions/schedule-templates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  dayId: string;
  currentItems: TemplateItem[];
  onApplied: () => void;
}

export function TemplateDialog({ isOpen, onClose, dayId, currentItems, onApplied }: Props) {
  const t = useTranslations('Tenant.templates');
  const isMobile = useIsMobile();
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  // Save tab state
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);

  // Apply tab state
  const [selectedId, setSelectedId] = useState('');
  const [applyMode, setApplyMode] = useState<'merge' | 'replace'>('merge');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    getTemplates().then((r) => {
      if (r.success) setTemplates(r.data);
      setLoading(false);
    });
  }, [isOpen]);

  async function handleSave() {
    if (!saveName.trim()) return;
    setSaving(true);
    try {
      const result = await saveTemplate(saveName.trim(), currentItems);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(t('saved'));
      setSaveName('');
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleApply() {
    if (!selectedId) return;
    setApplying(true);
    try {
      const result = await applyTemplate(dayId, selectedId, applyMode);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(t('applied'));
      onApplied();
      onClose();
    } finally {
      setApplying(false);
    }
  }

  const inner = (
    <Tabs defaultValue="apply" className="mt-4">
      <TabsList className="w-full">
        <TabsTrigger value="apply" className="flex-1">{t('tabApply')}</TabsTrigger>
        <TabsTrigger value="save" className="flex-1">{t('tabSave')}</TabsTrigger>
      </TabsList>

      <TabsContent value="apply" className="space-y-4 pt-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">{t('loading')}</p>
        ) : templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noTemplates')}</p>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label>{t('templateLabel')}</Label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">{t('selectTemplate')}</option>
                {templates.map((tmpl) => (
                  <option key={tmpl.id} value={tmpl.id}>
                    {tmpl.name} ({t('activityCount', { count: tmpl.items.length })})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>{t('modeLabel')}</Label>
              <div className="flex gap-3">
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="radio"
                    value="merge"
                    checked={applyMode === 'merge'}
                    onChange={() => setApplyMode('merge')}
                  />
                  {t('modeMerge')}
                </label>
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="radio"
                    value="replace"
                    checked={applyMode === 'replace'}
                    onChange={() => setApplyMode('replace')}
                  />
                  {t('modeReplace')}
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose} disabled={applying}>{t('cancel')}</Button>
              <Button onClick={handleApply} disabled={applying || !selectedId}>
                {applying ? t('applying') : t('apply')}
              </Button>
            </div>
          </>
        )}
      </TabsContent>

      <TabsContent value="save" className="space-y-4 pt-4">
        {currentItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noActivities')}</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {t('saveCount', { count: currentItems.length })}
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="template-name">{t('nameLabel')}</Label>
              <Input
                id="template-name"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder={t('namePlaceholder')}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose} disabled={saving}>{t('cancel')}</Button>
              <Button onClick={handleSave} disabled={saving || !saveName.trim()}>
                {saving ? t('saving') : t('saveButton')}
              </Button>
            </div>
          </>
        )}
      </TabsContent>
    </Tabs>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(o) => !o && onClose()}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t('dialogTitle')}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6">{inner}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('dialogTitle')}</DialogTitle>
        </DialogHeader>
        {inner}
      </DialogContent>
    </Dialog>
  );
}
