'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import {
  createProgramItem,
  updateProgramItem,
} from '@/app/actions/program-items';
import { createPOC } from '@/app/actions/poc';
import { createVenueType } from '@/app/actions/venue-type';
import { generateRecurrenceDates, parseTableBreakdown } from '@/lib/day-utils';
import type { ProgramItem, PointOfContact, VenueType } from '@/types/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

// ---------------------------------------------------------------------------
// Local form schema (string-based inputs, transformed before API call)
// ---------------------------------------------------------------------------

const TABLE_BREAKDOWN_REGEX = /^[1-9]\d*(\+[1-9]\d*)*$/;

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  guestCount: z.string().optional(),
  capacity: z.string().optional(),
  venueTypeId: z.string().optional(),
  pocId: z.string().optional(),
  tableBreakdown: z
    .string()
    .optional()
    .refine(
      (val) => !val || TABLE_BREAKDOWN_REGEX.test(val.replace(/\s+/g, '')),
      { message: 'Use format 3+2+1 (positive integers only)' }
    ),
  isTourOperator: z.boolean().optional(),
  notes: z.string().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceFrequency: z
    .enum(['weekly', 'biweekly', 'monthly', 'yearly'])
    .optional(),
});

type FormData = z.infer<typeof formSchema>;

const NEW_VALUE = '__new__';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /** YYYY-MM-DD of the day being viewed */
  date: string;
  /** ID of the Day row for this date */
  dayId: string;
  type: 'golf' | 'event';
  pocs: PointOfContact[];
  venueTypes: VenueType[];
  /** When provided the form is pre-filled and submit calls updateProgramItem */
  editItem?: ProgramItem | null;
  onSuccess: (item: ProgramItem) => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AddEntryModal({
  isOpen,
  onClose,
  date,
  dayId,
  type,
  pocs: initialPocs,
  venueTypes: initialVenueTypes,
  editItem,
  onSuccess,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [pocs, setPocs] = useState(initialPocs);
  const [venueTypes, setVenueTypes] = useState(initialVenueTypes);

  // Inline POC creation state
  const [showNewPoc, setShowNewPoc] = useState(false);
  const [newPocName, setNewPocName] = useState('');
  const [newPocEmail, setNewPocEmail] = useState('');
  const [newPocPhone, setNewPocPhone] = useState('');
  const [isSavingPoc, startPocTransition] = useTransition();

  // Inline venue type creation state
  const [showNewVt, setShowNewVt] = useState(false);
  const [newVtName, setNewVtName] = useState('');
  const [newVtCode, setNewVtCode] = useState('');
  const [isSavingVt, startVtTransition] = useTransition();

  const isEditing = !!editItem;
  const title = isEditing
    ? `Edit ${type}`
    : `Add ${type === 'golf' ? 'golf' : 'event'}`;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues(editItem),
  });

  // Sync initial lists when props change
  useEffect(() => { setPocs(initialPocs); }, [initialPocs]);
  useEffect(() => { setVenueTypes(initialVenueTypes); }, [initialVenueTypes]);

  // Reset form when dialog opens/closes or editItem changes
  useEffect(() => {
    reset(defaultValues(editItem));
    setShowNewPoc(false);
    setShowNewVt(false);
    setNewPocName(''); setNewPocEmail(''); setNewPocPhone('');
    setNewVtName(''); setNewVtCode('');
  }, [isOpen, editItem, reset]);

  const watchIsRecurring = watch('isRecurring');
  const watchFrequency = watch('recurrenceFrequency');

  const occurrenceCount = useMemo(() => {
    if (!watchIsRecurring || !watchFrequency) return 0;
    return 1 + generateRecurrenceDates(date, watchFrequency).length;
  }, [date, watchIsRecurring, watchFrequency]);

  // -------------------------------------------------------------------------
  // Inline POC save
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // Inline venue type save
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // Form submit
  // -------------------------------------------------------------------------
  function onSubmit(data: FormData) {
    startTransition(async () => {
      const payload = {
        title: data.title,
        type,
        dayId,
        description: data.description || undefined,
        startTime: data.startTime || undefined,
        endTime: data.endTime || undefined,
        guestCount: data.guestCount ? parseInt(data.guestCount, 10) : undefined,
        capacity: data.capacity ? parseInt(data.capacity, 10) : undefined,
        venueTypeId: data.venueTypeId || null,
        pocId: data.pocId || null,
        tableBreakdown: data.tableBreakdown
          ? parseTableBreakdown(data.tableBreakdown)
          : null,
        isTourOperator: data.isTourOperator ?? false,
        notes: data.notes || undefined,
        isRecurring: data.isRecurring ?? false,
        recurrenceFrequency: data.recurrenceFrequency ?? null,
      };

      const result = isEditing
        ? await updateProgramItem(editItem!.id, payload)
        : await createProgramItem(payload);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(isEditing ? `${type === 'golf' ? 'Golf' : 'Event'} updated.` : `${type === 'golf' ? 'Golf' : 'Event'} added.`);
      onSuccess(result.data);
      onClose();
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="capitalize">{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div className="space-y-1">
            <Label htmlFor="ae-title">Title *</Label>
            <Input id="ae-title" {...register('title')} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label htmlFor="ae-desc">Description</Label>
            <Textarea id="ae-desc" rows={2} {...register('description')} />
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="ae-start">Start time</Label>
              <Input id="ae-start" type="time" {...register('startTime')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ae-end">End time</Label>
              <Input id="ae-end" type="time" {...register('endTime')} />
            </div>
          </div>

          {/* Guest count + Capacity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="ae-guests">Guest count</Label>
              <Input id="ae-guests" type="number" min={1} {...register('guestCount')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ae-capacity">Capacity</Label>
              <Input id="ae-capacity" type="number" min={1} {...register('capacity')} />
            </div>
          </div>

          {/* Venue type */}
          <div className="space-y-1">
            <Label>Venue type</Label>
            <Select
              value={watch('venueTypeId') ?? ''}
              onValueChange={(v) => {
                if (v === NEW_VALUE) {
                  setValue('venueTypeId', '');
                  setShowNewVt(true);
                } else {
                  setValue('venueTypeId', v);
                  setShowNewVt(false);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select venue type" />
              </SelectTrigger>
              <SelectContent>
                {venueTypes.map((vt) => (
                  <SelectItem key={vt.id} value={vt.id}>{vt.name}</SelectItem>
                ))}
                <SelectItem value={NEW_VALUE}>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Plus className="w-3 h-3" /> Add new…
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {showNewVt && (
              <div className="mt-2 rounded-md border p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">New venue type</p>
                <Input
                  placeholder="Name *"
                  value={newVtName}
                  onChange={(e) => setNewVtName(e.target.value)}
                />
                <Input
                  placeholder="Code (optional)"
                  value={newVtCode}
                  onChange={(e) => setNewVtCode(e.target.value)}
                />
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
                if (v === NEW_VALUE) {
                  setValue('pocId', '');
                  setShowNewPoc(true);
                } else {
                  setValue('pocId', v);
                  setShowNewPoc(false);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select point of contact" />
              </SelectTrigger>
              <SelectContent>
                {pocs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
                <SelectItem value={NEW_VALUE}>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Plus className="w-3 h-3" /> Add new…
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {showNewPoc && (
              <div className="mt-2 rounded-md border p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">New point of contact</p>
                <Input
                  placeholder="Name *"
                  value={newPocName}
                  onChange={(e) => setNewPocName(e.target.value)}
                />
                <Input
                  placeholder="Email (optional)"
                  type="email"
                  value={newPocEmail}
                  onChange={(e) => setNewPocEmail(e.target.value)}
                />
                <Input
                  placeholder="Phone (optional)"
                  value={newPocPhone}
                  onChange={(e) => setNewPocPhone(e.target.value)}
                />
                <div className="flex gap-2 justify-end">
                  <Button type="button" size="sm" variant="outline" onClick={() => setShowNewPoc(false)}>Cancel</Button>
                  <Button type="button" size="sm" onClick={handleSavePoc} disabled={isSavingPoc || !newPocName.trim()}>
                    {isSavingPoc ? 'Saving…' : 'Save'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Table breakdown */}
          <div className="space-y-1">
            <Label htmlFor="ae-breakdown">Table breakdown</Label>
            <Input id="ae-breakdown" placeholder="e.g. 3+2+1" {...register('tableBreakdown')} />
            {errors.tableBreakdown && (
              <p className="text-sm text-destructive">{errors.tableBreakdown.message}</p>
            )}
          </div>

          {/* Tour operator */}
          <div className="flex items-center justify-between">
            <Label htmlFor="ae-tour">Tour operator</Label>
            <Switch
              id="ae-tour"
              checked={watch('isTourOperator') ?? false}
              onCheckedChange={(v) => setValue('isTourOperator', v)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label htmlFor="ae-notes">Notes</Label>
            <Textarea id="ae-notes" rows={2} {...register('notes')} />
          </div>

          {/* Recurring (only for new items) */}
          {!isEditing && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <Label htmlFor="ae-recurring">Recurring</Label>
                <Switch
                  id="ae-recurring"
                  checked={watch('isRecurring') ?? false}
                  onCheckedChange={(v) => setValue('isRecurring', v)}
                />
              </div>

              {watchIsRecurring && (
                <div className="space-y-2">
                  <Select
                    value={watchFrequency ?? ''}
                    onValueChange={(v) =>
                      setValue('recurrenceFrequency', v as FormData['recurrenceFrequency'])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
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
// Helpers
// ---------------------------------------------------------------------------

function defaultValues(editItem?: ProgramItem | null): FormData {
  if (!editItem) {
    return {
      title: '',
      description: '',
      startTime: '',
      endTime: '',
      guestCount: '',
      capacity: '',
      venueTypeId: '',
      pocId: '',
      tableBreakdown: '',
      isTourOperator: false,
      notes: '',
      isRecurring: false,
      recurrenceFrequency: undefined,
    };
  }
  return {
    title: editItem.title,
    description: editItem.description ?? '',
    startTime: editItem.start_time ?? '',
    endTime: editItem.end_time ?? '',
    guestCount: editItem.guest_count != null ? String(editItem.guest_count) : '',
    capacity: editItem.capacity != null ? String(editItem.capacity) : '',
    venueTypeId: editItem.venue_type_id ?? '',
    pocId: editItem.poc_id ?? '',
    tableBreakdown: editItem.table_breakdown
      ? editItem.table_breakdown.join('+')
      : '',
    isTourOperator: editItem.is_tour_operator,
    notes: editItem.notes ?? '',
    isRecurring: false,
    recurrenceFrequency: undefined,
  };
}
