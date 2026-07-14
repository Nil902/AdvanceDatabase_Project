import { useState } from 'react';
import type React from 'react';
import {
  Users,
  UserPlus,
  UserCheck,
  Shield,
  Activity,
  Search,
  Edit2,
  Trash2,
} from 'lucide-react';
import { DEFAULT_AVATAR } from '../constants';
import type { UserAccount } from '../types';
import { AddUserModal } from './AddUserModal';
import { EditUserModal } from './EditUserModal';

// TODO: GET /api/v1/users
const initialUsers: UserAccount[] = [
  { id: '1', name: 'Alex Rivera', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100', lastActive: '2h ago', email: 'alex.rivera@corporate.com', role: 'ADMIN', status: 'Active' },
  { id: '2', name: 'Jordan Smith', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100', lastActive: '15m ago', email: 'jordan.smith@corporate.com', role: 'USER', status: 'Active' },
  { id: '3', name: 'Elena Vance', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100', lastActive: '2d ago', email: 'elena.vance@corporate.com', role: 'USER', status: 'Inactive' },
  { id: '4', name: 'Marcus Chen', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100', lastActive: '1h ago', email: 'marcus.chen@corporate.com', role: 'USER', status: 'Suspended' },
];

// Owns the user directory plus the Add/Edit modal lifecycle. Kept at page
// level (called by the dashboard root) so the list survives tab switches —
// the tab body unmounts on switch.
export function useUsers() {
  const [users, setUsers] = useState<UserAccount[]>(initialUsers);

  // ---- ADD USER modal state ----
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'ADMIN' | 'USER'>('USER');

  // ---- EDIT USER modal state (a clone; not applied until saved) ----
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  const openAddModal = () => {
    setNewUserName('');
    setNewUserEmail('');
    setNewUserRole('USER');
    setShowAddModal(true);
  };

  const closeAddModal = () => setShowAddModal(false);

  const confirmAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    const newAccount: UserAccount = {
      id: crypto.randomUUID(),
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      role: newUserRole,
      status: 'Active',
      lastActive: 'Just now',
      avatar: DEFAULT_AVATAR,
    };

    setUsers(prev => [newAccount, ...prev]);
    setShowAddModal(false);
  };

  const openEditModal = (user: UserAccount) => setEditingUser({ ...user });
  const closeEditModal = () => setEditingUser(null);

  const confirmEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setUsers(prev => prev.map(u => (u.id === editingUser.id ? editingUser : u)));
    setEditingUser(null);
  };

  const deleteUser = (id: string) => setUsers(prev => prev.filter(u => u.id !== id));

  return {
    users,
    // add modal
    showAddModal, newUserName, setNewUserName, newUserEmail, setNewUserEmail,
    newUserRole, setNewUserRole, openAddModal, closeAddModal, confirmAddUser,
    // edit modal
    editingUser, setEditingUser, openEditModal, closeEditModal, confirmEditUser,
    // row actions
    deleteUser,
  };
}

export type UsersController = ReturnType<typeof useUsers>;

// User directory: stat cards, search + role filter, table, and the two modals.
// Search/filter are purely local UI concerns; the list and CRUD come from the
// shared users controller so data survives tab switches.
export function UserManagementTab({ users }: { users: UsersController }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeUserFilter, setActiveUserFilter] = useState<'all' | 'admin' | 'standard'>('all');

  const usersData = users.users;

  const filteredUsers = usersData.filter(user => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    if (activeUserFilter === 'admin') return matchesSearch && user.role === 'ADMIN';
    if (activeUserFilter === 'standard') return matchesSearch && user.role === 'USER';
    return matchesSearch;
  });

  // ---- Dynamic stat card values (derived from real usersData) ----
  const totalUsersCount = usersData.length;
  const activeUsersCount = usersData.filter(u => u.status === 'Active').length;
  const adminUsersCount = usersData.filter(u => u.role === 'ADMIN').length;
  const standardUsersCount = usersData.filter(u => u.role === 'USER').length;
  const suspendedUsersCount = usersData.filter(u => u.status === 'Suspended').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">User Management</h1>
          <p className="text-xs text-slate-500">Directory of all authorized administrative and staff accounts.</p>
        </div>
        <button onClick={users.openAddModal} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-xs font-bold text-white shadow hover:bg-slate-900"><UserPlus className="h-4 w-4" />Add User</button>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4"><div className="rounded-lg bg-blue-50 p-3 text-blue-600"><Users className="h-5 w-5" /></div><div><span className="text-[11px] text-slate-500 font-medium block">Total Users</span><h3 className="text-lg font-bold text-slate-900 mt-0.5">{totalUsersCount} Users</h3></div></div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4"><div className="rounded-lg bg-emerald-50 p-3 text-emerald-600"><UserCheck className="h-5 w-5" /></div><div><span className="text-[11px] text-slate-500 font-medium block">Active Clearances</span><h3 className="text-lg font-bold text-slate-900 mt-0.5">{activeUsersCount} Active</h3></div></div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4"><div className="rounded-lg bg-amber-50 p-3 text-amber-600"><Shield className="h-5 w-5" /></div><div><span className="text-[11px] text-slate-500 font-medium block">Administrators</span><h3 className="text-lg font-bold text-slate-900 mt-0.5">{adminUsersCount} Admins</h3></div></div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4"><div className="rounded-lg bg-rose-50 p-3 text-rose-600"><Activity className="h-5 w-5" /></div><div><span className="text-[11px] text-slate-500 font-medium block">Suspended</span><h3 className="text-lg font-bold text-slate-900 mt-0.5">{suspendedUsersCount} Enforced</h3></div></div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm flex items-center justify-between gap-4">
        <div className="flex gap-1.5">{(['all', 'admin', 'standard'] as const).map((f) => (<button key={f} onClick={() => setActiveUserFilter(f)} className={`rounded-lg px-3 py-1 text-xs font-bold transition border tracking-wide ${activeUserFilter === f ? 'bg-slate-950 text-white border-slate-950 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{f === 'all' ? `All Users (${totalUsersCount})` : f === 'admin' ? `Admins (${adminUsersCount})` : `Standard (${standardUsersCount})`}</button>))}</div>
        <div className="relative w-72">
          <input type="text" placeholder="Filter by name, email or role..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-1.5 pl-3 pr-10 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:bg-white" />
          <Search className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
          <tr><th className="px-6 py-3.5">User</th><th className="px-6 py-3.5">Email</th><th className="px-6 py-3.5">Role</th><th className="px-6 py-3.5">Status</th><th className="px-6 py-3.5 text-center">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
          {filteredUsers.length === 0 && (
            <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400 font-medium">No users match your search.</td></tr>
          )}
          {filteredUsers.map((account) => (
            <tr key={account.id} className="hover:bg-slate-50/50 transition">
              <td className="px-6 py-3.5 flex items-center gap-3"><img src={account.avatar} alt={account.name} className="h-8 w-8 rounded-lg object-cover" /><div><div className="font-bold text-slate-900">{account.name}</div><div className="text-[11px] text-slate-400">Last active {account.lastActive}</div></div></td>
              <td className="px-6 py-3.5 text-slate-600 font-medium">{account.email}</td>
              <td className="px-6 py-3.5"><span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase ${account.role === 'ADMIN' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{account.role}</span></td>
              <td className="px-6 py-3.5"><div className="flex items-center gap-1.5 font-semibold"><span className={`h-1.5 w-1.5 rounded-full ${account.status === 'Active' ? 'bg-emerald-500' : account.status === 'Inactive' ? 'bg-slate-400' : 'bg-rose-500'}`} /><span className={account.status === 'Active' ? 'text-slate-800' : account.status === 'Inactive' ? 'text-slate-500' : 'text-rose-600'}>{account.status}</span></div></td>
              <td className="px-6 py-3.5"><div className="flex items-center justify-center gap-2"><button onClick={() => users.openEditModal(account)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Edit2 className="h-3.5 w-3.5" /></button><button onClick={() => users.deleteUser(account.id)} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button></div></td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>

      <AddUserModal users={users} />
      <EditUserModal users={users} />
    </div>
  );
}
