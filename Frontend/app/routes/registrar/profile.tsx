import { Save, X, Loader2, UserCog } from 'lucide-react';
import { useProfileForm } from '~/lib/profile';

const inputCls = 'w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs font-bold text-slate-800 outline-none transition focus:border-slate-500';
const labelCls = 'text-[11px] font-semibold text-slate-400 block';
const readCls = 'w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs font-bold text-slate-600 select-all';

// Self-service profile page for registrar (non-admin) users. Backed by the
// shared useProfileForm hook → PUT /auth/me, so a registrar can update their
// own name, contact details and password without admin rights.
export default function RegistrarProfile() {
  const profile = useProfileForm();
  const { isEditing } = profile;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Profile</h1>
        <p className="text-xs text-slate-500">Update your account name, contact details and password.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={profile.saveProfile} className="space-y-5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
            <UserCog className="h-4 w-4 text-blue-500" />
            Account Details
          </div>

          {profile.error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800">{profile.error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label htmlFor="rp-name" className={labelCls}>Full Name</label>
              {isEditing ? (
                <input id="rp-name" type="text" value={profile.name} onChange={(e) => profile.setName(e.target.value)} className={inputCls} />
              ) : (
                <div className={readCls}>{profile.name || '—'}</div>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="rp-email" className={labelCls}>Email Address</label>
              {isEditing ? (
                <input id="rp-email" type="email" value={profile.email} onChange={(e) => profile.setEmail(e.target.value)} className={inputCls} />
              ) : (
                <div className={readCls}>{profile.email || '—'}</div>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label htmlFor="rp-phone" className={labelCls}>Phone Number</label>
              {isEditing ? (
                <input id="rp-phone" type="tel" value={profile.phone} onChange={(e) => profile.setPhone(e.target.value)} className={inputCls} />
              ) : (
                <div className={readCls}>{profile.phone || '—'}</div>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="rp-pass" className={labelCls}>New Password</label>
              {isEditing ? (
                <input id="rp-pass" type="password" autoComplete="new-password" minLength={8} placeholder="leave blank to keep" value={profile.password} onChange={(e) => profile.setPassword(e.target.value)} className={`${inputCls} font-mono`} />
              ) : (
                <div className={`${readCls} font-mono select-none`}>••••••••••••</div>
              )}
            </div>
          </div>

          <div className="pt-2 flex items-center gap-2 border-t border-slate-100">
            {isEditing ? (
              <>
                <button type="submit" disabled={profile.saving} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-900 disabled:opacity-60">{profile.saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}Save Changes</button>
                <button type="button" onClick={profile.cancelEditing} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"><X className="h-3.5 w-3.5" />Cancel</button>
              </>
            ) : (
              <button type="button" onClick={profile.startEditing} className="rounded-lg bg-slate-950 px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-900">Edit Profile</button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
