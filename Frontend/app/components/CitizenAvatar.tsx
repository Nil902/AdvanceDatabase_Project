import { useEffect, useState } from 'react';
import { UserRound } from 'lucide-react';
import { fetchAuthedBlobUrl } from '~/lib/api';

// Round profile icon for a citizen. Streams the stored portrait through the
// auth-guarded GET /citizens/{id}/photo (a face photo is PII, so it is never a
// public URL); falls back to the person's initials, then a generic glyph.
export function CitizenAvatar({
  id,
  hasPhoto,
  name,
  size = 'md',
}: {
  id: number;
  hasPhoto?: boolean;
  name?: string | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    setUrl(null);
    if (!hasPhoto) return;
    let active = true;
    let created: string | null = null;
    fetchAuthedBlobUrl(`/citizens/${id}/photo`)
      .then((u) => { if (active) { created = u; setUrl(u); } else URL.revokeObjectURL(u); })
      .catch(() => { if (active) setUrl(null); });
    return () => { active = false; if (created) URL.revokeObjectURL(created); };
  }, [id, hasPhoto]);

  const dim = size === 'sm' ? 'h-8 w-8 text-[10px]' : size === 'lg' ? 'h-16 w-16 text-lg' : 'h-10 w-10 text-xs';
  const initials = (name ?? '').trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');

  return (
    <div className={`flex ${dim} shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 font-bold text-slate-500`}>
      {url ? (
        <img src={url} alt={name ?? 'Citizen'} className="h-full w-full object-cover" />
      ) : initials ? (
        <span>{initials}</span>
      ) : (
        <UserRound className="h-1/2 w-1/2" />
      )}
    </div>
  );
}
