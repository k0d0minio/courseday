'use client';

import type { User } from '@supabase/supabase-js';
import { LogOut } from 'lucide-react';
import { signOut } from '@/app/actions/auth';

interface UserMenuProps {
  // user kept for potential future avatar/tooltip use
  user: User;
  signOutLabel?: string;
}

export function UserMenu({ user: _user, signOutLabel = 'Sign out' }: UserMenuProps) {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label={signOutLabel}
        title={signOutLabel}
      >
        <LogOut className="h-4 w-4" />
      </button>
    </form>
  );
}
