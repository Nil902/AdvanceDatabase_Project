import React, { useState, useEffect, useRef } from 'react';
import { User as UserIcon, Shield, Smartphone, MapPin, Upload, X, Activity, Check } from 'lucide-react';

interface EditUserPageProps {
  user: {
    id?: string | number;
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
    image?: string;
    workplace?: string;
    role: 'USER' | 'ADMIN';
    status: 'Active' | 'Inactive' | 'Suspended';
  };
  onSave: (updatedPayload: any) => void;
  onCancel: () => void;
}

const CAMBODIA_LOCATION_DATA: Record<string, string[]> = {
  "Phnom Penh (Municipality)": [
    "Khan Boeng Keng Kang", "Khan Chamkar Mon", "Khan Chbar Ampov", "Khan Chroy Changvar", 
    "Khan Dangkao", "Khan Daun Penh", "Khan Kambol", "Khan Meanchey", "Khan Porsenchey", 
    "Khan Prampir Makara", "Khan Prek Pnov", "Khan Russei Keo", "Khan Sen Sok", "Khan Tuol Kouk"
  ],
  "Siem Reap": [
    "Krong Siem Reap", "Angkor Chum", "Angkor Thum", "Banteay Srei", "Chi Kraeng", 
    "Kralanh", "Puok", "Prasat Bakong", "Soutr Nikom", "Srei Snam", "Svay Leu", "Varin", "Run Ta AEk"
  ],
  "Preah Sihanouk": [
    "Krong Preah Sihanouk", "Krong Koh Rong", "Prey Nob", "Stueng Hav", "Kampong Seila"
  ],
  "Battambang": [
    "Krong Battambang", "Banan", "Thma Koul", "Bavel", "Aek Phnum", "Moung Ruessei", 
    "Rotonak Mondol", "Sangkae", "Samlout", "Sampov Lun", "Phnum Proek", "Kamrieng", "Koas Krala", "Rukh Kiri"
  ],
  "Kampong Cham": [
    "Krong Kampong Cham", "Batheay", "Chamkar Leu", "Cheung Prey", "Kampong Siem", 
    "Kang Meas", "Kaoh Soutin", "Prey Chhor", "Srei Santhor", "Stueng Trang"
  ],
  "Kandal": [
    "Krong Ta Khmau", "Krong Arey Ksat", "Krong Sampov Poun", "Angk Snuol", "Kandal Stueng", 
    "Kien Svay", "Khsach Kandal", "Kaoh Thum", "Leuk Daek", "Lvea Aem", "Mukh Kampul", "S'ang"
  ],
  "Kampot": [
    "Krong Kampot", "Krong Bokor", "Angkor Chey", "Banteay Meas", "Chhuk", "Cum Kiri", "Dang Tong", "Kampong Trach", "Tuek Chhou"
  ],
  "Banteay Meanchey": [
    "Krong Serei Saophoan", "Krong Poipet", "Mongkol Borey", "Phnum Srok", "Preah Netr Preah", "Ou Chrov", "Thma Puok", "Svay Chek", "Malai"
  ]
};

const CAMBODIA_PROVINCES = Object.keys(CAMBODIA_LOCATION_DATA).sort();

