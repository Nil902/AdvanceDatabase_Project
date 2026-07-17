import { useCallback, useEffect, useState } from 'react';
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
  Loader2,
} from 'lucide-react';
import { DEFAULT_AVATAR } from '../constants';
import { api, ApiError, type Paginated } from '../../../lib/api';
import { AddUserModal } from './AddUserModal';
import { EditUserModal } from './EditUserModal';

// ── API shapes (SystemUserResource / SystemUserController) ──────────────────
interface ApiSystemUser {
  user_id: number;
  username: string;
  email: string | null;
  full_name_en: string | null;
  full_name_kh: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  is_active: boolean;
  last_login_at: string | null;
  role?: { role_id: number; role_code: string; role_name: string } | null;
}

export interface RoleOption {
  role_id: number;
  role_code: string;
  role_name: string;
}

// Flattened row used by the table + modals.
export interface SystemUserRow {
  id: number;
  username: string;
  email: string;
  fullNameEn: string;
  fullNameKh: string;
  phone: string;
  roleId: number;
  roleCode: string;
  roleName: string;
  isActive: boolean;
  lastLoginAt: string | null;
  avatar: string;
}

function mapUser(u: ApiSystemUser): SystemUserRow {
  return {
    id: u.user_id,
    username: u.username,
    email: u.email ?? '',
    fullNameEn: u.full_name_en ?? '',
    fullNameKh: u.full_name_kh ?? '',
    phone: u.phone_number ?? '',
    roleId: u.role?.role_id ?? 0,
    roleCode: u.role?.role_code ?? '',
    roleName: u.role?.role_name ?? '—',
    isActive: u.is_active,
    lastLoginAt: u.last_login_at,
    avatar: u.avatar_url || DEFAULT_AVATAR,
  };
}

// Draft used by both modals. `password` is only sent when non-empty.
export interface UserDraft {
  id?: number;
  username: string;
  email: string;
  password: string;
  fullNameEn: string;
  phone: string;
  roleId: number;
  isActive: boolean;
}

function emptyDraft(defaultRoleId: number): UserDraft {
  return { username: '', email: '', password: '', fullNameEn: '', phone: '', roleId: defaultRoleId, isActive: true };
}

/**
 * Owns the user directory and the Add/Edit modal lifecycle, backed by the real
 * admin API (GET/POST/PUT/DELETE /api/v1/admin/users). Kept at page level so
 * the list survives dashboard tab switches.
 */
export function useUsers() {
  const [users, setUsers] = useState<SystemUserRow[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Paginated<ApiSystemUser>>('/admin/users', { per_page: 100 });
      setUsers(res.data.map(mapUser));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    api.get<{ data: RoleOption[] }>('/admin/roles').then((r) => setRoles(r.data)).catch(() => {});
  }, [loadUsers]);

  const defaultRoleId = roles.find((r) => r.role_code === 'registrar')?.role_id ?? roles[0]?.role_id ?? 3;

  // ---- ADD modal ----
  const [showAddModal, setShowAddModal] = useState(false);
  const [addDraft, setAddDraft] = useState<UserDraft>(emptyDraft(defaultRoleId));

  const openAddModal = () => {
    setError(null);
    setAddDraft(emptyDraft(defaultRoleId));
    setShowAddModal(true);
  };
  const closeAddModal = () => setShowAddModal(false);

  const confirmAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post('/admin/users', {
        username: addDraft.username.trim(),
        email: addDraft.email.trim() || null,
        password: addDraft.password,
        full_name_en: addDraft.fullNameEn.trim() || null,
        phone_number: addDraft.phone.trim() || null,
        role_id: addDraft.roleId,
        is_active: addDraft.isActive,
      });
      setShowAddModal(false);
      await loadUsers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create user.');
    } finally {
      setSaving(false);
    }
  };

  // ---- EDIT modal ----
  const [editingUser, setEditingUser] = useState<UserDraft | null>(null);

  const openEditModal = (row: SystemUserRow) =>
    setEditingUser({
      id: row.id,
      username: row.username,
      email: row.email,
      password: '',
      fullNameEn: row.fullNameEn,
      phone: row.phone,
      roleId: row.roleId,
      isActive: row.isActive,
    });
  const closeEditModal = () => setEditingUser(null);

  const confirmEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser?.id) return;
    setSaving(true);
    setError(null);
    try {
      await api.put(`/admin/users/${editingUser.id}`, {
        username: editingUser.username.trim(),
        email: editingUser.email.trim() || null,
        ...(editingUser.password ? { password: editingUser.password } : {}),
        full_name_en: editingUser.fullNameEn.trim() || null,
        phone_number: editingUser.phone.trim() || null,
        role_id: editingUser.roleId,
        is_active: editingUser.isActive,
      });
      setEditingUser(null);
      await loadUsers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update user.');
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (id: number) => {
    if (!window.confirm('Delete this user account?')) return;
    setError(null);
    try {
      await api.del(`/admin/users/${id}`);
      await loadUsers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete user.');
    }
  };

  return {
    users, roles, loading, error, saving,
    showAddModal, addDraft, setAddDraft, openAddModal, closeAddModal, confirmAddUser,
    editingUser, setEditingUser, openEditModal, closeEditModal, confirmEditUser,
    deleteUser,
  };
}

