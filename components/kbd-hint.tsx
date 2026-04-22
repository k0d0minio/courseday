'use client';

import { cn } from '@/lib/utils';

type Props = {
  children: string;
  className?: string;
};

/** Decorative shortcut hint (screen readers get full name from visible button label). */
export function KbdHint({ children, className }: Props) {
  return (
    <kbd
      className={cn(
        'hidden sm:inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1 font-mono text-[10px] font-medium text-muted-foreground tabular-nums',
        className
      )}
      aria-hidden
    >
      {children}
    </kbd>
  );
}
