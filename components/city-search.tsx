'use client';

import { useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Search, X, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';

export interface GeoResult {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}

function formatCity(r: GeoResult) {
  return r.state ? `${r.name}, ${r.state}, ${r.country}` : `${r.name}, ${r.country}`;
}

interface CitySearchProps {
  initialLatitude: number | null;
  initialLongitude: number | null;
  onSelect: (lat: number, lon: number) => void;
  onClear: () => void;
}

export function CitySearch({ initialLatitude, initialLongitude, onSelect, onClear }: CitySearchProps) {
  const t = useTranslations('Tenant.settings');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<GeoResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSeq = useRef(0);

  const search = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (trimmed.length < 2) {
        searchSeq.current += 1;
        setResults([]);
        setOpen(false);
        setError(null);
        setLoading(false);
        return;
      }

      const id = ++searchSeq.current;
      setLoading(true);
      setError(null);
      setOpen(true);

      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}`);

        let body: unknown;
        try {
          body = await res.json();
        } catch {
          body = null;
        }

        if (id !== searchSeq.current) return;

        if (!res.ok) {
          const msg =
            body &&
            typeof body === 'object' &&
            body !== null &&
            'error' in body &&
            typeof (body as { error: unknown }).error === 'string'
              ? (body as { error: string }).error
              : t('citySearchHttpError', { status: res.status });
          setError(msg);
          setResults([]);
          setOpen(false);
          return;
        }

        if (!Array.isArray(body)) {
          setError(t('cityUnexpectedResponse'));
          setResults([]);
          setOpen(false);
          return;
        }

        const mapped: GeoResult[] = body
          .filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object')
          .map((item) => ({
            name: String(item.name ?? ''),
            lat: Number(item.lat),
            lon: Number(item.lon),
            country: String(item.country ?? ''),
            state: item.state != null && String(item.state) !== '' ? String(item.state) : undefined,
          }))
          .filter((r) => r.name.length > 0 && Number.isFinite(r.lat) && Number.isFinite(r.lon));

        setResults(mapped);
        setOpen(true);
      } catch {
        if (id !== searchSeq.current) return;
        setError(t('citySearchFailed'));
        setResults([]);
        setOpen(false);
      } finally {
        if (id === searchSeq.current) {
          setLoading(false);
        }
      }
    },
    [t]
  );

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    setSelected(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  }

  function handleSelect(r: GeoResult) {
    setSelected(r);
    setQuery('');
    setResults([]);
    setOpen(false);
    onSelect(r.lat, r.lon);
  }

  function handleClear() {
    searchSeq.current += 1;
    setSelected(null);
    setQuery('');
    setResults([]);
    setOpen(false);
    setError(null);
    setLoading(false);
    onClear();
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
  }

  const hasCoords = initialLatitude != null && initialLongitude != null;

  return (
    <div className="space-y-2">
      {selected ? (
        <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>{formatCity(selected)}</span>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label={t('clearLocationAria')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : hasCoords && !query ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="font-mono text-xs">
                {initialLatitude?.toFixed(4)}, {initialLongitude?.toFixed(4)}
              </span>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label={t('clearLocationAria')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">{t('locationCoordsHint')}</p>
        </div>
      ) : (
        <Popover open={open} onOpenChange={handleOpenChange} modal={false}>
          <PopoverAnchor asChild>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
              <Input
                placeholder={t('citySearchPlaceholder')}
                value={query}
                onChange={handleInputChange}
                onFocus={() => {
                  if (query.trim().length >= 2 && !error) {
                    setOpen(true);
                  }
                }}
                className="pl-9"
                aria-label={t('citySearchAria')}
                aria-autocomplete="list"
                aria-expanded={open}
              />
            </div>
          </PopoverAnchor>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          <PopoverContent
            align="start"
            sideOffset={4}
            className="w-[var(--radix-popover-anchor-width)] max-w-[min(100vw-2rem,var(--radix-popover-anchor-width))] p-0 max-h-72 overflow-y-auto"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            {loading ? (
              <p className="px-3 py-2.5 text-xs text-muted-foreground">{t('citySearching')}</p>
            ) : results.length > 0 ? (
              <ul role="listbox" className="py-1">
                {results.map((r, i) => (
                  <li key={`${r.name}-${r.lat}-${r.lon}-${i}`} role="option" aria-selected={false}>
                    <button
                      type="button"
                      onClick={() => handleSelect(r)}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-accent transition-colors"
                    >
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                      {formatCity(r)}
                    </button>
                  </li>
                ))}
              </ul>
            ) : query.trim().length >= 2 ? (
              <p className="px-3 py-2.5 text-xs text-muted-foreground">{t('cityNoResults')}</p>
            ) : null}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
