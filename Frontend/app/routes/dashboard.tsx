import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit2, 
  Trash2, 
  LogOut, 
  Shield, 
  Activity, 
  UserCheck,
  FileSpreadsheet,
  User,
  Lock,
  AlertTriangle,
  ChevronDown,
  Save,
  X
} from 'lucide-react';

interface UserAccount {
  id: string;
  name: string;
  avatar: string;
  lastActive: string;
  email: string;
  role: 'ADMIN' | 'USER';
  status: 'Active' | 'Inactive' | 'Suspended';
}

interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  ipAddress: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

export default function DashboardPage() {
  const [currentTab, setCurrentTab] = useState<'users' | 'profile' | 'audit' | 'security'>('profile');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeUserFilter, setActiveUserFilter] = useState<'all' | 'admin' | 'standard'>('all');

  // Security configuration states
  const [mfaRequired, setMfaRequired] = useState<boolean>(true);
  const [sessionTimeout, setSessionTimeout] = useState<string>('15');
  const [ipRestriction, setIpRestriction] = useState<boolean>(false);

  // Profile data states
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [profileName, setProfileName] = useState<string>('System Admin');
  const [profileEmail, setProfileEmail] = useState<string>('admin@corporate.com');
  const [profilePhone, setProfilePhone] = useState<string>('+855 23 999 888');
  const [profileZone, setProfileZone] = useState<string>('North Region Central HQ');
  const [profilePassword, setProfilePassword] = useState<string>('mastersecurepass123');

  // Cache layers for rolling back changes on cancel
  const [backupName, setBackupName] = useState<string>('System Admin');
  const [backupEmail, setBackupEmail] = useState<string>('admin@corporate.com');
  const [backupPhone, setBackupPhone] = useState<string>('+855 23 999 888');
  const [backupZone, setBackupZone] = useState<string>('North Region Central HQ');
  const [backupPassword, setBackupPassword] = useState<string>('mastersecurepass123');

  const usersData: UserAccount[] = [
    { id: '1', name: 'Alex Rivera', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100', lastActive: '2h ago', email: 'alex.rivera@corporate.com', role: 'ADMIN', status: 'Active' },
    { id: '2', name: 'Jordan Smith', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100', lastActive: '15m ago', email: 'jordan.smith@corporate.com', role: 'USER', status: 'Active' },
    { id: '3', name: 'Elena Vance', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100', lastActive: '2d ago', email: 'elena.vance@corporate.com', role: 'USER', status: 'Inactive' },
    { id: '4', name: 'Marcus Chen', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100', lastActive: '1h ago', email: 'marcus.chen@corporate.com', role: 'USER', status: 'Suspended' }
  ];

  const auditLogs: AuditLog[] = [
    { id: 'LOG-8821', timestamp: '2026-07-04 22:15:32', actor: 'admin@corporate.com', action: 'Modified system firewall parameters', ipAddress: '192.168.1.45', severity: 'WARNING' },
    { id: 'LOG-8820', timestamp: '2026-07-04 21:04:11', actor: 'alex.rivera@corporate.com', action: 'Provisioned standard user clearance token', ipAddress: '192.168.1.92', severity: 'INFO' },
    { id: 'LOG-8819', timestamp: '2026-07-04 19:42:01', actor: 'SYSTEM_DAEMON', action: 'Database query execution optimization completed', ipAddress: 'localhost', severity: 'INFO' },
    { id: 'LOG-8818', timestamp: '2026-07-04 18:22:50', actor: 'UNKNOWN_HOST', action: 'Failed SSH terminal authentication sequence match', ipAddress: '45.221.12.8', severity: 'CRITICAL' }
  ];

  const filteredUsers = usersData.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || user.email.toLowerCase().includes(searchTerm.toLowerCase());
    if (activeUserFilter === 'admin') return matchesSearch && user.role === 'ADMIN';
    if (activeUserFilter === 'standard') return matchesSearch && user.role === 'USER';
    return matchesSearch;
  });

  const handleStartEditing = () => {
    setBackupName(profileName);
    setBackupEmail(profileEmail);
    setBackupPhone(profilePhone);
    setBackupZone(profileZone);
    setBackupPassword(profilePassword);
    setIsEditingProfile(true);
  };

  const handleCancelEditing = () => {
    setProfileName(backupName);
    setProfileEmail(backupEmail);
    setProfilePhone(backupPhone);
    setProfileZone(backupZone);
    setProfilePassword(backupPassword);
    setIsEditingProfile(false);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditingProfile(false);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
      
      {/* SIDEBAR NAVIGATION CONTROL PANEL */}
      <aside className="fixed inset-y-0 left-0 flex w-64 flex-col justify-between border-r border-slate-200 bg-white p-5 shadow-sm z-20">
        <div className="space-y-7">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
            <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100" alt="Admin Avatar" className="h-9 w-9 rounded-lg object-cover" />
            <div>
              <h4 className="text-xs font-bold tracking-tight text-slate-900">{profileName}</h4>
              <p className="text-[11px] text-slate-500">{profileEmail}</p>
              <span className="mt-1 inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-700">Superuser</span>
            </div>
          </div>

          <nav className="space-y-1">
            <button onClick={() => setCurrentTab('users')} className={`w-full flex items-center gap-3 rounded-lg px-4 py-2 text-xs font-bold tracking-wide transition ${currentTab === 'users' ? 'bg-slate-950 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}><Users className="h-4 w-4 shrink-0" />User Management</button>
            <button onClick={() => setCurrentTab('profile')} className={`w-full flex items-center gap-3 rounded-lg px-4 py-2 text-xs font-bold tracking-wide transition ${currentTab === 'profile' ? 'bg-slate-950 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}><User className="h-4 w-4 shrink-0" />Profile</button>
            <button onClick={() => setCurrentTab('audit')} className={`w-full flex items-center gap-3 rounded-lg px-4 py-2 text-xs font-bold tracking-wide transition ${currentTab === 'audit' ? 'bg-slate-950 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}><FileSpreadsheet className="h-4 w-4 shrink-0" />Audit Logs</button>
            <button onClick={() => setCurrentTab('security')} className={`w-full flex items-center gap-3 rounded-lg px-4 py-2 text-xs font-bold tracking-wide transition ${currentTab === 'security' ? 'bg-slate-950 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}><Lock className="h-4 w-4 shrink-0" />Security Settings</button>
          </nav>
        </div>
        <a href="/login" className="flex items-center gap-3 rounded-lg px-4 py-2 text-xs font-bold tracking-wide text-red-600 transition hover:bg-red-50"><LogOut className="h-4 w-4 shrink-0" />Logout</a>
      </aside>

      {/* CORE WORKSPACE CONSOLE */}
      <main className="pl-64 w-full">
        <div className="mx-auto max-w-7xl p-8 space-y-8">
          
          {/* TAB 1: USER MANAGEMENT */}
          {currentTab === 'users' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">User Management</h1>
                  <p className="text-xs text-slate-500">Directory of all authorized administrative and staff accounts.</p>
                </div>
                <button className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-xs font-bold text-white shadow hover:bg-slate-900"><UserPlus className="h-4 w-4" />Add User</button>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4"><div className="rounded-lg bg-blue-50 p-3 text-blue-600"><Users className="h-5 w-5" /></div><div><span className="text-[11px] text-slate-500 font-medium block">Total Users</span><h3 className="text-lg font-bold text-slate-900 mt-0.5">248 Users</h3></div></div>
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4"><div className="rounded-lg bg-emerald-50 p-3 text-emerald-600"><UserCheck className="h-5 w-5" /></div><div><span className="text-[11px] text-slate-500 font-medium block">Active Clearances</span><h3 className="text-lg font-bold text-slate-900 mt-0.5">244 Active</h3></div></div>
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4"><div className="rounded-lg bg-amber-50 p-3 text-amber-600"><Shield className="h-5 w-5" /></div><div><span className="text-[11px] text-slate-500 font-medium block">Administrators</span><h3 className="text-lg font-bold text-slate-900 mt-0.5">12 Admins</h3></div></div>
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4"><div className="rounded-lg bg-rose-50 p-3 text-rose-600"><Activity className="h-5 w-5" /></div><div><span className="text-[11px] text-slate-500 font-medium block">Suspended</span><h3 className="text-lg font-bold text-slate-900 mt-0.5">4 Enforced</h3></div></div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm flex items-center justify-between gap-4">
                <div className="flex gap-1.5">{['all', 'admin', 'standard'].map((f) => (<button key={f} onClick={() => setActiveUserFilter(f as any)} className={`rounded-lg px-3 py-1 text-xs font-bold transition border tracking-wide ${activeUserFilter === f ? 'bg-slate-950 text-white border-slate-950 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{f === 'all' ? 'All Users (248)' : f === 'admin' ? 'Admins (12)' : 'Standard (236)'}</button>))}</div>
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
                  <tbody className="divide-y divide-slate-150">
                    {filteredUsers.map((account) => (
                      <tr key={account.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-6 py-3.5 flex items-center gap-3"><img src={account.avatar} alt={account.name} className="h-8 w-8 rounded-lg object-cover" /><div><div className="font-bold text-slate-900">{account.name}</div><div className="text-[11px] text-slate-400">Last active {account.lastActive}</div></div></td>
                        <td className="px-6 py-3.5 text-slate-600 font-medium">{account.email}</td>
                        <td className="px-6 py-3.5"><span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase ${account.role === 'ADMIN' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{account.role}</span></td>
                        <td className="px-6 py-3.5"><div className="flex items-center gap-1.5 font-semibold"><span className={`h-1.5 w-1.5 rounded-full ${account.status === 'Active' ? 'bg-emerald-500' : account.status === 'Inactive' ? 'bg-slate-400' : 'bg-rose-500'}`} /><span className={account.status === 'Active' ? 'text-slate-800' : account.status === 'Inactive' ? 'text-slate-500' : 'text-rose-600'}>{account.status}</span></div></td>
                        <td className="px-6 py-3.5"><div className="flex items-center justify-center gap-2"><button className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Edit2 className="h-3.5 w-3.5" /></button><button className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: PROFILE SETTINGS */}
          {currentTab === 'profile' && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Profile Settings</h1>
                <p className="text-xs text-slate-500">View and manage your master security credentials and contact card parameters.</p>
              </div>

              <div className="grid grid-cols-12 gap-6 items-start">
                <div className="col-span-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm text-center space-y-4">
                  <div className="relative group mx-auto h-20 w-20">
                    <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200" alt="Avatar Huge" className="h-20 w-20 rounded-xl object-cover border border-slate-100" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{profileName}</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Clearance Level: 5</p>
                  </div>
                  <span className="inline-flex w-full justify-center rounded-lg bg-blue-50 py-2 text-[10px] font-bold uppercase tracking-widest text-blue-700">Root Superuser Access</span>
                </div>

                <div className="col-span-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <form onSubmit={handleSaveProfile} className="space-y-5">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Account Specifications</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {/* Name Field */}
                      <div className="space-y-1.5">
                        <label htmlFor="p-name" className="text-[11px] font-semibold text-slate-400 block">Full Administrator Name</label>
                        {isEditingProfile ? (
                          <input id="p-name" type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs font-bold text-slate-800 outline-none transition focus:border-slate-500" />
                        ) : (
                          <div className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs font-bold text-slate-600 select-all">{profileName}</div>
                        )}
                      </div>

                      {/* Institutional Email */}
                      <div className="space-y-1.5">
                        <label htmlFor="p-email" className="text-[11px] font-semibold text-slate-400 block">Registered Email Address</label>
                        {isEditingProfile ? (
                          <input id="p-email" type="email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs font-bold text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white" />
                        ) : (
                          <div className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs font-bold text-slate-600 select-all">{profileEmail}</div>
                        )}
                      </div>

                      {/* Contact Phone Secure Line */}
                      <div className="space-y-1.5">
                        <label htmlFor="p-phone" className="text-[11px] font-semibold text-slate-400 block">Contact Phone Secure Line</label>
                        {isEditingProfile ? (
                          <input id="p-phone" type="text" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs font-bold text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white" />
                        ) : (
                          <div className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs font-bold text-slate-600 select-all">{profilePhone}</div>
                        )}
                      </div>

                      {/* Assigned Headquarters Zone */}
                      <div className="space-y-1.5">
                        <label htmlFor="p-zone" className="text-[11px] font-semibold text-slate-400 block">Assigned Headquarters Regional Zone</label>
                        {isEditingProfile ? (
                          <input id="p-zone" type="text" value={profileZone} onChange={(e) => setProfileZone(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs font-bold text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white" />
                        ) : (
                          <div className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs font-bold text-slate-600 select-all">{profileZone}</div>
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
                        {isEditingProfile ? (
                          <input id="p-pass" type="text" value={profilePassword} onChange={(e) => setProfilePassword(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs font-mono font-bold text-slate-800 outline-none transition focus:border-slate-500" />
                        ) : (
                          <div className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs font-mono font-bold text-slate-600 select-none">••••••••••••••••</div>
                        )}
                      </div>
                    </div>

                    {/* Button Controls */}
                    <div className="pt-2 flex items-center gap-2 border-t border-slate-100">
                      {isEditingProfile ? (
                        <>
                          <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-900"><Save className="h-3.5 w-3.5" />Save Account Changes</button>
                          <button type="button" onClick={handleCancelEditing} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"><X className="h-3.5 w-3.5" />Cancel</button>
                        </>
                      ) : (
                        <button type="button" onClick={handleStartEditing} className="rounded-lg bg-slate-950 px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-900">
                          Edit
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SYSTEM AUDIT LOGS */}
          {currentTab === 'audit' && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Audit Logs</h1>
                <p className="text-xs text-slate-500">Chronological security ledger recording administrative actions and operations.</p>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <tr><th className="px-6 py-3.5">Log ID</th><th className="px-6 py-3.5">Timestamp</th><th className="px-6 py-3.5">Actor</th><th className="px-6 py-3.5">Executed Action</th><th className="px-6 py-3.5">IP Address</th><th className="px-6 py-3.5 text-center">Severity</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 font-medium text-slate-600">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition font-mono text-[11px]">
                        <td className="px-6 py-3.5 text-slate-900 font-bold">{log.id}</td><td className="px-6 py-3.5 text-slate-500">{log.timestamp}</td><td className="px-6 py-3.5 text-slate-700 font-bold font-sans">{log.actor}</td><td className="px-6 py-3.5 text-slate-800 max-w-xs truncate font-sans font-medium">{log.action}</td><td className="px-6 py-3.5 text-slate-500">{log.ipAddress}</td>
                        <td className="px-6 py-3.5"><div className="flex justify-center"><span className={`inline-flex items-center rounded px-2 py-0.5 text-[9px] font-bold tracking-wide uppercase ${log.severity === 'CRITICAL' ? 'bg-red-50 text-red-700 border border-red-100' : log.severity === 'WARNING' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-slate-100 text-slate-600'}`}>{log.severity}</span></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: SECURITY SETTINGS */}
          {currentTab === 'security' && (
            <div className="space-y-6 max-w-4xl">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Security Settings</h1>
                <p className="text-xs text-slate-500">Global rule parameters mapping authentication mechanisms and environment variables.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="divide-y divide-slate-100">
                  <div className="p-6 flex items-center justify-between gap-8 transition hover:bg-slate-50/30">
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">Enforce Multi-Factor Authentication</label><span className="text-xs text-slate-400 block max-w-xl leading-relaxed">Require dual-factor matching tokens for standard personnel sessions.</span></div>
                    <button type="button" onClick={() => setMfaRequired(!mfaRequired)} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${mfaRequired ? 'bg-slate-950' : 'bg-slate-200'}`}><span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${mfaRequired ? 'translate-x-5' : 'translate-x-0'}`} /></button>
                  </div>
                  <div className="p-6 flex items-center justify-between gap-8 transition hover:bg-slate-50/30">
                    <div className="space-y-1"><label htmlFor="timeout-menu" className="text-xs font-bold text-slate-900 uppercase tracking-wider block">Session Inactivity Timeout</label><span className="text-xs text-slate-400 block max-w-xl leading-relaxed">Evict connection sessions automatically after a duration of structural inactivity.</span></div>
                    <div className="relative shrink-0">
                      <select id="timeout-menu" value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)} className="w-40 appearance-none rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-3 pr-10 text-xs font-bold text-slate-800 outline-none transition cursor-pointer hover:border-slate-300 focus:border-slate-400 focus:bg-white"><option value="5">5 Minutes</option><option value="15">15 Minutes</option><option value="30">30 Minutes</option><option value="60">1 Hour</option></select>
                      <ChevronDown className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="p-6 flex items-center justify-between gap-8 transition hover:bg-slate-50/30">
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">Restrict Access via Institutional IPs</label><span className="text-xs text-slate-400 block max-w-xl leading-relaxed">Block account authentication attempts initiated outside designated hardware nodes.</span></div>
                    <button type="button" onClick={() => setIpRestriction(!ipRestriction)} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${ipRestriction ? 'bg-slate-950' : 'bg-slate-200'}`}><span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${ipRestriction ? 'translate-x-5' : 'translate-x-0'}`} /></button>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 flex gap-3.5 shadow-xs">
                <div className="rounded-lg bg-amber-100 p-2 text-amber-700 h-9 w-9 flex items-center justify-center shrink-0"><AlertTriangle className="h-4 w-4" /></div>
                <div className="text-xs text-amber-900 space-y-1"><h5 className="font-bold tracking-wide text-amber-900 uppercase text-[10px]">Global Parameter Modification Warning</h5><p className="leading-relaxed font-medium text-slate-600">Altering configuration flags modifies validation variables platform-wide instantly. Validate operations protocol before saving parameters.</p></div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}