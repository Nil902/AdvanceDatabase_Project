import { UserRound } from 'lucide-react';

// Avatar for when you already hold an image URL (or null) — e.g. an account's
// stored avatar_url or a streamed blob URL. Falls back to the person's initials,
// then a generic glyph, instead of a fabricated stock photo. (For PII photos
// streamed through an auth-guarded endpoint, use PhotoAvatar instead.)
export function Avatar({
  url,
  name,
  className = 'h-9 w-9 text-xs',
  rounded = 'rounded-lg',
}: {
  url?: string | null;
  name?: string | null;
  className?: string;
  rounded?: string;
}) {
  const initials = (name ?? '').trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
  return (
    <div className={`flex ${className} shrink-0 items-center justify-center overflow-hidden ${rounded} border border-slate-200 bg-slate-100 font-bold text-slate-500`}>
      {url ? (
        <img src={url} alt={name ?? 'Avatar'} className="h-full w-full object-cover" />
      ) : initials ? (
        <span>{initials}</span>
      ) : (
        <UserRound className="h-1/2 w-1/2" />
      )}
    </div>
  );
}
