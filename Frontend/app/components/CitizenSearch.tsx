import { useEffect, useRef, useState } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import { api } from '~/lib/api';

export interface CitizenOption {
  id: number;
  national_id_number: string | null;
  full_name_kh: string | null;
  full_name_en: string | null;
}

function displayName(c: CitizenOption): string {
  if (c.full_name_kh) return `${c.full_name_kh} (${c.full_name_en ?? ''})`;
  return c.full_name_en ?? 'Unknown';
}

// Type-ahead against GET /citizens/search. Emits the chosen citizen so callers
// always get a real citizen_id, never freeform text. Shows the current pick as
// a removable chip. Supports keyboard nav (↑/↓/Enter/Esc) and click-outside.
export function CitizenSearch({
  placeholder,
  selected,
  onSelect,
  ringClass = 'focus:ring-slate-400',
}: {
  placeholder: string;
  selected: CitizenOption | null;
  onSelect: (citizen: CitizenOption | null) => void;
  ringClass?: string;
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<CitizenOption[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); setOpen(false); return; }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await api.get<{ data: CitizenOption[] }>('/citizens/search', { q, limit: 8 });
        if (!cancelled) { setResults(res.data); setOpen(true); setActiveIndex(-1); }
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q]);

  // Close the dropdown when clicking outside the component.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  function choose(c: CitizenOption) {
    onSelect(c);
    setOpen(false);
    setQ('');
    setActiveIndex(-1);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      choose(results[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-800">{displayName(selected)}</p>
          <p className="text-[11px] text-slate-500">NID: {selected.national_id_number ?? '—'}</p>
        </div>
        <button type="button" onClick={() => { onSelect(null); setQ(''); }} className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        className={`w-full rounded-lg border border-slate-200 py-2 pl-9 pr-8 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${ringClass}`}
      />
      {searching && <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-slate-400" />}
      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {results.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => choose(c)}
              className={`flex w-full flex-col items-start px-3 py-2 text-left ${i === activeIndex ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
            >
              <span className="text-sm font-semibold text-slate-800">{displayName(c)}</span>
              <span className="text-[11px] text-slate-500">NID: {c.national_id_number ?? '—'}</span>
            </button>
          ))}
        </div>
      )}
      {open && !searching && results.length === 0 && q.trim().length >= 2 && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-400 shadow-lg">
          No citizens match “{q}”.
        </div>
      )}
    </div>
  );
}
