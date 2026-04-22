'use client';

import { useTranslations } from 'next-intl';
import { getAllergen, type AllergenCode } from '@/lib/allergens';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type Props = {
  code: AllergenCode;
  size?: 'sm' | 'md';
  className?: string;
};

export function AllergenBadge({ code, size = 'sm', className }: Props) {
  const t = useTranslations('Tenant.allergens.names');
  const a = getAllergen(code);
  const label = t(a.labelKey);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            role="img"
            aria-label={label}
            className={cn(
              'inline-flex items-center justify-center rounded-full bg-muted leading-none',
              size === 'sm' ? 'h-6 w-6 text-sm' : 'h-7 w-7 text-base',
              className
            )}
          >
            <span aria-hidden="true">{a.emoji}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

type RowProps = {
  codes: readonly AllergenCode[];
  size?: 'sm' | 'md';
  className?: string;
};

export function AllergenBadgeRow({ codes, size = 'sm', className }: RowProps) {
  if (codes.length === 0) return null;
  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {codes.map((c) => (
        <AllergenBadge key={c} code={c} size={size} />
      ))}
    </div>
  );
}
