'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import { createDayNote, updateDayNote, deleteDayNote } from '@/app/actions/day-notes';
import type { DayNote } from '@/app/actions/day-notes';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const MAX_LEN = 2000;

interface DayNotesProps {
  dayId: string;
  initialNotes: DayNote[];
  isEditor: boolean;
  currentUserId: string | undefined;
}

export function DayNotes({ dayId, initialNotes, isEditor, currentUserId }: DayNotesProps) {
  const [notes, setNotes] = useState<DayNote[]>(initialNotes);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [isSaving, startSaveTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  function handleAdd() {
    if (!draft.trim()) return;
    startSaveTransition(async () => {
      const result = await createDayNote(dayId, draft);
      if (!result.success) { toast.error(result.error); return; }
      setNotes((prev) => [...prev, result.data]);
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
      const result = await updateDayNote(id, editDraft);
      if (!result.success) { toast.error(result.error); return; }
      setNotes((prev) => prev.map((n) => (n.id === id ? result.data : n)));
      setEditingId(null);
      toast.success('Note updated.');
    });
  }

  function handleDelete(id: string) {
    startDeleteTransition(async () => {
      const result = await deleteDayNote(id);
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
                    <p className="text-sm whitespace-pre-wrap">{note.content}</p>
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
