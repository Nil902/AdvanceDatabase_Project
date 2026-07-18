import React, { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router';
import {
  FileBarChart2,
  FileHeart,
  IdCard,
  BookOpen,
  UsersRound,
  LogOut,
  KeyRound,
} from 'lucide-react';
import { api, clearSession, getStoredUser } from '~/lib/api';
import { AuthGuard } from '~/components/AuthGuard';
import { CitizenQuickLookup } from '~/components/CitizenQuickLookup';

const NAV_ITEMS = [
  { to: '/registrar', label: 'Demographic Report', icon: FileBarChart2, color: 'text-blue-400' },
  { to: '/registrar/birth-certificate', label: 'Birth Certificate', icon: FileHeart, color: 'text-emerald-400' },
  { to: '/registrar/national-id', label: 'National ID Card', icon: IdCard, color: 'text-amber-400' },
  { to: '/registrar/residency-book', label: 'Residency Book', icon: BookOpen, color: 'text-purple-400' },
  { to: '/registrar/family-management', label: 'Family Management', icon: UsersRound, color: 'text-red-400' },
];

// Shape stored in localStorage at login (SystemUserResource).
interface StoredUser {
  full_name_en: string | null;
  username: string;
  email: string;
  role?: { role_name: string } | null;
}

export default function RegistrarLayout() {
  const [user, setUser] = useState<StoredUser | null>(null);

  // AuthGuard (below) handles the token + role redirects; here we just hydrate
  // the sidebar identity box from the stored user.
  useEffect(() => {
    setUser(getStoredUser<StoredUser>());
  }, []);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Even if the server call fails (e.g. already-expired token), clear
      // locally and continue to the login screen.
    } finally {
      clearSession();
      window.location.href = '/login';
    }
  };

  const currentRegistrar = {
    name: user?.full_name_en || user?.username || 'Registrar',
    role: user?.email || 'NIMS Portal',
    desk: (user?.role?.role_name || 'COMMUNE DESK').toUpperCase(),
  };

  return (
    <AuthGuard area="registrar">
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">

      {/* SIDEBAR */}
      <aside className="fixed inset-y-0 left-0 flex w-[200px] flex-col justify-between bg-[#0b1120] px-4 py-5 z-20">
        <div className="space-y-6">
          <div className="px-1">
            <h1 className="text-sm font-bold tracking-tight text-white leading-tight">NIMS Portal</h1>
            <p className="text-[9px] font-semibold tracking-wider text-slate-400">NATIONAL IDENTITY SYSTEM</p>
          </div>

          <div className="space-y-2">
            <p className="px-1 text-[10px] font-bold tracking-widest text-slate-500">OPERATIONAL</p>
            <nav className="space-y-1">
              {NAV_ITEMS.map(({ to, label, icon: Icon, color }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/registrar'}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      isActive
                        ? 'bg-blue-600/90 text-white'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>

        {/* SECURED KEY / SESSION BOX */}
        <div className="space-y-3 rounded-xl bg-white/5 p-3">
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-amber-400">
            <KeyRound className="h-3.5 w-3.5" />
            SECURED KEY
          </div>
          <div>
            <p className="text-xs font-bold text-white">{currentRegistrar.name}</p>
            <p className="text-[10px] text-slate-400">{currentRegistrar.role}</p>
            <p className="text-[10px] font-bold text-amber-400">{currentRegistrar.desk}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-red-600/90 py-2 text-[10px] font-bold text-white transition hover:bg-red-600"
          >
            <LogOut className="h-3 w-3" />
            Terminate Session
          </button>
        </div>
      </aside>

      {/* MAIN AREA */}
      <div className="pl-[200px] w-full">
        {/* TOP SEARCH BAR — functional global citizen lookup */}
        <div className="border-b border-slate-200 bg-white px-6 py-3">
          <CitizenQuickLookup />
        </div>

        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
    </AuthGuard>
  );
}