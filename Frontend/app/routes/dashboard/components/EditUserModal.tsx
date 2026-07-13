import { Save, X } from 'lucide-react';
import type { UserAccount } from '../types';
import type { UsersController } from './UserManagementTab';

// Edit-user dialog. Mutates the cloned `editingUser` draft until saved.
export function EditUserModal({ users }: { users: UsersController }) {
  const editingUser = users.editingUser;
  if (!editingUser) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Edit User</h3>
          <button onClick={users.closeEditModal} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={users.confirmEditUser} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="edit-name" className="text-[11px] font-semibold text-slate-400 block">Full Name</label>
            <input id="edit-name" type="text" required value={editingUser.name} onChange={(e) => users.setEditingUser({ ...editingUser, name: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs font-bold text-slate-800 outline-none focus:border-slate-500" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="edit-email" className="text-[11px] font-semibold text-slate-400 block">Email Address</label>
            <input id="edit-email" type="email" required value={editingUser.email} onChange={(e) => users.setEditingUser({ ...editingUser, email: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs font-bold text-slate-800 outline-none focus:border-slate-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="edit-role" className="text-[11px] font-semibold text-slate-400 block">Role</label>
              <select id="edit-role" value={editingUser.role} onChange={(e) => users.setEditingUser({ ...editingUser, role: e.target.value as 'ADMIN' | 'USER' })} className="w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs font-bold text-slate-800 outline-none focus:border-slate-500">
                <option value="USER">Standard User</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="edit-status" className="text-[11px] font-semibold text-slate-400 block">Status</label>
              <select id="edit-status" value={editingUser.status} onChange={(e) => users.setEditingUser({ ...editingUser, status: e.target.value as UserAccount['status'] })} className="w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs font-bold text-slate-800 outline-none focus:border-slate-500">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>
          </div>
          <div className="pt-2 flex items-center gap-2 border-t border-slate-100">
            <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-900"><Save className="h-3.5 w-3.5" />Save Changes</button>
            <button type="button" onClick={users.closeEditModal} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
