'use client';

import { useEffect, useRef, useState } from 'react';
import { geocode, formatPlace } from '@/lib/location/geocode';
import type { GeocodeResult } from '@/lib/types';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onPick: (r: GeocodeResult, formatted: string) => void;
  placeholder?: string;
}

export default function PlaceAutocomplete({ value, onChange, onPick, placeholder }: Props) {
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const lastQuery = useRef('');

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    if (q === lastQuery.current) return;
    lastQuery.current = q;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    const tid = setTimeout(async () => {
      try {
        const rs = await geocode(q, ctrl.signal);
        if (!ctrl.signal.aborted) setResults(rs);
      } catch {
        if (!ctrl.signal.aborted) setResults([]);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 220);
    return () => {
      clearTimeout(tid);
      ctrl.abort();
    };
  }, [value]);

  return (
    <div className="relative">
      <input
        className="input"
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
      />
      {open && (results.length > 0 || loading) && (
        <ul className="absolute z-30 left-0 right-0 mt-1 bg-bg border border-hairline max-h-64 overflow-auto">
          {loading && (
            <li className="px-3 py-2 text-ink-dim text-[12px] caps-tight">searching…</li>
          )}
          {results.map((r, i) => {
            const label = formatPlace(r);
            return (
              <li key={`${r.name}-${i}`}>
                <button
                  type="button"
                  className="block w-full text-left px-3 py-2 hover:bg-hairline text-[14px]"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onPick(r, label);
                    onChange(label);
                    setOpen(false);
                  }}
                >
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
