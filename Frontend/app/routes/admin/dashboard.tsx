import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, UserPlus, Search, Edit2, Trash2, LogOut, 
  User, ChevronLeft, ChevronRight, FileSpreadsheet,
  AlertCircle, ShieldCheck, UserMinus, UserCheck, Upload, X
} from 'lucide-react';
import EditProfilePage from './edit-profile';
import SecureAddUserPage from './add-user';
import EditUserPage from './edit-user';

interface UserAccount {
  id: string;
  name: string;
  avatar: string;
  lastActive: string;
  email: string;
  role: 'ADMIN' | 'USER';
  status: 'Active' | 'Inactive' | 'Suspended';
  phone?: string;
  workplace?: string;
}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: 'USER_CREATED' | 'USER_MUTATED' | 'USER_REVOKED';
  actor: string;
  targetUser: string;
  details: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100';

const INITIAL_USERS: UserAccount[] = [
  { id: '1', name: 'Alex Rivera', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100', lastActive: '2h ago', email: 'alex.rivera@corporate.com', role: 'ADMIN', status: 'Active', phone: '+855 12 345 678', workplace: 'Khan Chamkar Mon, Phnom Penh (Municipality), Cambodia' },
  { id: '2', name: 'Jordan Smith', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100', lastActive: '15m ago', email: 'jordan.smith@corporate.com', role: 'USER', status: 'Active', phone: 'N/A', workplace: 'Krong Siem Reap, Siem Reap, Cambodia' },
  { id: '3', name: 'Elena Vance', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100', lastActive: '2d ago', email: 'elena.vance@corporate.com', role: 'USER', status: 'Inactive', phone: 'N/A', workplace: 'Krong Preah Sihanouk, Preah Sihanouk, Cambodia' },
  { id: '4', name: 'Marcus Chen', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100', lastActive: '1h ago', email: 'marcus.chen@corporate.com', role: 'USER', status: 'Suspended', phone: 'N/A', workplace: 'Khan Tuol Kouk, Phnom Penh (Municipality), Cambodia' }
];

const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  { id: 'log-1', timestamp: '2026-07-08 21:32:11', action: 'USER_MUTATED', actor: 'Pong', targetUser: 'Marcus Chen', details: 'Status token configured to Suspended across access keys.', severity: 'WARNING' },
  { id: 'log-2', timestamp: '2026-07-08 19:15:00', action: 'USER_CREATED', actor: 'Pong', targetUser: 'Jordan Smith', details: 'Provisioned basic read/write environment parameters cleanly.', severity: 'INFO' }
];

export default function AdminDashboardPage() {
  const adminFileInputRef = useRef<HTMLInputElement>(null);
  const [currentTab, setCurrentTab] = useState<'users' | 'profile' | 'add-user' | 'edit-user' | 'audit'>('users');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeUserFilter, setActiveUserFilter] = useState<'all' | 'admin' | 'standard'>('all');
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserAccount | null>(null);

  const [profileData, setProfileData] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedData = localStorage.getItem('admin_profile_data');
      if (savedData) {
        try { return JSON.parse(savedData); } catch (e) { console.error(e); }
      }
    }
    return { 
      name: 'Pong', 
      email: 'admin@corporate.com', 
      phone: '+855 23 999 888', 
      zone: 'North Region Central HQ',
      avatar: DEFAULT_AVATAR
    };
  });

  const [usersData, setUsersData] = useState<UserAccount[]>(() => {
    if (typeof window !== 'undefined') {
      const savedUsers = localStorage.getItem('admin_directory_users');
      if (savedUsers) {
        try { return JSON.parse(savedUsers); } catch (e) {}
      }
    }
    return INITIAL_USERS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    if (typeof window !== 'undefined') {
      const savedLogs = localStorage.getItem('admin_audit_logs');
      if (savedLogs) {
        try { return JSON.parse(savedLogs); } catch (e) {}
      }
    }
    return INITIAL_AUDIT_LOGS;
  });

  useEffect(() => {
    localStorage.setItem('admin_directory_users', JSON.stringify(usersData));
  }, [usersData]);

  useEffect(() => {
    localStorage.setItem('admin_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  const generateTimestamp = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  };

  const createNewAuditRecord = (action: AuditLogEntry['action'], targetUser: string, details: string, severity: AuditLogEntry['severity']) => {
    const freshLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: generateTimestamp(),
      action,
      actor: profileData.name,
      targetUser,
      details,
      severity
    };
    setAuditLogs(prev => [freshLog, ...prev]);
  };

  const handleDeleteUser = (id: string, name: string) => {
    if (confirm(`Are you absolutely sure you want to permanently remove access for ${name}?`)) {
      setUsersData(prev => prev.filter(user => user.id !== id));
      createNewAuditRecord('USER_REVOKED', name, `Permanent credential termination executed. Account metadata expunged.`, 'CRITICAL');
    }
  };

  const handleSecureAddUserSave = (payload: any) => {
    const newUserObj: UserAccount = {
      id: Date.now().toString(),
      name: payload.name,
      email: payload.email,
      role: payload.role,
      status: payload.status,
      lastActive: 'Just now',
      avatar: payload.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100',
      phone: payload.phone || 'N/A',
      workplace: payload.workplace || ''
    };

    setUsersData(prev => [newUserObj, ...prev]);
    createNewAuditRecord('USER_CREATED', payload.name, `New ${payload.role} record initialized. Base Status: ${payload.status}`, 'INFO');
    setCurrentTab('users'); 
  };

  const handleSecureEditUserSave = (updatedPayload: any) => {
    const originalRecord = usersData.find(u => u.id === updatedPayload.id);
    let descriptiveDetails = `System parameters modified. Access Authority Level: ${updatedPayload.role}`;
    
    if (originalRecord && originalRecord.status !== updatedPayload.status) {
      descriptiveDetails = `Lifecycle mutation state switched from [${originalRecord.status}] to [${updatedPayload.status}]. Auth tier: ${updatedPayload.role}`;
    }

    setUsersData(prev => 
      prev.map(u => u.id === updatedPayload.id ? { 
        ...u, 
        name: updatedPayload.name,
        email: updatedPayload.email,
        phone: updatedPayload.phone,
        avatar: updatedPayload.avatar,
        workplace: updatedPayload.workplace,
        role: updatedPayload.role,
        status: updatedPayload.status
      } : u)
    );

    const computationalSeverity: AuditLogEntry['severity'] = updatedPayload.status === 'Suspended' ? 'CRITICAL' : 'WARNING';
    createNewAuditRecord('USER_MUTATED', updatedPayload.name, descriptiveDetails, computationalSeverity);
    setSelectedUserForEdit(null);
    setCurrentTab('users');
  };

  const handleAdminAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Url = reader.result as string;
        const updated = { ...profileData, avatar: base64Url };
        setProfileData(updated);
        localStorage.setItem('admin_profile_data', JSON.stringify(updated));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAdminAvatar = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = { ...profileData, avatar: DEFAULT_AVATAR };
    setProfileData(updated);
    localStorage.setItem('admin_profile_data', JSON.stringify(updated));
    if (adminFileInputRef.current) adminFileInputRef.current.value = '';
  };

  const handleTriggerEditMode = (user: UserAccount) => {
    setSelectedUserForEdit(user);
    setCurrentTab('edit-user');
  };

  const filteredUsers = usersData.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || user.email.toLowerCase().includes(searchTerm.toLowerCase());
    if (activeUserFilter === 'admin') return matchesSearch && user.role === 'ADMIN';
    if (activeUserFilter === 'standard') return matchesSearch && user.role === 'USER';
    return matchesSearch;
  });

  const handleSaveProfileFromForm = (updatedData: typeof profileData) => {
    setProfileData(updatedData);
    localStorage.setItem('admin_profile_data', JSON.stringify(updatedData));
    setIsEditingProfile(false);
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-900 font-sans antialiased">
      
      {/* SIDEBAR NAVIGATION PANEL */}
      <aside className="fixed inset-y-0 left-0 flex w-64 flex-col justify-between border-r border-slate-200 bg-white p-5 shadow-xs z-10">
        <div className="space-y-7">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
            <img src={profileData.avatar || DEFAULT_AVATAR} alt="Avatar" className="h-9 w-9 rounded-lg object-cover border border-slate-200 shadow-xs" />
            <div>
              <h4 className="text-xs font-bold text-slate-900">{profileData.name}</h4>
              <p className="text-[11px] text-slate-500 truncate w-36">{profileData.email}</p>
            </div>
          </div>
          <nav className="space-y-1">
            <button type="button" onClick={() => { setCurrentTab('users'); setIsEditingProfile(false); setSelectedUserForEdit(null); }} className={`w-full flex items-center gap-3 rounded-lg px-4 py-2 text-xs font-bold transition ${currentTab === 'users' || currentTab === 'edit-user' || currentTab === 'add-user' ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}><Users className="h-4 w-4" />User Directory</button>
            <button type="button" onClick={() => { setCurrentTab('audit'); setIsEditingProfile(false); setSelectedUserForEdit(null); }} className={`w-full flex items-center gap-3 rounded-lg px-4 py-2 text-xs font-bold transition ${currentTab === 'audit' ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}><FileSpreadsheet className="h-4 w-4" />Audit Logs</button>
            <button type="button" onClick={() => { setCurrentTab('profile'); setIsEditingProfile(false); setSelectedUserForEdit(null); }} className={`w-full flex items-center gap-3 rounded-lg px-4 py-2 text-xs font-bold transition ${currentTab === 'profile' ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}><User className="h-4 w-4" />Profile Info</button>
          </nav>
        </div>
        <button type="button" className="w-full flex items-center gap-3 rounded-lg px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 text-left cursor-pointer"><LogOut className="h-4 w-4" />Log out</button>
      </aside>

      {/* CORE CONTENT PLATFORM SCREEN SPACE */}
      <main className="pl-64 w-full">
        <div className="mx-auto max-w-7xl p-10 space-y-8">
          
          {/* VIEW TAB 1: MASTER LIST */}
          {currentTab === 'users' && (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900">User Management</h1>
                  <p className="text-sm text-slate-500">Directory of all authorized administrative and staff accounts.</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setCurrentTab('add-user')}
                  className="inline-flex items-center gap-2 rounded-md bg-[#020617] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-900 transition cursor-pointer"
                >
                  <UserPlus className="h-4 w-4" /> Add User
                </button>
              </div>

              {/* FILTER MATRIX STRIP BAR */}
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex gap-2">
                  <button type="button" onClick={() => setActiveUserFilter('all')} className={`rounded-lg px-4 py-1.5 text-xs font-medium border transition ${activeUserFilter === 'all' ? 'bg-[#0f172a] text-white border-[#0f172a]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>All Users ({usersData.length})</button>
                  <button type="button" onClick={() => setActiveUserFilter('admin')} className={`rounded-lg px-4 py-1.5 text-xs font-medium border transition ${activeUserFilter === 'admin' ? 'bg-[#0f172a] text-white border-[#0f172a]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>Admins ({usersData.filter(u => u.role === 'ADMIN').length})</button>
                  <button type="button" onClick={() => setActiveUserFilter('standard')} className={`rounded-lg px-4 py-1.5 text-xs font-medium border transition ${activeUserFilter === 'standard' ? 'bg-[#0f172a] text-white border-[#0f172a]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>Standard ({usersData.filter(u => u.role === 'USER').length})</button>
                </div>

                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filter by name, email or role..." 
                    className="w-full rounded-md border border-slate-200 bg-[#f8fafc] py-2 pl-9 pr-4 text-xs text-slate-700 placeholder-slate-400 focus:outline-hidden focus:border-slate-400 transition"
                  />
                </div>
              </div>

              {/* GRID DIRECTORY TABLE SHEET */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#f8fafc] border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-6 py-4">User</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right pr-8">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-10 text-slate-400 font-medium">No system registrations found.</td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-50/70 transition">
                          <td className="px-6 py-4 flex items-center gap-3">
                            <img src={user.avatar} className="h-10 w-10 rounded-full object-cover border border-slate-100 shadow-xs" alt="" />
                            <div>
                              <div className="font-bold text-slate-900 text-sm">{user.name}</div>
                              <div className="text-[11px] text-slate-400 mt-0.5">Last active {user.lastActive}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-600 font-normal">{user.email}</td>
                          <td>
                            <span className={`px-2.5 py-1 rounded text-[10px] font-bold tracking-wide ml-6 ${
                              user.role === 'ADMIN' ? 'bg-[#dbeafe] text-[#2563eb]' : 'bg-[#f1f5f9] text-[#64748b]'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="flex items-center gap-1.5 font-medium">
                              <span className={`h-2 w-2 rounded-full ${
                                user.status === 'Active' ? 'bg-emerald-500' :
                                user.status === 'Inactive' ? 'bg-slate-400' : 'bg-rose-500'
                              }`} />
                              <span className={user.status === 'Active' ? 'text-emerald-700' : user.status === 'Inactive' ? 'text-slate-500' : 'text-rose-700'}>
                                {user.status}
                              </span>
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right pr-8">
                            <div className="inline-flex items-center gap-3">
                              <button type="button" onClick={() => handleTriggerEditMode(user)} className="p-1 text-slate-400 hover:text-slate-600 transition cursor-pointer"><Edit2 className="h-4 w-4" /></button>
                              <button type="button" onClick={() => handleDeleteUser(user.id, user.name)} className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"><Trash2 className="h-4 w-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* PAGINATION PANEL FOOTER */}
                <div className="bg-[#f8fafc] border-t border-slate-200 px-6 py-4 flex items-center justify-between text-xs text-slate-500 font-medium">
                  <div>Showing 1 to {filteredUsers.length} of {filteredUsers.length} entries</div>
                  <div className="flex items-center gap-1">
                    <button type="button" className="p-1.5 border border-slate-200 bg-white rounded text-slate-400"><ChevronLeft className="h-3.5 w-3.5" /></button>
                    <button type="button" className="px-3 py-1 bg-[#0f172a] text-white border border-[#0f172a] rounded text-xs font-bold">1</button>
                    <button type="button" className="p-1.5 border border-slate-200 bg-white rounded text-slate-400"><ChevronRight className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW TAB 2: AUDIT LOG SYSTEM INTERFACE */}
          {currentTab === 'audit' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Security Audit Logs</h1>
                <p className="text-sm text-slate-500">Immutable structural ledger recording system credential adjustments and workspace permission mutations.</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#f8fafc] border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-6 py-4">Timestamp</th>
                      <th className="px-6 py-4">Action Event</th>
                      <th className="px-6 py-4">Authorized Actor</th>
                      <th className="px-6 py-4">Target Identity</th>
                      <th className="px-6 py-4">Detailed Payload Ledger</th>
                      <th className="px-6 py-4 text-right pr-6">Severity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs font-medium text-slate-700">
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-slate-400 font-medium">No recorded events found in system buffers.</td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-6 py-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">{log.timestamp}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide ${
                              log.action === 'USER_CREATED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              log.action === 'USER_MUTATED' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {log.action === 'USER_CREATED' && <UserCheck className="h-3 w-3" />}
                              {log.action === 'USER_MUTATED' && <ShieldCheck className="h-3 w-3" />}
                              {log.action === 'USER_REVOKED' && <UserMinus className="h-3 w-3" />}
                              {log.action}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-900 font-semibold">{log.actor}</td>
                          <td className="px-6 py-4 text-slate-600">{log.targetUser}</td>
                          <td className="px-6 py-4 text-slate-400 font-normal max-w-xs truncate" title={log.details}>{log.details}</td>
                          <td className="px-6 py-4 text-right pr-6">
                            <span className={`inline-flex items-center gap-1 font-bold text-[11px] ${
                              log.severity === 'INFO' ? 'text-emerald-600' :
                              log.severity === 'WARNING' ? 'text-amber-600' : 'text-rose-600'
                            }`}>
                              {log.severity === 'CRITICAL' && <AlertCircle className="h-3 w-3 shrink-0" />}
                              {log.severity}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <div className="bg-[#f8fafc] border-t border-slate-200 px-6 py-4 text-xs text-slate-500 font-medium">
                  Ledger active tracking buffering {auditLogs.length} total access events.
                </div>
              </div>
            </div>
          )}

          {/* VIEW TAB 3: GRANULAR ADD USER PAGE CONTROLLER */}
          {currentTab === 'add-user' && (
            <SecureAddUserPage 
              onSave={handleSecureAddUserSave}
              onCancel={() => setCurrentTab('users')}
            />
          )}

          {/* VIEW TAB 4: GRANULAR EDIT USER PAGE CONTROLLER */}
          {currentTab === 'edit-user' && selectedUserForEdit && (
            <EditUserPage 
              user={selectedUserForEdit as any}
              onSave={handleSecureEditUserSave}
              onCancel={() => {
                setSelectedUserForEdit(null);
                setCurrentTab('users');
              }}
            />
          )}

          {/* VIEW TAB 5: ADMIN CONFIG INFO (WITH COMPREHENSIVE IMAGE UPLOAD LAYER Fix) */}
          {currentTab === 'profile' && (
            <div className="space-y-6">
              {!isEditingProfile ? (
                <>
                  <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Admin Profile Settings</h1>
                    <p className="text-sm text-slate-500">Manage your credentials, status layers, and file binary image parameters here.</p>
                  </div>
                  
                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs max-w-2xl space-y-6">
                    
                    {/* AVATAR INTERACTIVE LAYER ZONE */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Administrative Avatar Identity</label>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-4 rounded-xl bg-slate-50/50 border border-slate-100">
                        <div className="relative h-20 w-20 shrink-0 rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center overflow-hidden group shadow-inner">
                          <img src={profileData.avatar || DEFAULT_AVATAR} className="h-full w-full object-cover" alt="Admin token visual profile" />
                          <button 
                            type="button" 
                            onClick={handleRemoveAdminAvatar} 
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center text-white cursor-pointer border-none"
                            title="Reset to global default avatar placeholder"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="flex-1 w-full space-y-2">
                          <div 
                            onClick={() => adminFileInputRef.current?.click()}
                            className="border border-dashed border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50/50 p-4 rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer transition text-center shadow-2xs group"
                          >
                            <input 
                              type="file" 
                              ref={adminFileInputRef}
                              accept="image/*" 
                              className="hidden" 
                              onChange={handleAdminAvatarUpload}
                            />
                            <Upload className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition" />
                            <span className="text-xs font-semibold text-slate-700">Click to upload custom admin image asset</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* TEXT CONTENT META GROUP */}
                    <div className="border-t border-slate-100 pt-4 space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="block font-bold text-slate-400 text-[10px] uppercase tracking-wide">Display Admin Name</span>
                          <span className="text-sm font-bold text-slate-800">{profileData.name}</span>
                        </div>
                        <div>
                          <span className="block font-bold text-slate-400 text-[10px] uppercase tracking-wide">System Email Reference</span>
                          <span className="text-sm font-medium text-slate-600">{profileData.email}</span>
                        </div>
                      </div>
                    </div>

                    <button 
                      type="button" 
                      onClick={() => setIsEditingProfile(true)} 
                      className="rounded-lg bg-slate-950 px-4 py-2 text-xs font-bold text-white hover:bg-slate-900 transition border-none cursor-pointer"
                    >
                      Modify Profile Data
                    </button>
                  </div>
                </>
              ) : (
                <EditProfilePage initialData={profileData} onSave={handleSaveProfileFromForm} onCancel={() => setIsEditingProfile(false)} />
              )}
            </div>
          )}

        </div>
      </main>

    </div>
  );
}