import { useEffect, useRef, useState } from 'react';
import { Search, Loader2, IdCard, MapPin, Camera } from 'lucide-react';
import { api } from '../../../lib/api';

// Shape returned by GET /citizens/search (App\Http\Resources\CitizenResource).
interface Citizen {
  id: number;
  national_id_number: string | null;
  full_name_kh: string | null;
  full_name_en: string | null;
  gender: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  occupation: string | null;
  has_photo?: boolean;
  birth_place?: {
    village_name?: string | null;
    commune_name?: string | null;
    district_name?: string | null;
    province_name?: string | null;
  } | null;
}

function birthPlace(c: Citizen): string {
  const b = c.birth_place;
  if (!b) return '—';
  return [b.village_name, b.commune_name, b.district_name, b.province_name].filter(Boolean).join(', ') || '—';
}

// Admin-side citizen search. Hits the same fast /citizens/search type-ahead the
// registrar portal uses, but renders a full results table so an admin can look
// up any citizen (by KH/EN name or national id) without switching portals.
export function CitizensTab() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Citizen[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  // Ignore stale responses if the user keeps typing (last-write-wins).
  const seq = useRef(0);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      setSearched(false);
      setError(null);
      return;
    }
    const mine = ++seq.current;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await api.get<{ data: Citizen[] }>('/citizens/search', { q: term, limit: 50 });
        if (mine === seq.current) {
          setResults(res.data);
          setSearched(true);
          setError(null);
        }
      } catch (e: any) {
        if (mine === seq.current) {
          setError(e?.message || 'Search failed.');
          setResults([]);
        }
      } finally {
        if (mine === seq.current) setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Citizen Lookup</h1>
        <p className="text-xs text-slate-500">Search the national registry by Khmer/English name or national ID number.</p>
      </div>

      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type a name (KH or ENG) or national ID — e.g. Jame Sok"
          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-800 outline-none transition focus:border-slate-500"
        />
        {searching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />}
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800">{error}</div>
      )}

      {q.trim().length < 2 ? (
        <p className="text-xs text-slate-400">Enter at least 2 characters to search.</p>
      ) : searched && results.length === 0 && !searching ? (
        <p className="text-xs text-slate-400">No citizens match “{q.trim()}”.</p>
      ) : results.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h3 className="text-xs font-bold text-slate-900">Results</h3>
            <span className="text-[11px] text-slate-400">{results.length}{results.length === 50 ? '+' : ''} match{results.length === 1 ? '' : 'es'}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400">
                <tr className="border-b border-slate-100">
                  <th className="px-5 py-2 font-semibold">Name</th>
                  <th className="px-5 py-2 font-semibold">National ID</th>
                  <th className="px-5 py-2 font-semibold">Gender</th>
                  <th className="px-5 py-2 font-semibold">Date of Birth</th>
                  <th className="px-5 py-2 font-semibold">Birth Place</th>
                  <th className="px-5 py-2 font-semibold text-center">Photo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {results.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-2.5">
                      <div className="font-semibold text-slate-800">{c.full_name_en || c.full_name_kh || 'Unknown'}</div>
                      {c.full_name_kh && c.full_name_en && <div className="text-[11px] text-slate-400">{c.full_name_kh}</div>}
                    </td>
                    <td className="px-5 py-2.5">
                      <span className="inline-flex items-center gap-1.5 font-mono text-slate-600">
                        <IdCard className="h-3.5 w-3.5 text-slate-400" />{c.national_id_number ?? '—'}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-slate-600">{c.gender ?? '—'}</td>
                    <td className="px-5 py-2.5 text-slate-600">{c.date_of_birth ?? '—'}</td>
                    <td className="px-5 py-2.5 text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                        <span className="max-w-xs truncate">{birthPlace(c)}</span>
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-center">
                      {c.has_photo ? <Camera className="mx-auto h-3.5 w-3.5 text-emerald-500" /> : <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
