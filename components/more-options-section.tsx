'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

type Props = {
  children: React.ReactNode;
  defaultOpen?: boolean;
  label?: string;
};

export function MoreOptionsSection({ children, defaultOpen = false, label }: Props) {
  const t = useTranslations('Tenant.allergens');
  const [open, setOpen] = useState(defaultOpen);
  const resolvedLabel = label ?? t('moreOptions');

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronDown
          aria-hidden="true"
          className={cn('h-4 w-4 transition-transform', open && 'rotate-180')}
        />
        <span>{resolvedLabel}</span>
      </button>
      <div className={cn('space-y-4', open ? 'block' : 'hidden')}>{children}</div>
    </div>
  );
}
