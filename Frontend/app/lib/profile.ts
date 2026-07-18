import { useState } from 'react';
import type React from 'react';
import { api, ApiError, getStoredUser, setStoredUser } from './api';

// The subset of the stored `auth_user` (SystemUserResource) the profile form
// reads/writes.
interface StoredProfile {
  user_id?: number;
  full_name_en?: string | null;
  email?: string | null;
  phone_number?: string | null;
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

  const [backup, setBackup] = useState({ name, email, phone, zone });

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
  };
}

export type ProfileForm = ReturnType<typeof useProfileForm>;
