import { useEffect, useState } from 'react';
import { UserRound } from 'lucide-react';
import { fetchAuthedBlobUrl } from '~/lib/api';

// Generic avatar that streams a stored image through an auth-guarded endpoint
// (photos are PII, so never a public URL) and renders it as a rounded icon.
// Falls back to the subject's initials, then a generic glyph. Only fetches when
// `hasPhoto` is set, so rows without an image cost no request.
//
// `path` is the auth-guarded blob endpoint, e.g. `/id-cards/12/photo` or
// `/birth-certificates/34/photo`.
export function PhotoAvatar({
  path,
  hasPhoto,
  name,
  className = 'h-9 w-9 text-[11px]',
  rounded = 'rounded-full',
}: {
  path: string;
  hasPhoto?: boolean;
  name?: string | null;
  className?: string;
  rounded?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    setUrl(null);
    if (!hasPhoto) return;
    let active = true;
    let created: string | null = null;
    fetchAuthedBlobUrl(path)
      .then((u) => { if (active) { created = u; setUrl(u); } else URL.revokeObjectURL(u); })
      .catch(() => { if (active) setUrl(null); });
    return () => { active = false; if (created) URL.revokeObjectURL(created); };
  }, [path, hasPhoto]);

  const initials = (name ?? '').trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');

  return (
    <div className={`flex ${className} shrink-0 items-center justify-center overflow-hidden ${rounded} border border-slate-200 bg-slate-100 font-bold text-slate-500`}>
      {url ? (
        <img src={url} alt={name ?? 'Photo'} className="h-full w-full object-cover" />
      ) : initials ? (
        <span>{initials}</span>
      ) : (
        <UserRound className="h-1/2 w-1/2" />
      )}
    </div>
  );
}
