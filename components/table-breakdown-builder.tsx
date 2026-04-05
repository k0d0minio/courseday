'use client';

import { useRef } from 'react';
import { Plus, Minus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TableBreakdownBuilderProps = {
  value: number[];
  onChange: (breakdown: number[]) => void;
  disabled?: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TableBreakdownBuilder({ value, onChange, disabled = false }: TableBreakdownBuilderProps) {
  const t = useTranslations('Tenant.tableBreakdown');
  const addBtnRef = useRef<HTMLButtonElement>(null);

  const totalCovers = value.reduce((s, n) => s + n, 0);

  function addTable() {
    onChange([...value, 2]);
  }

  function removeTable(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function adjustSeats(index: number, delta: number) {
    const next = value[index] + delta;
    if (next < 1 || next > 20) return;
    const updated = [...value];
    updated[index] = next;
    onChange(updated);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>, index: number) {
    if (e.key === '+' || e.key === 'ArrowUp') {
      e.preventDefault();
      adjustSeats(index, 1);
    } else if (e.key === '-' || e.key === 'ArrowDown') {
      e.preventDefault();
      adjustSeats(index, -1);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      removeTable(index);
      // Move focus to add button after removal
      addBtnRef.current?.focus();
    }
  }

  if (value.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">{t('emptyLabel')}</p>
        <Button
          ref={addBtnRef}
          type="button"
          size="sm"
          variant="outline"
          onClick={addTable}
          disabled={disabled}
          aria-label={t('addTable')}
        >
          <Plus className="h-3 w-3 mr-1" /> {t('addTable')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Table blocks */}
      <div className="flex flex-wrap gap-2">
        {value.map((seats, index) => (
          <TableBlock
            key={index}
            index={index}
            seats={seats}
            disabled={disabled}
            onAdjust={(delta) => adjustSeats(index, delta)}
            onRemove={() => removeTable(index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            seatsLabel={t('seats')}
          />
        ))}

        <Button
          ref={addBtnRef}
          type="button"
          size="sm"
          variant="outline"
          onClick={addTable}
          disabled={disabled}
          className="h-auto self-start"
          aria-label={t('addTable')}
        >
          <Plus className="h-3 w-3 mr-1" /> {t('addTable')}
        </Button>
      </div>

      {/* Summary */}
      <p className="text-xs text-muted-foreground">
        {t('summary', { count: value.length, covers: totalCovers })}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TableBlock sub-component
// ---------------------------------------------------------------------------

type TableBlockProps = {
  index: number;
  seats: number;
  disabled: boolean;
  onAdjust: (delta: number) => void;
  onRemove: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  seatsLabel: string;
};

function TableBlock({ index, seats, disabled, onAdjust, onRemove, onKeyDown, seatsLabel }: TableBlockProps) {
  const tableNumber = index + 1;

  return (
    <div
      role="group"
      aria-label={`Table ${tableNumber}, ${seats} seats`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="relative flex flex-col items-center rounded-md border bg-card px-3 pt-5 pb-2 gap-1 min-w-[64px] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Remove table ${tableNumber}`}
        tabIndex={-1}
        className="absolute top-1 right-1 h-4 w-4 flex items-center justify-center rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted disabled:pointer-events-none"
      >
        <X className="h-3 w-3" />
      </button>

      {/* Increase */}
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-5 w-5"
        onClick={() => onAdjust(1)}
        disabled={disabled || seats >= 20}
        aria-label={`Add seat to table ${tableNumber}`}
        tabIndex={-1}
      >
        <Plus className="h-3 w-3" />
      </Button>

      {/* Seat count */}
      <span className="text-lg font-semibold tabular-nums leading-none">{seats}</span>

      {/* Decrease */}
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-5 w-5"
        onClick={() => onAdjust(-1)}
        disabled={disabled || seats <= 1}
        aria-label={`Remove seat from table ${tableNumber}`}
        tabIndex={-1}
      >
        <Minus className="h-3 w-3" />
      </Button>

      <span className="text-[10px] text-muted-foreground leading-none">{seatsLabel}</span>
    </div>
  );
}
