'use client';

import { useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { getAllPOCs, createPOC, updatePOC, deletePOC } from '@/app/actions/poc';
import { pocSchema, type PocFormData } from '@/lib/poc-schema';
import type { PointOfContact } from '@/types/index';
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

// ---------------------------------------------------------------------------
// Form dialog
// ---------------------------------------------------------------------------

function PocDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: PointOfContact | null;
  onSaved: (poc: PointOfContact) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PocFormData>({
    resolver: zodResolver(pocSchema),
    defaultValues: { name: '', email: '', phone: '' },
  });

  useEffect(() => {
    reset(
      initial
        ? { name: initial.name, email: initial.email ?? '', phone: initial.phone ?? '' }
        : { name: '', email: '', phone: '' }
    );
  }, [initial, open, reset]);

  function onSubmit(data: PocFormData) {
    startTransition(async () => {
      const result = initial
        ? await updatePOC(initial.id, data)
        : await createPOC(data);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(initial ? 'Contact updated.' : 'Contact added.');
      onSaved(result.data);
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit contact' : 'Add contact'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="poc-name">Name *</Label>
            <Input id="poc-name" {...register('name')} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="poc-email">Email</Label>
            <Input id="poc-email" type="email" {...register('email')} />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="poc-phone">Phone</Label>
            <Input id="poc-phone" {...register('phone')} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
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

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PocManagement() {
  const [pocs, setPocs] = useState<PointOfContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PointOfContact | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PointOfContact | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  useEffect(() => {
    getAllPOCs().then((result) => {
      if (result.success) setPocs(result.data);
      setLoading(false);
    });
  }, []);

  function handleSaved(poc: PointOfContact) {
    setPocs((prev) => {
      const idx = prev.findIndex((p) => p.id === poc.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = poc;
        return next;
      }
      return [...prev, poc].sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  function handleDelete(poc: PointOfContact) {
    setDeleteTarget(poc);
    setDeleteError(null);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    startDeleteTransition(async () => {
      const result = await deletePOC(deleteTarget.id);
      if (!result.success) {
        setDeleteError(result.error);
        return;
      }
      setPocs((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      toast.success('Contact deleted.');
      setDeleteTarget(null);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Points of Contact</h2>
        <Button
          size="sm"
          onClick={() => { setEditing(null); setDialogOpen(true); }}
        >
          <Plus className="w-4 h-4 mr-1" /> Add contact
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : pocs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No contacts yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pocs.map((poc) => (
              <TableRow key={poc.id}>
                <TableCell className="font-medium">{poc.name}</TableCell>
                <TableCell>{poc.email ?? '—'}</TableCell>
                <TableCell>{poc.phone ?? '—'}</TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { setEditing(poc); setDialogOpen(true); }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(poc)}
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

      <PocDialog
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
            <AlertDialogTitle>Delete contact?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteError ? (
                <span className="text-destructive">{deleteError}</span>
              ) : (
                <>
                  This will permanently delete{' '}
                  <strong>{deleteTarget?.name}</strong>.
                </>
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
