import React, { useState } from 'react';
import SecureAddUserPage from './add-user';
import EditUserPage from './edit-user';
import { Pencil, UserPlus, Search } from 'lucide-react';

// Sample interface structure for your list row states
interface UserData {
  id: string | number;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  image: string;
  workplace: string;
  role: 'USER' | 'ADMIN';
  status: 'Active' | 'Suspended';
}

export default function UsersDashboard() {
  // Current App Views: 'LIST' | 'ADD' | 'EDIT'
  const [currentView, setCurrentView] = useState<'LIST' | 'ADD' | 'EDIT'>('LIST');
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserData | null>(null);

  // Core User state array placeholder
  const [users, setUsers] = useState<UserData[]>([
    {
      id: 1,
      name: "Rattanakpong Pha",
      email: "r.pha@enterprise.kh",
      phone: "+855 23 888 999",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100",
      image: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100",
      workplace: "Khan Boeng Keng Kang, Phnom Penh (Municipality), Cambodia",
      role: "ADMIN",
      status: "Suspended" // Matching your visual reference state
    }
  ]);

  const handleAddNewUserAction = (newPayload: any) => {
    const newUserObj: UserData = {
      id: Date.now(), // Generate local unique reference key
      ...newPayload
    };
    setUsers((prev) => [newUserObj, ...prev]);
    setCurrentView('LIST');
  };

  const handleSaveEditedUserAction = (updatedPayload: any) => {
    setUsers((prev) => 
      prev.map((user) => (user.id === updatedPayload.id ? updatedPayload : user))
    );
    setSelectedUserForEdit(null);
    setCurrentView('LIST');
  };

  const triggerEditClickSequence = (user: UserData) => {
    setSelectedUserForEdit(user);
    setCurrentView('EDIT');
  };

  // --- RENDER ROUTING BOUNDARY ---
  if (currentView === 'ADD') {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <SecureAddUserPage 
          onSave={handleAddNewUserAction} 
          onCancel={() => setCurrentView('LIST')} 
        />
      </div>
    );
  }

  if (currentView === 'EDIT' && selectedUserForEdit) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <EditUserPage 
          user={selectedUserForEdit} 
          onSave={handleSaveEditedUserAction} 
          onCancel={() => {
            setSelectedUserForEdit(null);
            setCurrentView('LIST');
          }} 
        />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 text-slate-900 animate-fadeIn">
      
      {/* ACTION BAR DASHBOARD HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Identity Directory</h1>
          <p className="text-xs text-slate-400 mt-0.5">Manage enterprise access keys, assignments, and structural logs.</p>
        </div>
        <button
          onClick={() => setCurrentView('ADD')}
          className="rounded-lg bg-blue-600 hover:bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition flex items-center gap-2 cursor-pointer"
        >
          <UserPlus className="h-3.5 w-3.5" /> Add New Directory Account
        </button>
      </div>

      {/* SEARCH AND FILTER SEGMENT */}
      <div className="relative max-w-xs">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="h-3.5 w-3.5 text-slate-400" />
        </span>
        <input 
          type="text" 
          placeholder="Search identity tokens..." 
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs text-slate-800 outline-hidden focus:border-slate-400 shadow-2xs font-medium" 
        />
      </div>

      {/* CORE IDENTITY REPOSITORY DATAGRID LIST */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4">User Detail Matrix</th>
              <th className="py-3 px-4">Workplace Deployment Base</th>
              <th className="py-3 px-4">Authority Token</th>
              <th className="py-3 px-4">Status Configuration</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50/50 transition duration-150">
                
                {/* COLUMN 1: IMAGE AND DATA STACK */}
                <td className="py-3.5 px-4 flex items-center gap-3">
                  <img 
                    src={user.avatar || user.image} 
                    alt={user.name} 
                    className="h-9 w-9 rounded-full object-cover border border-slate-200 shadow-2xs bg-slate-100" 
                  />
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-900 text-sm block">{user.name}</span>
                    <span className="text-[11px] text-slate-400 font-normal block">{user.email}</span>
                  </div>
                </td>

                {/* COLUMN 2: WORKPLACE */}
                <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate font-normal">
                  {user.workplace}
                </td>

                {/* COLUMN 3: ROLE SYSTEM BADGE */}
                <td className="py-3.5 px-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide ${
                    user.role === 'ADMIN' 
                      ? 'bg-purple-50 text-purple-700 border border-purple-200' 
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {user.role}
                  </span>
                </td>

                {/* COLUMN 4: STATUS VALUE (Matches your references perfectly) */}
                <td className="py-3.5 px-4">
                  <span className={`inline-flex items-center gap-1.5 font-semibold ${
                    user.status === 'Active' ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    <span className={`h-2 w-2 rounded-full ${
                      user.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'
                    }`} />
                    {user.status}
                  </span>
                </td>

                {/* COLUMN 5: INTEGRATED EDIT BUTTON ROW TRIGGER */}
                <td className="py-3.5 px-4 text-right">
                  <button 
                    onClick={() => triggerEditClickSequence(user)}
                    className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 border border-transparent hover:border-slate-200 transition cursor-pointer"
                    title="Edit User Info"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}