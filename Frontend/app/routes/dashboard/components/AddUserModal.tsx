import { UserPlus, X } from 'lucide-react';
import type { UsersController } from './UserManagementTab';

// Add-user dialog. Reads and writes the add-modal slice of the users controller.
export function AddUserModal({ users }: { users: UsersController }) {
  if (!users.showAddModal) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Add New User</h3>
          <button onClick={users.closeAddModal} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={users.confirmAddUser} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="new-name" className="text-[11px] font-semibold text-slate-400 block">Full Name</label>
            <input id="new-name" type="text" required value={users.newUserName} onChange={(e) => users.setNewUserName(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs font-bold text-slate-800 outline-none focus:border-slate-500" placeholder="e.g. Sam Taylor" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="new-email" className="text-[11px] font-semibold text-slate-400 block">Email Address</label>
            <input id="new-email" type="email" required value={users.newUserEmail} onChange={(e) => users.setNewUserEmail(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs font-bold text-slate-800 outline-none focus:border-slate-500" placeholder="e.g. sam.taylor@corporate.com" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="new-role" className="text-[11px] font-semibold text-slate-400 block">Role</label>
            <select id="new-role" value={users.newUserRole} onChange={(e) => users.setNewUserRole(e.target.value as 'ADMIN' | 'USER')} className="w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs font-bold text-slate-800 outline-none focus:border-slate-500">
              <option value="USER">Standard User</option>
              <option value="ADMIN">Administrator</option>
            </select>
          </div>
          <div className="pt-2 flex items-center gap-2 border-t border-slate-100">
            <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-900"><UserPlus className="h-3.5 w-3.5" />Create User</button>
            <button type="button" onClick={users.closeAddModal} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