export type UsersController = ReturnType<typeof useUsers>;

function formatLastActive(iso: string | null): string {
  if (!iso) return 'never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'never';
  return d.toLocaleString();
}

export function UserManagementTab({ users }: { users: UsersController }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeUserFilter, setActiveUserFilter] = useState<'all' | 'admin' | 'standard'>('all');

  const usersData = users.users;

  const filteredUsers = usersData.filter((user) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      user.fullNameEn.toLowerCase().includes(q) ||
      user.username.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q) ||
      user.roleName.toLowerCase().includes(q);
    if (activeUserFilter === 'admin') return matchesSearch && user.roleCode === 'admin';
    if (activeUserFilter === 'standard') return matchesSearch && user.roleCode !== 'admin';
    return matchesSearch;
  });

  const totalUsersCount = usersData.length;
  const activeUsersCount = usersData.filter((u) => u.isActive).length;
  const adminUsersCount = usersData.filter((u) => u.roleCode === 'admin').length;
  const standardUsersCount = usersData.filter((u) => u.roleCode !== 'admin').length;
  const inactiveUsersCount = usersData.filter((u) => !u.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">User Management</h1>
          <p className="text-xs text-slate-500">Directory of all authorized administrative and staff accounts.</p>
        </div>
        <button onClick={users.openAddModal} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-xs font-bold text-white shadow hover:bg-slate-900"><UserPlus className="h-4 w-4" />Add User</button>
      </div>

      {users.error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800">{users.error}</div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4"><div className="rounded-lg bg-blue-50 p-3 text-blue-600"><Users className="h-5 w-5" /></div><div><span className="text-[11px] text-slate-500 font-medium block">Total Users</span><h3 className="text-lg font-bold text-slate-900 mt-0.5">{totalUsersCount} Users</h3></div></div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4"><div className="rounded-lg bg-emerald-50 p-3 text-emerald-600"><UserCheck className="h-5 w-5" /></div><div><span className="text-[11px] text-slate-500 font-medium block">Active</span><h3 className="text-lg font-bold text-slate-900 mt-0.5">{activeUsersCount} Active</h3></div></div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4"><div className="rounded-lg bg-amber-50 p-3 text-amber-600"><Shield className="h-5 w-5" /></div><div><span className="text-[11px] text-slate-500 font-medium block">Administrators</span><h3 className="text-lg font-bold text-slate-900 mt-0.5">{adminUsersCount} Admins</h3></div></div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4"><div className="rounded-lg bg-rose-50 p-3 text-rose-600"><Activity className="h-5 w-5" /></div><div><span className="text-[11px] text-slate-500 font-medium block">Inactive</span><h3 className="text-lg font-bold text-slate-900 mt-0.5">{inactiveUsersCount} Disabled</h3></div></div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm flex items-center justify-between gap-4">
        <div className="flex gap-1.5">{(['all', 'admin', 'standard'] as const).map((f) => (<button key={f} onClick={() => setActiveUserFilter(f)} className={`rounded-lg px-3 py-1 text-xs font-bold transition border tracking-wide ${activeUserFilter === f ? 'bg-slate-950 text-white border-slate-950 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{f === 'all' ? `All Users (${totalUsersCount})` : f === 'admin' ? `Admins (${adminUsersCount})` : `Standard (${standardUsersCount})`}</button>))}</div>
        <div className="relative w-72">
          <input type="text" placeholder="Filter by name, username, email or role..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-1.5 pl-3 pr-10 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:bg-white" />
          <Search className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
          <tr><th className="px-6 py-3.5">User</th><th className="px-6 py-3.5">Email</th><th className="px-6 py-3.5">Role</th><th className="px-6 py-3.5">Status</th><th className="px-6 py-3.5 text-center">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
          {users.loading && (
            <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
          )}
          {!users.loading && filteredUsers.length === 0 && (
            <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400 font-medium">No users found.</td></tr>
          )}
          {!users.loading && filteredUsers.map((account) => (
            <tr key={account.id} className="hover:bg-slate-50/50 transition">
              <td className="px-6 py-3.5 flex items-center gap-3"><img src={account.avatar} alt={account.fullNameEn || account.username} className="h-8 w-8 rounded-lg object-cover" /><div><div className="font-bold text-slate-900">{account.fullNameEn || account.username}</div><div className="text-[11px] text-slate-400">@{account.username} · last active {formatLastActive(account.lastLoginAt)}</div></div></td>
              <td className="px-6 py-3.5 text-slate-600 font-medium">{account.email || '—'}</td>
              <td className="px-6 py-3.5"><span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase ${account.roleCode === 'admin' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{account.roleName}</span></td>
              <td className="px-6 py-3.5"><div className="flex items-center gap-1.5 font-semibold"><span className={`h-1.5 w-1.5 rounded-full ${account.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} /><span className={account.isActive ? 'text-slate-800' : 'text-rose-600'}>{account.isActive ? 'Active' : 'Inactive'}</span></div></td>
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
