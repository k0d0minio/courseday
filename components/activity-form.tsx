'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Check, Plus } from 'lucide-react';
import { createActivity, updateActivity } from '@/app/actions/activities';
import { createPOC } from '@/app/actions/poc';
import { createVenueType } from '@/app/actions/venue-type';
import { createActivityTag, getAllActivityTags } from '@/app/actions/activity-tags';
import { generateRecurrenceDates } from '@/lib/day-utils';
import { cn } from '@/lib/utils';
import type { Activity, ActivityTag, ActivityWithRelations, PointOfContact, VenueType } from '@/types/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ---------------------------------------------------------------------------
// Schema & types
// ---------------------------------------------------------------------------

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  expectedCovers: z.string().optional(),
  venueTypeId: z.string().optional(),
  pocId: z.string().optional(),
  notes: z.string().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceFrequency: z.enum(['weekly', 'biweekly', 'monthly', 'yearly']).optional(),
});

type FormData = z.infer<typeof formSchema>;

const NEW_VALUE = '__new__';

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  dayId: string;
  pocs: PointOfContact[];
  venueTypes: VenueType[];
  editItem?: ActivityWithRelations | null;
  onSuccess: (item: Activity) => void;
};

// ---------------------------------------------------------------------------
// ActivityForm
// ---------------------------------------------------------------------------

