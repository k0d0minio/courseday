'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { DayNote } from '@/app/actions/day-notes';
import { mutateWithOfflineQueue } from '@/lib/day-mutation-client';
import { useTenant } from '@/lib/tenant-context';
import { handoverRowStatus } from '@/lib/handover';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

const MAX_LEN = 2000;

interface DayNotesProps {
  dayId: string;
  initialNotes: DayNote[];
  /** When set with `onNotesChange`, notes are controlled (e.g. realtime sync). */
  notes?: DayNote[];
  onNotesChange?: React.Dispatch<React.SetStateAction<DayNote[]>>;
  isEditor: boolean;
  currentUserId: string | undefined;
  handoverEnabled?: boolean;
  handoverBaselineIso?: string | null;
}

export function DayNotes({
  dayId,
  initialNotes,
  notes: controlledNotes,
  onNotesChange,
  isEditor,
  currentUserId,
  handoverEnabled = false,
  handoverBaselineIso = null,
}: DayNotesProps) {
  const th = useTranslations('Tenant.handover');
  const [internalNotes, setInternalNotes] = useState<DayNote[]>(initialNotes);
  const isControlled = controlledNotes != null && onNotesChange != null;
  const notes = isControlled ? controlledNotes : internalNotes;
  const setNotes = isControlled ? onNotesChange! : setInternalNotes;

  useEffect(() => {
    if (!isControlled) setInternalNotes(initialNotes);
  }, [initialNotes, dayId, isControlled]);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [isSaving, startSaveTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const { tenantSlug } = useTenant();

  function handleAdd() {
    if (!draft.trim()) return;
    startSaveTransition(async () => {
      const result = await mutateWithOfflineQueue<DayNote>({
        entity: 'day-notes',
        operation: 'create',
        tenantSlug,
        dayId,
        payload: { dayId, content: draft },
      });
      if (!result.success) { toast.error(result.error); return; }
      if (result.pending) {
        setNotes((prev) => [
          ...prev,
          {
            id: `pending-${result.clientMutationId}`,
            tenant_id: '',
            day_id: dayId,
            user_id: currentUserId ?? '',
            author_name: 'Pending',
            content: draft.trim(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);
      } else {
        setNotes((prev) => [...prev, result.data]);
      }
      setDraft('');
      toast.success('Note added.');
    });
  }

  function startEdit(note: DayNote) {
    setEditingId(note.id);
    setEditDraft(note.content);
  }

  function handleUpdate(id: string) {
    if (!editDraft.trim()) return;
    startSaveTransition(async () => {
      const result = await mutateWithOfflineQueue<DayNote>({
        entity: 'day-notes',
        operation: 'update',
        tenantSlug,
        dayId,
        payload: { id, content: editDraft },
      });
      if (!result.success) { toast.error(result.error); return; }
      if (result.pending) {
        setNotes((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, content: editDraft.trim(), updated_at: new Date().toISOString() } : n
          )
        );
      } else {
        setNotes((prev) => prev.map((n) => (n.id === id ? result.data : n)));
      }
      setEditingId(null);
      toast.success('Note updated.');
    });
  }

  function handleDelete(id: string) {
    startDeleteTransition(async () => {
      const result = await mutateWithOfflineQueue<void>({
        entity: 'day-notes',
        operation: 'delete',
        tenantSlug,
        dayId,
        payload: { id },
      });
      if (!result.success) { toast.error(result.error); return; }
      setNotes((prev) => prev.filter((n) => n.id !== id));
      toast.success('Note deleted.');
    });
  }

  if (notes.length === 0 && !isEditor) return null;

  return (
    <section className="space-y-3">
      <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
        Notes
      </h2>

      {notes.length > 0 && (
        <div className="space-y-2">
          {notes.map((note) => {
            const isOwn = note.user_id === currentUserId;
            const isEditing = editingId === note.id;
            const ho =
              handoverEnabled && handoverBaselineIso
                ? handoverRowStatus(note.created_at, note.updated_at, handoverBaselineIso)
                : null;

            return (
              <div
                key={note.id}
                className="rounded-md border bg-muted/30 px-4 py-3 space-y-1.5"
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      rows={3}
                      maxLength={MAX_LEN}
                      autoFocus
                      className="text-sm"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                        disabled={isSaving}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleUpdate(note.id)}
                        disabled={isSaving || !editDraft.trim()}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-start gap-2">
                      <p className="text-sm whitespace-pre-wrap flex-1 min-w-0">{note.content}</p>
                      {ho === 'new' && (
                        <Badge variant="default" className="shrink-0 text-[10px] uppercase">
                          {th('badgeNew')}
                        </Badge>
                      )}
                      {ho === 'edited' && (
                        <Badge variant="secondary" className="shrink-0 text-[10px] uppercase">
                          {th('badgeEdited')}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        {note.author_name} · {formatDate(note.created_at)}
                        {note.updated_at !== note.created_at && ' (edited)'}
                      </p>
                      {isEditor && isOwn && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => startEdit(note)}
                            disabled={isDeleting}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(note.id)}
                            disabled={isDeleting}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isEditor && (
        <div className="space-y-2">
          <Textarea
            placeholder="Add a note for this day…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            maxLength={MAX_LEN}
            className="text-sm"
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              {draft.length}/{MAX_LEN}
            </span>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={isSaving || !draft.trim()}
            >
              Add note
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
