'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getTemplates();
    if (result.success) setTemplates(result.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    setDeleting(id);
    const result = await deleteTemplate(id);
    if (!result.success) {
      toast.error(result.error);
    } else {
      toast.success('Template deleted.');
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    }
    setDeleting(null);
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (templates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No templates yet. Save a day&rsquo;s activities as a template from the day view.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {templates.map((t) => (
        <div
          key={t.id}
          className="flex items-center justify-between rounded-lg border bg-card px-4 py-3"
        >
          <div>
            <p className="font-medium">{t.name}</p>
            <p className="text-xs text-muted-foreground">
              {t.items.length} {t.items.length === 1 ? 'activity' : 'activities'}
            </p>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" disabled={deleting === t.id}>
                {deleting === t.id ? 'Deleting…' : 'Delete'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete template?</AlertDialogTitle>
                <AlertDialogDescription>
                  &ldquo;{t.name}&rdquo; will be permanently deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleDelete(t.id)}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ))}
    </div>
  );
}
