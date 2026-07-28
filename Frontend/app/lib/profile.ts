import { useEffect, useState } from 'react';
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
  const stored = getStoredUser<StoredProfile>();

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(stored?.full_name_en ?? '');
  const [email, setEmail] = useState(stored?.email ?? '');
  const [phone, setPhone] = useState(stored?.phone_number ?? '');
  const [zone, setZone] = useState('');
  const [password, setPassword] = useState('');

  // The account's real role (from the stored session), used for the read-only
  // role/clearance labels — no fabricated "Clearance Level 5".
  const roleName = stored?.role?.role_name ?? stored?.role?.role_code ?? 'Operator';

  const [backup, setBackup] = useState({ name, email, phone, zone });

  // Profile picture: streamed from the auth-guarded GET /auth/me/avatar as a
  // blob URL (never a public URL). `hasAvatar` seeds from the stored session.
  const [hasAvatar, setHasAvatar] = useState(Boolean(stored?.has_avatar));
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  // Bumped after each upload so the effect re-fetches even though hasAvatar is
  // already true (the blob content changed, the flag didn't).
  const [avatarNonce, setAvatarNonce] = useState(0);

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
      setStoredUser({ ...(stored ?? {}), has_avatar: true });
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
    setBackup({ name, email, phone, zone });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setName(backup.name);
    setEmail(backup.email);
    setPhone(backup.phone);
    setZone(backup.zone);
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
        ...(stored ?? {}),
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
    zone, setZone,
    password, setPassword,
    startEditing,
    cancelEditing,
    saveProfile,
    avatarUrl, hasAvatar, uploadingAvatar, uploadAvatar,
    roleName,
  };
}

export type ProfileForm = ReturnType<typeof useProfileForm>;
