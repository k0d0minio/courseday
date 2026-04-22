'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TENANT_PALETTES, type TenantPaletteId } from '@/lib/theme/palettes';

interface TenantPalettePickerProps {
  value: TenantPaletteId;
  onChange: (next: TenantPaletteId) => void;
}

export function TenantPalettePicker({ value, onChange }: TenantPalettePickerProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label="Tenant color palette">
      {TENANT_PALETTES.map((palette) => {
        const selected = palette.id === value;

        return (
          <button
            key={palette.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={palette.label}
            data-testid={`palette-${palette.id}`}
            onClick={() => onChange(palette.id)}
            className={cn(
              'group rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selected ? 'border-primary bg-accent' : 'border-border hover:border-primary/40 hover:bg-accent/60'
            )}
          >
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{palette.label}</p>
                <p className="text-xs text-muted-foreground">{palette.description}</p>
              </div>
              <span
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full border',
                  selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40'
                )}
                aria-hidden="true"
              >
                {selected ? <Check className="h-3.5 w-3.5" /> : null}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full border border-border/60" style={{ backgroundColor: palette.light.primary }} />
              <span className="h-4 w-4 rounded-full border border-border/60" style={{ backgroundColor: palette.light.accent }} />
              <span className="h-4 w-4 rounded-full border border-border/60" style={{ backgroundColor: palette.light.secondary }} />
              <span className="h-4 w-4 rounded-full border border-border/60" style={{ backgroundColor: palette.dark.primary }} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
