'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';

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
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<GeoResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error('Search failed');
      const data: GeoResult[] | { error: string } = await res.json();
      if ('error' in data) throw new Error(data.error);
      setResults(data);
      setOpen(data.length > 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'City search failed.');
      setResults([]);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

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
    setSelected(null);
    setQuery('');
    setResults([]);
    setOpen(false);
    onClear();
  }

  const hasCoords = initialLatitude != null && initialLongitude != null;

  return (
    <div ref={containerRef} className="relative space-y-2">
      {selected ? (
        // Newly selected city
        <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>{formatCity(selected)}</span>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear location"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : hasCoords && !query ? (
        // Pre-existing coordinates (no city name stored)
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
            aria-label="Clear location"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        // Search input
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search for a city…"
            value={query}
            onChange={handleInputChange}
            onFocus={() => results.length > 0 && setOpen(true)}
            className="pl-9"
            aria-label="City search"
            aria-autocomplete="list"
            aria-expanded={open}
          />
        </div>
      )}

      {loading && <p className="text-xs text-muted-foreground">Searching…</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {!loading && !error && open && results.length === 0 && query.length >= 2 && (
        <p className="text-xs text-muted-foreground">No cities found.</p>
      )}

      {open && results.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md overflow-hidden"
        >
          {results.map((r, i) => (
            <li key={i} role="option" aria-selected={false}>
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
      )}
    </div>
  );
}
