'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, GripVertical, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  getAllChecklistTemplates,
  createChecklistTemplate,
  updateChecklistTemplate,
  deleteChecklistTemplate,
} from '@/app/actions/checklists';
import { getAllVenueTypes } from '@/app/actions/venue-type';
import { getAllActivityTags } from '@/app/actions/activity-tags';
import {
  checklistTemplateSchema,
  type ChecklistTemplateFormData,
} from '@/lib/checklist-schema';
import type {
  ActivityTag,
  ChecklistTemplateWithItems,
  VenueType,
} from '@/types/index';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type Scope = 'venue_type' | 'activity_tag';

function TemplateDialog({
  open,
  onOpenChange,
  initial,
  venueTypes,
  activityTags,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: ChecklistTemplateWithItems | null;
  venueTypes: VenueType[];
  activityTags: ActivityTag[];
  onSaved: (tpl: ChecklistTemplateWithItems) => void;
}) {
  const t = useTranslations('Tenant.checklists');
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<ChecklistTemplateFormData>({
    resolver: standardSchemaResolver(checklistTemplateSchema),
    defaultValues: {
      name: '',
      scope: 'venue_type',
      scopeId: '',
      items: [{ label: '' }],
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'items',
  });

  const scope = watch('scope');

  useEffect(() => {
    if (!open) return;
    if (initial) {
      const derivedScope: Scope = initial.venue_type_id ? 'venue_type' : 'activity_tag';
      const derivedScopeId =
        initial.venue_type_id ?? initial.activity_tag_id ?? '';
      reset({
        name: initial.name,
        scope: derivedScope,
        scopeId: derivedScopeId,
        items:
          initial.items.length > 0
            ? initial.items.map((i) => ({ label: i.label }))
            : [{ label: '' }],
      });
    } else {
      reset({
        name: '',
        scope: 'venue_type',
        scopeId: '',
        items: [{ label: '' }],
      });
    }
  }, [initial, open, reset]);

  const scopeOptions = useMemo(() => {
    if (scope === 'venue_type') {
      return venueTypes.map((vt) => ({ id: vt.id, label: vt.name }));
    }
    return activityTags.map((tag) => ({ id: tag.id, label: tag.name }));
  }, [scope, venueTypes, activityTags]);

  function onSubmit(raw: ChecklistTemplateFormData) {
    const data: ChecklistTemplateFormData = {
      ...raw,
      items: raw.items.filter((i) => i.label.trim().length > 0),
    };
    if (data.items.length === 0) {
      toast.error(t('atLeastOneItem'));
      return;
    }
    startTransition(async () => {
      const result = initial
        ? await updateChecklistTemplate(initial.id, data)
        : await createChecklistTemplate(data);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(initial ? t('updated') : t('saved'));
      onSaved(result.data);
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initial ? t('editTitle') : t('addTitle')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="ct-name">{t('nameLabel')} *</Label>
            <Input id="ct-name" {...register('name')} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t('scopeLabel')} *</Label>
              <Select
                value={scope}
                onValueChange={(v) => {
                  setValue('scope', v as Scope);
                  setValue('scopeId', '');
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="venue_type">{t('scopeVenueType')}</SelectItem>
                  <SelectItem value="activity_tag">{t('scopeActivityTag')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t('scopeTargetLabel')} *</Label>
              <Select
                value={watch('scopeId') || ''}
                onValueChange={(v) => setValue('scopeId', v)}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      scope === 'venue_type'
                        ? t('scopeVenueTypePlaceholder')
                        : t('scopeActivityTagPlaceholder')
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {scopeOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.scopeId && (
                <p className="text-sm text-destructive">
                  {errors.scopeId.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('itemsLabel')} *</Label>
            <div className="space-y-2">
              {fields.map((field, idx) => (
                <div key={field.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    className="text-muted-foreground cursor-grab"
                    onClick={() => idx > 0 && move(idx, idx - 1)}
                    aria-label={t('moveUp')}
                  >
                    <GripVertical className="w-4 h-4" />
                  </button>
                  <Input
                    {...register(`items.${idx}.label` as const)}
                    placeholder={t('itemPlaceholder')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(idx)}
                    aria-label={t('removeItem')}
                    disabled={fields.length === 1}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ label: '' })}
            >
              <Plus className="w-3 h-3 mr-1" /> {t('addItem')}
            </Button>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t('saving') : t('save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ChecklistManagement() {
  const t = useTranslations('Tenant.checklists');
  const [templates, setTemplates] = useState<ChecklistTemplateWithItems[]>([]);
  const [venueTypes, setVenueTypes] = useState<VenueType[]>([]);
  const [activityTags, setActivityTags] = useState<ActivityTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ChecklistTemplateWithItems | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<ChecklistTemplateWithItems | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  useEffect(() => {
    Promise.all([
      getAllChecklistTemplates(),
      getAllVenueTypes(),
      getAllActivityTags(),
    ]).then(([tplsR, vtR, tagR]) => {
      if (tplsR.success) setTemplates(tplsR.data);
      else toast.error(tplsR.error);
      if (vtR.success) setVenueTypes(vtR.data);
      if (tagR.success) setActivityTags(tagR.data);
      setLoading(false);
    });
  }, []);

  function handleSaved(tpl: ChecklistTemplateWithItems) {
    setTemplates((prev) => {
      const idx = prev.findIndex((p) => p.id === tpl.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = tpl;
        return next;
      }
      return [...prev, tpl].sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    startDeleteTransition(async () => {
      const result = await deleteChecklistTemplate(deleteTarget.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setTemplates((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      toast.success(t('deleted'));
      setDeleteTarget(null);
    });
  }

  function scopeLabelFor(tpl: ChecklistTemplateWithItems): string {
    if (tpl.venue_type_id) {
      const vt = venueTypes.find((v) => v.id === tpl.venue_type_id);
      return `${t('scopeVenueType')}: ${vt?.name ?? '—'}`;
    }
    const tag = activityTags.find((a) => a.id === tpl.activity_tag_id);
    return `${t('scopeActivityTag')}: ${tag?.name ?? '—'}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t('title')}</h2>
          <p className="text-sm text-muted-foreground">{t('description')}</p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-1" /> {t('add')}
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      ) : templates.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('noRecords')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('nameHeader')}</TableHead>
              <TableHead>{t('scopeHeader')}</TableHead>
              <TableHead>{t('itemsHeader')}</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((tpl) => (
              <TableRow key={tpl.id}>
                <TableCell className="font-medium">{tpl.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {scopeLabelFor(tpl)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {t('itemCount', { count: tpl.items.length })}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(tpl);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(tpl)}
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

      <TemplateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        venueTypes={venueTypes}
        activityTags={activityTags}
        onSaved={handleSaved}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => {
          if (!v) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDescription', { name: deleteTarget?.name ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? t('deleting') : t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