export default function EditUserPage({ user, onSave, onCancel }: EditUserPageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone === 'N/A' ? '' : user.phone || '');
  const [systemRole, setSystemRole] = useState<'USER' | 'ADMIN'>(user.role || 'USER');
  const [accountStatus, setAccountStatus] = useState<'Active' | 'Inactive' | 'Suspended'>(user.status || 'Active');

  const initialImagePreview = user.avatar || user.image || '';
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>(initialImagePreview);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [province, setProvince] = useState('Phnom Penh (Municipality)');
  const [district, setDistrict] = useState('');
  const [streetAddress, setStreetAddress] = useState('');

  useEffect(() => {
    if (user.workplace) {
      const segments = user.workplace.split(',').map(s => s.trim());
      const matchedProvince = CAMBODIA_PROVINCES.find(p => user.workplace?.includes(p));
      if (matchedProvince) {
        setProvince(matchedProvince);
        const districtsList = CAMBODIA_LOCATION_DATA[matchedProvince] || [];
        const matchedDistrict = districtsList.find(d => user.workplace?.includes(d));
        if (matchedDistrict) {
          setDistrict(matchedDistrict);
        }
        if (segments.length > 2) {
          setStreetAddress(segments.slice(0, segments.length - 3).join(', '));
        }
      }
    }
  }, [user.workplace]);

  useEffect(() => {
    const availableDistricts = CAMBODIA_LOCATION_DATA[province] || [];
    if (availableDistricts.length > 0 && !availableDistricts.includes(district)) {
      setDistrict(availableDistricts[0]);
    }
  }, [province]);

  const handleImageChangeFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeProfileImageAction = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setImageFile(null);
    setImagePreviewUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmitAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) return;

    const fullCambodiaAddress = `${streetAddress.trim() ? streetAddress.trim() + ', ' : ''}${district}, ${province}, Cambodia`;
    const finalImageString = imagePreviewUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100';

    const structuralPayload = {
      ...user,
      name: fullName,
      email: email,
      phone: phone || 'N/A',
      avatar: finalImageString,
      image: finalImageString,
      imageFile: imageFile, 
      workplace: fullCambodiaAddress,
      role: systemRole,
      status: accountStatus
    };

    onSave(structuralPayload);
  };

  const currentDistrictsList = CAMBODIA_LOCATION_DATA[province] || [];

  return (
    <div className="space-y-6 max-w-4xl animate-fadeIn text-slate-900">
      
      {/* BREADCRUMB HEADER */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <button type="button" onClick={onCancel} className="hover:text-slate-900 transition flex items-center gap-1 cursor-pointer bg-transparent border-none p-0">
            User Management
          </button>
          <span>&rsaquo;</span>
          <span className="text-slate-800 font-semibold">Edit User Profile</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Edit User Details</h1>
        <p className="text-sm text-slate-500">Modify workspace permission contexts, address strings, and credential operational status.</p>
      </div>

      <form onSubmit={handleSubmitAction} className="space-y-6">
        
        {/* CARD 1: ACCOUNT STATUS TOGGLE INTERFACE (REDESIGNED) */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm border-b border-slate-100 pb-3">
            <Activity className="h-4 w-4 text-slate-600" />
            <span>Account Life Cycle Status</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Active Status Box */}
            <label className={`relative group p-4 rounded-xl border flex items-start gap-3.5 cursor-pointer transition-all duration-200 ${
              accountStatus === 'Active' 
                ? 'border-emerald-500 bg-emerald-50/20 ring-1 ring-emerald-500' 
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/40'
            }`}>
              <input 
                type="radio" 
                name="accountStatus" 
                value="Active" 
                checked={accountStatus === 'Active'} 
                onChange={() => setAccountStatus('Active')}
                className="sr-only"
              />
              {/* Custom Styled Radio Button */}
              <div className={`mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                accountStatus === 'Active' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 bg-white group-hover:border-slate-400'
              }`}>
                <div className={`h-1.5 w-1.5 rounded-full bg-white transition-transform duration-200 ${accountStatus === 'Active' ? 'scale-100' : 'scale-0'}`} />
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  Active
                </span>
                <p className="text-[11px] text-slate-500 font-normal leading-normal">Account holds clear operational credentials.</p>
              </div>
            </label>

            {/* Inactive Status Box */}
            <label className={`relative group p-4 rounded-xl border flex items-start gap-3.5 cursor-pointer transition-all duration-200 ${
              accountStatus === 'Inactive' 
                ? 'border-slate-500 bg-slate-50 ring-1 ring-slate-500' 
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/40'
            }`}>
              <input 
                type="radio" 
                name="accountStatus" 
                value="Inactive" 
                checked={accountStatus === 'Inactive'} 
                onChange={() => setAccountStatus('Inactive')}
                className="sr-only"
              />
              <div className={`mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                accountStatus === 'Inactive' ? 'border-slate-600 bg-slate-600' : 'border-slate-300 bg-white group-hover:border-slate-400'
              }`}>
                <div className={`h-1.5 w-1.5 rounded-full bg-white transition-transform duration-200 ${accountStatus === 'Inactive' ? 'scale-100' : 'scale-0'}`} />
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  Inactive
                </span>
                <p className="text-[11px] text-slate-500 font-normal leading-normal">Temporarily offline or onboarding pipeline phase.</p>
              </div>
            </label>

            {/* Suspended Status Box */}
            <label className={`relative group p-4 rounded-xl border flex items-start gap-3.5 cursor-pointer transition-all duration-200 ${
              accountStatus === 'Suspended' 
                ? 'border-rose-500 bg-rose-50/20 ring-1 ring-rose-500' 
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/40'
            }`}>
              <input 
                type="radio" 
                name="accountStatus" 
                value="Suspended" 
                checked={accountStatus === 'Suspended'} 
                onChange={() => setAccountStatus('Suspended')}
                className="sr-only"
              />
              <div className={`mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                accountStatus === 'Suspended' ? 'border-rose-500 bg-rose-500' : 'border-slate-300 bg-white group-hover:border-slate-400'
              }`}>
                <div className={`h-1.5 w-1.5 rounded-full bg-white transition-transform duration-200 ${accountStatus === 'Suspended' ? 'scale-100' : 'scale-0'}`} />
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                  Suspended
                </span>
                <p className="text-[11px] text-slate-500 font-normal leading-normal">Access blocked instantly. Revokes authentication loops.</p>
              </div>
            </label>
          </div>
        </div>

        {/* CARD 2: BASIC DATA & AVATAR LAYER */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm border-b border-slate-100 pb-3">
            <UserIcon className="h-4 w-4 text-slate-600" />
            <span>Profile Identity Parameters</span>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-4 rounded-xl bg-slate-50/50 border border-slate-100">
            <div className="relative h-20 w-20 shrink-0 rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center overflow-hidden group shadow-inner">
              {imagePreviewUrl ? (
                <>
                  <img src={imagePreviewUrl} alt="Avatar profile" className="h-full w-full object-cover" />
                  <button 
                    type="button" 
                    onClick={removeProfileImageAction} 
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center text-white cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <div className="text-slate-400 font-bold text-xs">NO IMAGE</div>
              )}
            </div>

            <div className="flex-1 w-full space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">Update Profile Image</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50/50 p-4 rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer transition text-center shadow-2xs group"
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleImageChangeFile(e.target.files[0]);
                    }
                  }}
                />
                <Upload className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition" />
                <span className="text-xs font-semibold text-slate-700">Click to overwrite image payload</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Full Name</label>
              <input 
                type="text" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 px-3.5 text-xs font-medium text-slate-800 outline-hidden focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition shadow-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 px-3.5 text-xs font-medium text-slate-800 outline-hidden focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition shadow-xs"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5 max-w-sm">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Phone Number</label>
            <input 
              type="text" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="N/A" 
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 px-3.5 text-xs font-medium text-slate-800 outline-hidden focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition shadow-xs"
            />
          </div>
        </div>

        {/* CARD 3: CAMBODIA WORKPLACE MATRIX */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm border-b border-slate-100 pb-3">
            <MapPin className="h-4 w-4 text-slate-600" />
            <span>Workplace Assignment Location (Cambodia Address)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Province / Municipality</label>
              <select 
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 px-3.5 text-xs font-medium text-slate-800 outline-hidden focus:border-slate-400 transition shadow-xs cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23475569%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2polyline%3E%3C%2Fsvg%3E')] bg-[length:1rem_1rem] bg-[right_1rem_center] bg-no-repeat"
              >
                {CAMBODIA_PROVINCES.map((prov) => (
                  <option key={prov} value={prov}>{prov}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">District / Khan / Srok</label>
              <select 
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 px-3.5 text-xs font-medium text-slate-800 outline-hidden focus:border-slate-400 transition shadow-xs cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23475569%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2polyline%3E%3C%2Fsvg%3E')] bg-[length:1rem_1rem] bg-[right_1rem_center] bg-no-repeat"
              >
                {currentDistrictsList.map((dist) => (
                  <option key={dist} value={dist}>{dist}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Street / Sangkat / No.</label>
              <input 
                type="text" 
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                placeholder="No. 12, St. 294" 
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 px-3.5 text-xs font-medium text-slate-800 outline-hidden focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition shadow-xs"
                required
              />
            </div>
          </div>
        </div>

        {/* CARD 4: AUTHORIZATION CONTROL GROUP (REDESIGNED) */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm border-b border-slate-100 pb-3">
            <Shield className="h-4 w-4 text-slate-600" />
            <span>Identity Governance / Permission Level</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Standard User Card */}
            <label className={`group relative p-5 rounded-xl border flex items-start gap-4 cursor-pointer transition-all duration-200 ${
              systemRole === 'USER' 
                ? 'border-blue-600 bg-blue-50/20 ring-1 ring-blue-600' 
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/40'
            }`}>
              <input 
                type="radio" 
                name="systemRole" 
                value="USER" 
                checked={systemRole === 'USER'} 
                onChange={() => setSystemRole('USER')}
                className="sr-only"
              />
              <div className={`mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                systemRole === 'USER' ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white group-hover:border-slate-400'
              }`}>
                <div className={`h-1.5 w-1.5 rounded-full bg-white transition-transform duration-200 ${systemRole === 'USER' ? 'scale-100' : 'scale-0'}`} />
              </div>
              <div className="space-y-1">
                <h5 className="text-xs font-bold text-slate-900">Standard User Token</h5>
                <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                  Base read/write access parameters to generic workplace scopes.
                </p>
              </div>
            </label>

            {/* Admin Card */}
            <label className={`group relative p-5 rounded-xl border flex items-start gap-4 cursor-pointer transition-all duration-200 ${
              systemRole === 'ADMIN' 
                ? 'border-blue-600 bg-blue-50/20 ring-1 ring-blue-600' 
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/40'
            }`}>
              <input 
                type="radio" 
                name="systemRole" 
                value="ADMIN" 
                checked={systemRole === 'ADMIN'} 
                onChange={() => setSystemRole('ADMIN')}
                className="sr-only"
              />
              <div className={`mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                systemRole === 'ADMIN' ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white group-hover:border-slate-400'
              }`}>
                <div className={`h-1.5 w-1.5 rounded-full bg-white transition-transform duration-200 ${systemRole === 'ADMIN' ? 'scale-100' : 'scale-0'}`} />
              </div>
              <div className="space-y-1">
                <h5 className="text-xs font-bold text-slate-900">System Administrator</h5>
                <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                  Elevated system boundaries. Full operational mastery configuration.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* ACTIONS FOOTER */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button 
            type="button" 
            onClick={onCancel}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition cursor-pointer bg-transparent border-none"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="rounded-lg bg-[#020617] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-900 transition flex items-center gap-1.5 cursor-pointer border-none"
          >
            <Smartphone className="h-3.5 w-3.5" /> Save Changes
          </button>
        </div>

      </form>
    </div>
  );
}