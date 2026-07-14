import type React from 'react';
import {
  LayoutDashboard,
  Users,
  User,
  FileSpreadsheet,
  Lock,
  LogOut,
} from 'lucide-react';
import { DEFAULT_AVATAR } from '../constants';
import { api, clearSession } from '../../../lib/api';
import type { DashboardTab } from '../types';

const NAV_ITEMS: { key: DashboardTab; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'users', label: 'User Management', icon: Users },
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'audit', label: 'Audit Logs', icon: FileSpreadsheet },
  { key: 'security', label: 'Security Settings', icon: Lock },
];

// The persistent shell: fixed sidebar navigation on the left, the active
// section rendered as `children` in the workspace on the right.
export function DashboardLayout({
  currentTab,
  onTabChange,
  profileName,
  profileEmail,
  children,
}: {
  currentTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  profileName: string;
  profileEmail: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans antialiased text-slate-900">

      {/* SIDEBAR NAVIGATION CONTROL PANEL */}
      <aside className="fixed inset-y-0 left-0 flex w-64 flex-col justify-between border-r border-slate-200 bg-white p-5 shadow-sm z-20">
        <div className="space-y-7">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
            <img src={DEFAULT_AVATAR} alt="Admin Avatar" className="h-9 w-9 rounded-lg object-cover" />
            <div>
              <h4 className="text-xs font-bold tracking-tight text-slate-900">{profileName}</h4>
              <p className="text-[11px] text-slate-500">{profileEmail}</p>
              <span className="mt-1 inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-700">Superuser</span>
            </div>
          </div>

          <nav className="space-y-1">
            {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => onTabChange(key)}
                className={`w-full flex items-center gap-3 rounded-lg px-4 py-2 text-xs font-bold tracking-wide transition ${currentTab === key ? 'bg-slate-950 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            ))}
          </nav>
        </div>
        <button onClick={async () => {
  try { await api.post('/auth/logout'); } catch {}
  clearSession();
  window.location.href = '/login';
}} className="flex items-center gap-3 rounded-lg px-4 py-2 text-xs font-bold tracking-wide text-red-600 transition hover:bg-red-50"><LogOut className="h-4 w-4 shrink-0" />Logout</button>
      </aside>

      {/* CORE WORKSPACE CONSOLE */}
      <main className="pl-64 w-full">
        <div className="mx-auto max-w-7xl p-8 space-y-8">
          {children}
        </div>
      </main>
    </div>
  );
}
