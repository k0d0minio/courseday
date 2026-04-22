'use client';

import { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ALLERGENS, type AllergenCode } from '@/lib/allergens';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Toggle } from '@/components/ui/toggle';

type Props = {
  value: AllergenCode[];
  onChange: (next: AllergenCode[]) => void;
  disabled?: boolean;
};

export function AllergenMultiSelect({ value, onChange, disabled }: Props) {
  const t = useTranslations('Tenant.allergens');
  const tNames = useTranslations('Tenant.allergens.names');
  const [open, setOpen] = useState(false);

  const selected = new Set<AllergenCode>(value);

  function toggle(code: AllergenCode) {
    const next = new Set(selected);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    onChange(ALLERGENS.filter((a) => next.has(a.code)).map((a) => a.code));
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange([]);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
            {value.length === 0 ? (
              <span className="text-muted-foreground">{t('placeholder')}</span>
            ) : (
              <span className="flex flex-wrap items-center gap-1">
                {value.map((code) => {
                  const a = ALLERGENS.find((x) => x.code === code);
                  if (!a) return null;
                  return (
                    <span
                      key={code}
                      className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
                    >
                      <span aria-hidden="true">{a.emoji}</span>
                      <span>{tNames(a.labelKey)}</span>
                    </span>
                  );
                })}
              </span>
            )}
          </span>
          <span className="flex items-center gap-1 shrink-0">
            {value.length > 0 && (
              <span
                role="button"
                tabIndex={0}
                aria-label={t('clear')}
                onClick={clear}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onChange([]);
                  }
                }}
                className="rounded p-0.5 hover:bg-accent"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            )}
            <ChevronDown className="h-4 w-4 opacity-50" aria-hidden="true" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))] p-2">
        <div className="grid grid-cols-2 gap-1">
          {ALLERGENS.map((a) => {
            const isOn = selected.has(a.code);
            return (
              <Toggle
                key={a.code}
                pressed={isOn}
                onPressedChange={() => toggle(a.code)}
                variant="outline"
                size="sm"
                className={cn(
                  'h-auto justify-start gap-2 px-2 py-1.5 text-left text-sm font-normal',
                  isOn && 'border-primary'
                )}
                aria-label={tNames(a.labelKey)}
              >
                <span aria-hidden="true" className="text-base leading-none">
                  {a.emoji}
                </span>
                <span className="truncate">{tNames(a.labelKey)}</span>
              </Toggle>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
