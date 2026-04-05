'use client';

import { useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus } from 'lucide-react';
import {
  getAllActivityTags,
  createActivityTag,
  updateActivityTag,
  deleteActivityTag,
} from '@/app/actions/activity-tags';
import { activityTagSchema, type ActivityTagFormData } from '@/lib/activity-tag-schema';
import type { ActivityTag } from '@/types/index';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function ActivityTagDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: ActivityTag | null;
  onSaved: (tag: ActivityTag) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ActivityTagFormData>({
    resolver: zodResolver(activityTagSchema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    reset({ name: initial?.name ?? '' });
  }, [initial, open, reset]);

  function onSubmit(data: ActivityTagFormData) {
    startTransition(async () => {
      const result = initial
        ? await updateActivityTag(initial.id, data.name)
        : await createActivityTag(data.name);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(initial ? 'Tag updated.' : 'Tag added.');
      onSaved(result.data);
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit tag' : 'Add tag'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tag-name">Name *</Label>
            <Input id="tag-name" {...register('name')} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ActivityTagManagement() {
  const [tags, setTags] = useState<ActivityTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ActivityTag | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ActivityTag | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  useEffect(() => {
    getAllActivityTags().then((result) => {
      if (result.success) setTags(result.data);
      setLoading(false);
    });
  }, []);

  function handleSaved(tag: ActivityTag) {
    setTags((prev) => {
      const idx = prev.findIndex((t) => t.id === tag.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = tag;
        return next;
      }
      return [...prev, tag].sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    startDeleteTransition(async () => {
      const result = await deleteActivityTag(deleteTarget.id);
      if (!result.success) {
        setDeleteError(result.error);
        return;
      }
      setTags((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      toast.success('Tag deleted.');
      setDeleteTarget(null);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Activity Tags</h2>
        <Button
          size="sm"
          onClick={() => { setEditing(null); setDialogOpen(true); }}
        >
          <Plus className="w-4 h-4 mr-1" /> Add tag
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : tags.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity tags yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tags.map((tag) => (
              <TableRow key={tag.id}>
                <TableCell className="font-medium">{tag.name}</TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { setEditing(tag); setDialogOpen(true); }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { setDeleteTarget(tag); setDeleteError(null); }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ActivityTagDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        onSaved={handleSaved}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tag?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteError ? (
                <span className="text-destructive">{deleteError}</span>
              ) : (
                <>This will permanently delete <strong>{deleteTarget?.name}</strong>.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {!deleteError && (
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
