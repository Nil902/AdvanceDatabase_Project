import React, { useState } from 'react';
import { User, Mail, Shield, BarChart3, UserPlus, ToggleLeft, ToggleRight } from 'lucide-react';

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  zone: string;
  avatar: string;
  role?: string;
  twoFactor?: boolean;
  notifications?: boolean;
}

interface EditProfilePageProps {
  initialData: ProfileData;
  onSave: (updatedData: ProfileData) => void;
  onCancel: () => void;
}

export default function EditProfilePage({ initialData, onSave, onCancel }: EditProfilePageProps) {
  const [formData, setFormData] = useState<ProfileData>({
    ...initialData,
    role: initialData.role || 'Department Manager',
    twoFactor: initialData.twoFactor ?? true,
    notifications: initialData.notifications ?? false,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleToggle = (field: 'twoFactor' | 'notifications') => {
    setFormData(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 bg-white border border-slate-200 rounded-xl p-8 shadow-xs max-w-4xl animate-fadeIn">
      
      {/* Name and Email Rows */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-[#3b6289] uppercase tracking-wider">Full Name</label>
          <div className="relative">
            <User className="absolute left-4 top-3.5 h-4 w-4 text-slate-700" />
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full rounded-md border border-slate-200 bg-slate-50/50 py-3 pl-11 pr-4 text-sm text-slate-800 font-medium focus:outline-hidden focus:border-slate-400 focus:bg-white transition"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-[#3b6289] uppercase tracking-wider">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-4 top-3.5 h-4 w-4 text-slate-700" />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full rounded-md border border-slate-200 bg-slate-50/50 py-3 pl-11 pr-4 text-sm text-slate-800 font-medium focus:outline-hidden focus:border-slate-400 focus:bg-white transition"
              required
            />
          </div>
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* Role and Permissions Section */}
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-[#3b6289] uppercase tracking-wider">User Role & Permissions</label>
          <select
            name="role"
            value={formData.role}
            onChange={handleInputChange}
            className="w-full rounded-md border border-slate-200 bg-slate-50/50 p-3 text-sm text-slate-800 font-medium focus:outline-hidden focus:border-slate-400 focus:bg-white transition appearance-none cursor-pointer"
          >
            <option value="Department Manager">Department Manager</option>
            <option value="System Admin">System Admin</option>
            <option value="Standard Operator">Standard Operator</option>
          </select>
        </div>

        {/* Feature Capability Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          
          {/* Card 1: Data Access */}
          <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-[#f8fafc]/60 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-[#bfdbfe] text-[#2563eb]">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-slate-900">Data Access</h4>
              <p className="text-[11px] text-slate-500 leading-normal">Full read/write access to departmental reports and logs.</p>
            </div>
          </div>

          {/* Card 2: Team Control */}
          <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-[#f8fafc]/60 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-[#bfdbfe] text-[#2563eb]">
              <UserPlus className="h-4 w-4" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-slate-900">Team Control</h4>
              <p className="text-[11px] text-slate-500 leading-normal">Can invite new users and assign department-level roles.</p>
            </div>
          </div>

          {/* Card 3: System Security */}
          <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 opacity-60">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-slate-200 text-slate-500">
              <Shield className="h-4 w-4" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-slate-500">System Security</h4>
              <p className="text-[11px] text-slate-400 leading-normal">Locked. Global security settings require Admin role.</p>
            </div>
          </div>

        </div>
      </div>

      {/* Access Settings Switch Rows */}
      <div className="space-y-3 pt-2">
        
        {/* Switch 1: Two-Factor */}
        <div 
          onClick={() => handleToggle('twoFactor')}
          className="flex items-center justify-between border border-slate-200 rounded-lg p-4 bg-white hover:bg-slate-50/50 cursor-pointer transition select-none"
        >
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-slate-700" />
            <div>
              <h4 className="text-xs font-bold text-slate-900">Two-Factor Authentication</h4>
              <p className="text-[11px] text-slate-500">Require a secondary code for all logins.</p>
            </div>
          </div>
          <button type="button" className="focus:outline-hidden">
            {formData.twoFactor ? (
              <span className="flex items-center h-6 w-11 rounded-full bg-black p-0.5 transition"><span className="h-5 w-5 translate-x-5 rounded-full bg-white shadow-xs" /></span>
            ) : (
              <span className="flex items-center h-6 w-11 rounded-full bg-slate-200 p-0.5 transition"><span className="h-5 w-5 translate-x-0 rounded-full bg-white shadow-xs" /></span>
            )}
          </button>
        </div>

        {/* Switch 2: Notifications */}
        <div 
          onClick={() => handleToggle('notifications')}
          className="flex items-center justify-between border border-slate-200 rounded-lg p-4 bg-white hover:bg-slate-50/50 cursor-pointer transition select-none"
        >
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-slate-700" />
            <div>
              <h4 className="text-xs font-bold text-slate-900">System Notifications</h4>
              <p className="text-[11px] text-slate-500">Send email alerts for critical system updates.</p>
            </div>
          </div>
          <button type="button" className="focus:outline-hidden">
            {formData.notifications ? (
              <span className="flex items-center h-6 w-11 rounded-full bg-black p-0.5 transition"><span className="h-5 w-5 translate-x-5 rounded-full bg-white shadow-xs" /></span>
            ) : (
              <span className="flex items-center h-6 w-11 rounded-full bg-slate-200 p-0.5 transition"><span className="h-5 w-5 translate-x-0 rounded-full bg-white shadow-xs" /></span>
            )}
          </button>
        </div>

      </div>

      <hr className="border-slate-100" />

      {/* Action Footer Controls */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-slate-300 bg-white px-6 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
        >
          CANCEL
        </button>
        <button
          type="submit"
          className="rounded-md bg-[#020617] px-6 py-2.5 text-xs font-bold text-white hover:bg-slate-900 transition shadow-sm cursor-pointer"
        >
          SAVE ACCOUNT
        </button>
      </div>

    </form>
  );
}