import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import { api, ApiError, fetchAuthedBlobUrl, getStoredUser, setStoredUser } from './api';

// The subset of the stored `auth_user` (SystemUserResource) the profile form
// reads/writes.
interface StoredProfile {
  user_id?: number;
  full_name_en?: string | null;
  email?: string | null;
  phone_number?: string | null;
  has_avatar?: boolean;
  role?: { role_code?: string | null; role_name?: string | null } | null;
}

// Manages the self-service profile fields plus the edit/cancel/save lifecycle.
// Shared by the admin dashboard (ProfileSettingsTab) and the registrar portal.
// Seeds from the stored `auth_user` and persists edits via PUT /auth/me — the
// authenticated user editing their own record — so it works for admin and
// registrar alike (no admin:read ability required).
export function useProfileForm() {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lets the async /auth/me refresh below read the *current* edit state so it
  // never clobbers fields the user is actively typing into.
  const isEditingRef = useRef(false);
  isEditingRef.current = isEditing;

  // Seeded to empty so the SSR render and the first client render match; the
  // real values are hydrated from the stored session in the client-only effect
  // below. Reading localStorage during render (getStoredUser returns null on
  // the server, the user on the client) desyncs the markup and breaks hydration
  // on this page — which manifested as the Edit toggle not working.
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // The account's real role (from the stored session), used for the read-only
  // role/clearance labels — no fabricated "Clearance Level 5".
  const [roleName, setRoleName] = useState('Operator');

  const [backup, setBackup] = useState({ name: '', email: '', phone: '' });

  // Profile picture: streamed from the auth-guarded GET /auth/me/avatar as a
  // blob URL (never a public URL). `hasAvatar` is hydrated from the session.
  const [hasAvatar, setHasAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  // Bumped after each upload so the effect re-fetches even though hasAvatar is
  // already true (the blob content changed, the flag didn't).
  const [avatarNonce, setAvatarNonce] = useState(0);

  // Hydrate the form on the client only (after mount) so the server and client
  // initial renders stay identical. First seed instantly from the stored
  // session (no flash), then refresh from GET /auth/me so the fields always
  // reflect current server truth rather than a stale login snapshot.
  useEffect(() => {
    let active = true;

    const apply = (u: StoredProfile) => {
      if (!active) return;
      setName(u.full_name_en ?? '');
      setEmail(u.email ?? '');
      setPhone(u.phone_number ?? '');
      setRoleName(u.role?.role_name ?? u.role?.role_code ?? 'Operator');
      setHasAvatar(Boolean(u.has_avatar));
    };

    const stored = getStoredUser<StoredProfile>();
    if (stored) apply(stored);

    // Pull the authoritative record. Skipped silently on failure (the seeded
    // values remain); a 401 is handled globally by apiFetch.
    api.get<StoredProfile>('/auth/me')
      .then((fresh) => {
        if (!active) return;
        setStoredUser({ ...(getStoredUser<StoredProfile>() ?? {}), ...fresh });
        // Don't overwrite in-flight edits; role/avatar are safe to refresh.
        if (isEditingRef.current) {
          setRoleName(fresh.role?.role_name ?? fresh.role?.role_code ?? 'Operator');
          setHasAvatar(Boolean(fresh.has_avatar));
          return;
        }
        apply(fresh);
      })
      .catch(() => {});

    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!hasAvatar) { setAvatarUrl(null); return; }
    let active = true;
    let created: string | null = null;
    fetchAuthedBlobUrl('/auth/me/avatar')
      .then((u) => { if (active) { created = u; setAvatarUrl(u); } else URL.revokeObjectURL(u); })
      .catch(() => { if (active) setAvatarUrl(null); });
    return () => { active = false; if (created) URL.revokeObjectURL(created); };
  }, [hasAvatar, avatarNonce]);

  const uploadAvatar = async (file: File) => {
    setUploadingAvatar(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      await api.post('/auth/me/avatar', fd);
      setStoredUser({ ...(getStoredUser<StoredProfile>() ?? {}), has_avatar: true });
      setHasAvatar(true);
      setAvatarNonce((n) => n + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to upload photo.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const startEditing = () => {
    setError(null);
    setBackup({ name, email, phone });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setName(backup.name);
    setEmail(backup.email);
    setPhone(backup.phone);
    setPassword('');
    setError(null);
    setIsEditing(false);
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.put('/auth/me', {
        full_name_en: name.trim() || null,
        email: email.trim() || null,
        phone_number: phone.trim() || null,
        ...(password ? { password } : {}),
      });
      // Keep the stored session in sync so the sidebar + next load reflect edits.
      setStoredUser({
        ...(getStoredUser<StoredProfile>() ?? {}),
        full_name_en: name.trim() || null,
        email: email.trim() || null,
        phone_number: phone.trim() || null,
      });
      setPassword('');
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  return {
    isEditing, saving, error,
    name, setName,
    email, setEmail,
    phone, setPhone,
    password, setPassword,
    startEditing,
    cancelEditing,
    saveProfile,
    avatarUrl, hasAvatar, uploadingAvatar, uploadAvatar,
    roleName,
  };
}

export type ProfileForm = ReturnType<typeof useProfileForm>;