export function ActivityForm({
  isOpen,
  onClose,
  date,
  dayId,
  pocs: initialPocs,
  venueTypes: initialVenueTypes,
  editItem,
  onSuccess,
}: Props) {
  const isMobile = useIsMobile();
  const [isPending, startTransition] = useTransition();

  // POC inline creation
  const [pocs, setPocs] = useState(initialPocs);
  const [showNewPoc, setShowNewPoc] = useState(false);
  const [newPocName, setNewPocName] = useState('');
  const [newPocEmail, setNewPocEmail] = useState('');
  const [newPocPhone, setNewPocPhone] = useState('');
  const [isSavingPoc, startPocTransition] = useTransition();

  // Venue type inline creation
  const [venueTypes, setVenueTypes] = useState(initialVenueTypes);
  const [showNewVt, setShowNewVt] = useState(false);
  const [newVtName, setNewVtName] = useState('');
  const [newVtCode, setNewVtCode] = useState('');
  const [isSavingVt, startVtTransition] = useTransition();

  // Tag multi-select
  const [allTags, setAllTags] = useState<ActivityTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const isEditing = !!editItem;
  const modalTitle = isEditing ? 'Edit activity' : 'Add activity';

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues(editItem),
  });

  // Sync props
  useEffect(() => { setPocs(initialPocs); }, [initialPocs]);
  useEffect(() => { setVenueTypes(initialVenueTypes); }, [initialVenueTypes]);

  // Reset on open/editItem change
  useEffect(() => {
    if (!isOpen) return;
    reset(defaultValues(editItem));
    setSelectedTagIds(editItem?.tags?.map((t) => t.id) ?? []);
    setShowNewPoc(false); setShowNewVt(false);
    setNewPocName(''); setNewPocEmail(''); setNewPocPhone('');
    setNewVtName(''); setNewVtCode('');
    getAllActivityTags().then((r) => { if (r.success) setAllTags(r.data); });
  }, [isOpen, editItem, reset]);

  const watchIsRecurring = watch('isRecurring');
  const watchFrequency = watch('recurrenceFrequency');

  const occurrenceCount = useMemo(() => {
    if (!watchIsRecurring || !watchFrequency) return 0;
    return 1 + generateRecurrenceDates(date, watchFrequency).length;
  }, [date, watchIsRecurring, watchFrequency]);

  function handleSavePoc() {
    if (!newPocName.trim()) return;
    startPocTransition(async () => {
      const result = await createPOC({ name: newPocName, email: newPocEmail, phone: newPocPhone });
      if (!result.success) { toast.error(result.error); return; }
      setPocs((prev) => [...prev, result.data]);
      setValue('pocId', result.data.id);
      setShowNewPoc(false);
      setNewPocName(''); setNewPocEmail(''); setNewPocPhone('');
      toast.success('Point of contact added.');
    });
  }

  function handleSaveVenueType() {
    if (!newVtName.trim()) return;
    startVtTransition(async () => {
      const result = await createVenueType({ name: newVtName, code: newVtCode });
      if (!result.success) { toast.error(result.error); return; }
      setVenueTypes((prev) => [...prev, result.data]);
      setValue('venueTypeId', result.data.id);
      setShowNewVt(false);
      setNewVtName(''); setNewVtCode('');
      toast.success('Venue type added.');
    });
  }

  function onSubmit(data: FormData) {
    startTransition(async () => {
      const payload = {
        title: data.title,
        dayId,
        description: data.description || undefined,
        startTime: data.startTime || undefined,
        endTime: data.endTime || undefined,
        expectedCovers: data.expectedCovers ? parseInt(data.expectedCovers, 10) : undefined,
        venueTypeId: data.venueTypeId || undefined,
        pocId: data.pocId || undefined,
        notes: data.notes || undefined,
        tagIds: selectedTagIds,
        isRecurring: data.isRecurring ?? false,
        recurrenceFrequency: data.recurrenceFrequency ?? undefined,
      };

      const result = isEditing
        ? await updateActivity(editItem!.id, payload)
        : await createActivity(payload);

      if (!result.success) { toast.error(result.error); return; }

      toast.success(isEditing ? 'Activity updated.' : 'Activity added.');
      onSuccess(result.data);
      onClose();
    });
  }

  const formBody = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Title */}
      <div className="space-y-1">
        <Label htmlFor="af-title">Title *</Label>
        <Input id="af-title" {...register('title')} />
        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
      </div>

      {/* Tags */}
      <div className="space-y-1">
        <Label>Tags</Label>
        <TagSelector
          tags={allTags}
          selectedIds={selectedTagIds}
          onChange={setSelectedTagIds}
          onTagCreated={(tag) => {
            setAllTags((prev) => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)));
            setSelectedTagIds((prev) => [...prev, tag.id]);
          }}
        />
      </div>

      {/* Times */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="af-start">Start time</Label>
          <Input id="af-start" type="time" {...register('startTime')} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="af-end">End time</Label>
          <Input id="af-end" type="time" {...register('endTime')} />
        </div>
      </div>

      {/* Expected covers */}
      <div className="space-y-1">
        <Label htmlFor="af-covers">Expected covers</Label>
        <Input id="af-covers" type="number" min={0} {...register('expectedCovers')} />
      </div>

      {/* Venue type */}
      <div className="space-y-1">
        <Label>Venue type</Label>
        <Select
          value={watch('venueTypeId') ?? ''}
          onValueChange={(v) => {
            if (v === NEW_VALUE) { setValue('venueTypeId', ''); setShowNewVt(true); }
            else { setValue('venueTypeId', v); setShowNewVt(false); }
          }}
        >
          <SelectTrigger><SelectValue placeholder="Select venue type" /></SelectTrigger>
          <SelectContent>
            {venueTypes.map((vt) => <SelectItem key={vt.id} value={vt.id}>{vt.name}</SelectItem>)}
            <SelectItem value={NEW_VALUE}>
              <span className="flex items-center gap-1 text-muted-foreground"><Plus className="w-3 h-3" /> Add new…</span>
            </SelectItem>
          </SelectContent>
        </Select>
        {showNewVt && (
          <div className="mt-2 rounded-md border p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">New venue type</p>
            <Input placeholder="Name *" value={newVtName} onChange={(e) => setNewVtName(e.target.value)} />
            <Input placeholder="Code (optional)" value={newVtCode} onChange={(e) => setNewVtCode(e.target.value)} />
            <div className="flex gap-2 justify-end">
              <Button type="button" size="sm" variant="outline" onClick={() => setShowNewVt(false)}>Cancel</Button>
              <Button type="button" size="sm" onClick={handleSaveVenueType} disabled={isSavingVt || !newVtName.trim()}>
                {isSavingVt ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Point of contact */}
      <div className="space-y-1">
        <Label>Point of contact</Label>
        <Select
          value={watch('pocId') ?? ''}
          onValueChange={(v) => {
            if (v === NEW_VALUE) { setValue('pocId', ''); setShowNewPoc(true); }
            else { setValue('pocId', v); setShowNewPoc(false); }
          }}
        >
          <SelectTrigger><SelectValue placeholder="Select point of contact" /></SelectTrigger>
          <SelectContent>
            {pocs.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            <SelectItem value={NEW_VALUE}>
              <span className="flex items-center gap-1 text-muted-foreground"><Plus className="w-3 h-3" /> Add new…</span>
            </SelectItem>
          </SelectContent>
        </Select>
        {showNewPoc && (
          <div className="mt-2 rounded-md border p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">New point of contact</p>
            <Input placeholder="Name *" value={newPocName} onChange={(e) => setNewPocName(e.target.value)} />
            <Input placeholder="Email (optional)" type="email" value={newPocEmail} onChange={(e) => setNewPocEmail(e.target.value)} />
            <Input placeholder="Phone (optional)" value={newPocPhone} onChange={(e) => setNewPocPhone(e.target.value)} />
            <div className="flex gap-2 justify-end">
              <Button type="button" size="sm" variant="outline" onClick={() => setShowNewPoc(false)}>Cancel</Button>
              <Button type="button" size="sm" onClick={handleSavePoc} disabled={isSavingPoc || !newPocName.trim()}>
                {isSavingPoc ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <Label htmlFor="af-notes">Notes</Label>
        <Textarea id="af-notes" rows={2} {...register('notes')} />
      </div>

      {/* Recurring (create only) */}
      {!isEditing && (
        <>
          <Separator />
          <div className="flex items-center justify-between">
            <Label htmlFor="af-recurring">Recurring</Label>
            <Switch
              id="af-recurring"
              checked={watch('isRecurring') ?? false}
              onCheckedChange={(v) => setValue('isRecurring', v)}
            />
          </div>
          {watchIsRecurring && (
            <div className="space-y-2">
              <Select
                value={watchFrequency ?? ''}
                onValueChange={(v) => setValue('recurrenceFrequency', v as FormData['recurrenceFrequency'])}
              >
                <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
              {occurrenceCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  This will create <strong>{occurrenceCount}</strong> occurrence{occurrenceCount !== 1 ? 's' : ''}.
                </p>
              )}
            </div>
          )}
        </>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Save'}</Button>
      </div>
    </form>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{modalTitle}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto max-h-[70vh]">{formBody}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
        </DialogHeader>
        {formBody}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// TagSelector
// ---------------------------------------------------------------------------

function TagSelector({
  tags,
  selectedIds,
  onChange,
  onTagCreated,
}: {
  tags: ActivityTag[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onTagCreated: (tag: ActivityTag) => void;
}) {
  const [open, setOpen] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [isSaving, startTransition] = useTransition();

  const selectedTags = tags.filter((t) => selectedIds.includes(t.id));

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((s) => s !== id) : [...selectedIds, id]);
  }

  function handleSave() {
    if (!newName.trim()) return;
    startTransition(async () => {
      const result = await createActivityTag(newName.trim());
      if (!result.success) { toast.error(result.error); return; }
      onTagCreated(result.data);
      setNewName('');
      setShowNew(false);
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-start min-h-9 h-auto">
          {selectedTags.length === 0 ? (
            <span className="text-muted-foreground text-sm">Select tags…</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {selectedTags.map((t) => (
                <span key={t.id} className="inline-block text-xs bg-muted px-1.5 py-0.5 rounded">{t.name}</span>
              ))}
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        {tags.length > 0 && (
          <div className="max-h-40 overflow-y-auto space-y-0.5 mb-2">
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggle(tag.id)}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded-sm text-sm hover:bg-muted text-left"
              >
                <div className={cn(
                  'h-4 w-4 rounded border flex items-center justify-center shrink-0',
                  selectedIds.includes(tag.id) && 'bg-primary border-primary'
                )}>
                  {selectedIds.includes(tag.id) && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
                {tag.name}
              </button>
            ))}
          </div>
        )}
        {showNew ? (
          <div className="space-y-2 pt-2 border-t">
            <Input
              placeholder="Tag name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSave(); } }}
              autoFocus
            />
            <div className="flex gap-1 justify-end">
              <Button type="button" size="sm" variant="outline" onClick={() => { setShowNew(false); setNewName(''); }}>Cancel</Button>
              <Button type="button" size="sm" onClick={handleSave} disabled={isSaving || !newName.trim()}>
                {isSaving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className={cn(
              'flex items-center gap-1 text-xs text-muted-foreground px-2 py-1.5 hover:bg-muted w-full rounded-sm',
              tags.length > 0 && 'border-t pt-2 mt-0.5'
            )}
          >
            <Plus className="h-3 w-3" /> Add new tag
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultValues(editItem?: ActivityWithRelations | null): FormData {
  if (!editItem) {
    return { title: '', description: '', startTime: '', endTime: '', expectedCovers: '', venueTypeId: '', pocId: '', notes: '', isRecurring: false, recurrenceFrequency: undefined };
  }
  return {
    title: editItem.title,
    description: editItem.description ?? '',
    startTime: editItem.start_time ?? '',
    endTime: editItem.end_time ?? '',
    expectedCovers: editItem.expected_covers != null ? String(editItem.expected_covers) : '',
    venueTypeId: editItem.venue_type_id ?? '',
    pocId: editItem.poc_id ?? '',
    notes: editItem.notes ?? '',
    isRecurring: false,
    recurrenceFrequency: undefined,
  };
}
