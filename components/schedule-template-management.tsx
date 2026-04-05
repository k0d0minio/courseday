'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { getTemplates, deleteTemplate } from '@/app/actions/schedule-templates';
import type { ScheduleTemplate } from '@/app/actions/schedule-templates';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function ScheduleTemplateManagement() {
  const t = useTranslations('Tenant.templates');
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getTemplates();
    if (result.success) {
      setTemplates(result.data);
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    setDeleting(id);
    const result = await deleteTemplate(id);
    if (!result.success) {
      toast.error(result.error);
    } else {
      toast.success(t('deleted'));
      setTemplates((prev) => prev.filter((tmpl) => tmpl.id !== id));
    }
    setDeleting(null);
  }

  if (loading) return <p className="text-sm text-muted-foreground">{t('loading')}</p>;

  if (templates.length === 0) {
    // Templates are created from the day view — link there so users know where to go.
    const today = new Date().toISOString().split('T')[0];
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{t('settingsEmpty')}</p>
        <Button asChild variant="outline" size="sm">
          <Link href={`/day/${today}`}>{t('goToDayView')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {templates.map((tmpl) => (
        <div
          key={tmpl.id}
          className="flex items-center justify-between rounded-lg border bg-card px-4 py-3"
        >
          <div>
            <p className="font-medium">{tmpl.name}</p>
            <p className="text-xs text-muted-foreground">
              {t('activityCount', { count: tmpl.items.length })}
            </p>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" disabled={deleting === tmpl.id}>
                {deleting === tmpl.id ? t('deleting') : t('delete')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('deleteTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('deleteDescription', { name: tmpl.name })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleDelete(tmpl.id)}>{t('delete')}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ))}
    </div>
  );
}
