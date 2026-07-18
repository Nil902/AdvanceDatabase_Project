import { UserPlus, X, Loader2 } from 'lucide-react';
import type { UsersController } from './UserManagementTab';

const inputCls = 'w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs font-bold text-slate-800 outline-none focus:border-slate-500';
const labelCls = 'text-[11px] font-semibold text-slate-400 block';

// Add-user dialog. Fields mirror the backend SystemUserController@store rules.
export function AddUserModal({ users }: { users: UsersController }) {
  if (!users.showAddModal) return null;
  const d = users.addDraft;
  const set = (patch: Partial<typeof d>) => users.setAddDraft({ ...d, ...patch });

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Add New User</h3>
          <button onClick={users.closeAddModal} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={users.confirmAddUser} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={labelCls}>Username *</label>
              <input type="text" required value={d.username} onChange={(e) => set({ username: e.target.value })} className={inputCls} placeholder="e.g. sok.dara" />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Full Name (EN)</label>
              <input type="text" value={d.fullNameEn} onChange={(e) => set({ fullNameEn: e.target.value })} className={inputCls} placeholder="e.g. Sok Dara" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Email Address</label>
            <input type="email" value={d.email} onChange={(e) => set({ email: e.target.value })} className={inputCls} placeholder="e.g. sok.dara@nims.gov.kh" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={labelCls}>Phone Number</label>
              <input type="tel" value={d.phone} onChange={(e) => set({ phone: e.target.value })} className={inputCls} placeholder="e.g. 012 345 678" />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Password *</label>
              <input type="password" autoComplete="new-password" required minLength={8} value={d.password} onChange={(e) => set({ password: e.target.value })} className={inputCls} placeholder="min 8 characters" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={labelCls}>Role *</label>
              <select value={d.roleId} onChange={(e) => set({ roleId: Number(e.target.value) })} className={inputCls}>
                {users.roles.map((r) => <option key={r.role_id} value={r.role_id}>{r.role_name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Status</label>
              <select value={d.isActive ? '1' : '0'} onChange={(e) => set({ isActive: e.target.value === '1' })} className={inputCls}>
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </div>
          </div>
          <div className="pt-2 flex items-center gap-2 border-t border-slate-100">
            <button type="submit" disabled={users.saving} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-900 disabled:opacity-60">{users.saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}Create User</button>
            <button type="button" onClick={users.closeAddModal} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
