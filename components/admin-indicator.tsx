'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Settings, LogOut, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { signOut } from '@/app/actions/auth';
import { useAuth } from '@/lib/AuthProvider';
import { cn } from '@/lib/utils';

export function AdminIndicator() {
  const { user, isEditor, isLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (isLoading || !isEditor) return null;

  return (
    <div ref={ref} className="fixed bottom-4 right-4 z-50">
      {/* Expanded panel */}
      {open && (
        <div className="mb-2 w-56 rounded-lg border bg-popover shadow-lg overflow-hidden">
          <div className="px-3 py-2.5">
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>

          <div className="h-px bg-border" />

          <Link
            href="/admin/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-accent transition-colors"
          >
            <Settings className="h-4 w-4 shrink-0" />
            Settings
          </Link>

          <div className="h-px bg-border" />

          <button
            onClick={() => startTransition(() => signOut())}
            disabled={isPending}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {isPending ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}

      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-full border bg-background shadow-md',
          'hover:bg-accent transition-colors',
          open && 'bg-accent'
        )}
        aria-label="Admin menu"
      >
        {open
          ? <ChevronUp className="h-4 w-4" />
          : <Settings className="h-4 w-4" />
        }
      </button>
    </div>
  );
}
