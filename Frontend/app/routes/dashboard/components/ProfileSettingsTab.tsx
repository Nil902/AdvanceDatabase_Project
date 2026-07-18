import { Save, X, Loader2 } from 'lucide-react';
import { DEFAULT_AVATAR } from '../constants';
import { useProfileForm, type ProfileForm } from '../../../lib/profile';

export { useProfileForm };
export type { ProfileForm };

// Profile settings: identity card on the left, editable account form on the
// right. Toggling Edit swaps read-only chips for inputs; Cancel rolls back.
export function ProfileSettingsTab({ profile }: { profile: ProfileForm }) {
  const { isEditing } = profile;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Profile Settings</h1>
        <p className="text-xs text-slate-500">View and manage your master security credentials and contact card parameters.</p>
      </div>

      <div className="grid grid-cols-12 gap-6 items-start">
        <div className="col-span-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm text-center space-y-4">
          <div className="relative group mx-auto h-20 w-20">
            <img src={DEFAULT_AVATAR.replace('w=100', 'w=200')} alt="Avatar Huge" className="h-20 w-20 rounded-xl object-cover border border-slate-100" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">{profile.name}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Clearance Level: 5</p>
          </div>
          <span className="inline-flex w-full justify-center rounded-lg bg-blue-50 py-2 text-[10px] font-bold uppercase tracking-widest text-blue-700">Root Superuser Access</span>
        </div>

        <div className="col-span-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <form onSubmit={profile.saveProfile} className="space-y-5">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Account Specifications</h4>

            {profile.error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800">{profile.error}</div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* Name Field */}
              <div className="space-y-1.5">
                <label htmlFor="p-name" className="text-[11px] font-semibold text-slate-400 block">Full Administrator Name</label>
                {isEditing ? (
                  <input id="p-name" type="text" value={profile.name} onChange={(e) => profile.setName(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs font-bold text-slate-800 outline-none transition focus:border-slate-500" />
                ) : (
                  <div className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs font-bold text-slate-600 select-all">{profile.name}</div>
                )}
              </div>

              {/* Institutional Email */}
              <div className="space-y-1.5">
                <label htmlFor="p-email" className="text-[11px] font-semibold text-slate-400 block">Registered Email Address</label>
                {isEditing ? (
                  <input id="p-email" type="email" value={profile.email} onChange={(e) => profile.setEmail(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs font-bold text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white" />
                ) : (
                  <div className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs font-bold text-slate-600 select-all">{profile.email}</div>
                )}
              </div>

              {/* Contact Phone Secure Line */}
              <div className="space-y-1.5">
                <label htmlFor="p-phone" className="text-[11px] font-semibold text-slate-400 block">Contact Phone Secure Line</label>
                {isEditing ? (
                  <input id="p-phone" type="text" value={profile.phone} onChange={(e) => profile.setPhone(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs font-bold text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white" />
                ) : (
                  <div className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs font-bold text-slate-600 select-all">{profile.phone}</div>
                )}
              </div>

              {/* Assigned Headquarters Zone */}
              <div className="space-y-1.5">
                <label htmlFor="p-zone" className="text-[11px] font-semibold text-slate-400 block">Assigned Headquarters Regional Zone</label>
                {isEditing ? (
                  <input id="p-zone" type="text" value={profile.zone} onChange={(e) => profile.setZone(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs font-bold text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white" />
                ) : (
                  <div className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs font-bold text-slate-600 select-all">{profile.zone}</div>
                )}
              </div>

              {/* Read-Only Hardware Node Token */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 block">Hardware Token ID</label>
                <div className="w-full rounded-lg border border-slate-200 bg-slate-100/70 py-2 px-3 text-xs font-bold text-slate-400 select-all">NIMS-NODE-0491-X</div>
              </div>

              {/* Master Passcode */}
              <div className="space-y-1.5">
                <label htmlFor="p-pass" className="text-[11px] font-semibold text-slate-400 block">Master Security Passcode</label>
                {isEditing ? (
                  <input id="p-pass" type="password" autoComplete="new-password" minLength={8} placeholder="leave blank to keep" value={profile.password} onChange={(e) => profile.setPassword(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs font-mono font-bold text-slate-800 outline-none transition focus:border-slate-500" />
                ) : (
                  <div className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs font-mono font-bold text-slate-600 select-none">••••••••••••••••</div>
                )}
              </div>
            </div>

            {/* Button Controls */}
            <div className="pt-2 flex items-center gap-2 border-t border-slate-100">
              {isEditing ? (
                <>
                  <button type="submit" disabled={profile.saving} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-900 disabled:opacity-60">{profile.saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}Save Account Changes</button>
                  <button type="button" onClick={profile.cancelEditing} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"><X className="h-3.5 w-3.5" />Cancel</button>
                </>
              ) : (
                <button type="button" onClick={profile.startEditing} className="rounded-lg bg-slate-950 px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-900">
                  Edit
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
