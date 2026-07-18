import { useEffect, useRef, useState } from 'react';
import { Search, Loader2, Copy, Check } from 'lucide-react';
import { api } from '~/lib/api';
import type { CitizenOption } from './CitizenSearch';

// Global quick-lookup for the registrar top bar: find any citizen by name/NID
// and copy their national ID with one click. Replaces the previously dead
// (non-functional) search input.
export function CitizenQuickLookup() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<CitizenOption[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); setOpen(false); return; }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await api.get<{ data: CitizenOption[] }>('/citizens/search', { q, limit: 8 });
        if (!cancelled) { setResults(res.data); setOpen(true); }
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  async function copyNid(c: CitizenOption) {
    if (!c.national_id_number) return;
    try {
      await navigator.clipboard.writeText(c.national_id_number);
      setCopiedId(c.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      /* clipboard unavailable — ignore */
    }
  }

  return (
    <div className="relative max-w-md" ref={ref}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Look up any citizen by name (KH/ENG) or NID"
        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-9 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
      />
      {searching && <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-slate-400" />}

      {open && results.length > 0 && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {results.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-slate-50">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-800">
                  {c.full_name_kh ? `${c.full_name_kh} (${c.full_name_en ?? ''})` : c.full_name_en ?? 'Unknown'}
                </p>
                <p className="text-[11px] text-slate-500">NID: {c.national_id_number ?? '—'}</p>
              </div>
              {c.national_id_number && (
                <button
                  type="button"
                  onClick={() => copyNid(c)}
                  className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  title="Copy NID"
                >
                  {copiedId === c.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {open && !searching && results.length === 0 && q.trim().length >= 2 && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-400 shadow-lg">
          No citizens match “{q}”.
        </div>
      )}
    </div>
  );
}
