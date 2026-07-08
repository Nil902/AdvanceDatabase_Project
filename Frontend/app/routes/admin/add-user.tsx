import React, { useState, useEffect, useRef } from 'react';
import { User, Shield, Smartphone, MapPin, Upload, X } from 'lucide-react';

interface AddUserPageProps {
  onSave: (payload: any) => void;
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
  ],
  "Kampong Chhnang": [
    "Krong Kampong Chhnang", "Baribour", "Chol Kiri", "Kampong Leaeng", "Kampong Tralach", "Rolea B'ier", "Sameakki Mean Chey", "Tuek Phos"
  ],
  "Kampong Speu": [
    "Krong Chbar Mon", "Krong Oudong Me Chey", "Basedth", "Kong Pisei", "Aoral", "Phnum Sruoch", "Samraong Tong", "Thpong"
  ],
  "Kampong Thom": [
    "Krong Stueng Saen", "Baray", "Kampong Svay", "Prasat Ballangk", "Prasat Sambour", "Sandan", "Santuk", "Stoung", "Taing Kouk"
  ],
  "Koh Kong": [
    "Krong Khemarak Phoumin", "Botum Sakor", "Kiri Sakor", "Koh Kong District", "Mondol Seima", "Srae Ambel", "Thma Bang"
  ],
  "Kratie": [
    "Krong Kracheh", "Chhloung", "Preaek Prasab", "Sambour", "Snuol", "Chitr Borie"
  ],
  "Mondulkiri": [
    "Krong Saen Monourom", "Kaoh Nheaek", "Ou Reang", "Pechr Chenda", "Kaev Seima"
  ],
  "Preah Vihear": [
    "Krong Preah Vihear", "Chey Saen", "Chhaeb", "Choam Khsant", "Kuleaen", "Rovieng", "Sangkom Thmei", "Tbaeng Mean Chey"
  ],
  "Prey Veng": [
    "Krong Prey Veng", "Ba Phnum", "Kamchay Mear", "Kampong Trabaek", "Kanhchriech", "Me Sang", "Peam Chor", "Peam Ro", "Pea Reang", "Preah Sdach", "Prey Veng District", "Sithor Kandal"
  ],
  "Pursat": [
    "Krong Pursat", "Bakan", "Kandieng", "Krakor", "Phnum Kravanh", "Veal Veaeng", "Ta Lou Sen Chey"
  ],
  "Ratanakiri": [
    "Krong Ban Lung", "Andoung Meas", "Bar Kaev", "Koun Mom", "Lumphat", "Ou Chum", "Ou Ya Dav", "Ta Veaeng", "Veun Sai"
  ],
  "Stung Treng": [
    "Krong Stung Treng", "Sesan", "Siem Bouk", "Siem Pang", "Thala Barivat", "Borei O'Svay Sen Chey"
  ],
  "Svay Rieng": [
    "Krong Svay Rieng", "Krong Bavet", "Chantrea", "Kampong Rou", "Rumduol", "Romeas Haek", "Svay Chrum", "Svay Teab"
  ],
  "Takeo": [
    "Krong Doun Kaev", "Angkor Borei", "Bati", "Bourei Cholsar", "Kiri Vong", "Kaoh Andaet", "Prey Kabbas", "Samraong", "Tram Kak", "Treang"
  ],
  "Otdar Meanchey": [
    "Krong Samraong", "Anlong Veaeng", "Banteay Ampil", "Chong Kal", "Trapeang Prasat"
  ],
  "Kep": [
    "Krong Kep", "Damnak Chang'aeur"
  ],
  "Pailin": [
    "Krong Pailin", "Sala Krau"
  ],
  "Tboung Khmum": [
    "Krong Suong", "Dambae", "Krouch Chhmar", "Memot", "Ou Reang Ov", "Ponhea Kraek", "Tboung Khmum District"
  ]
};

const CAMBODIA_PROVINCES = Object.keys(CAMBODIA_LOCATION_DATA).sort();

export default function SecureAddUserPage({ onSave, onCancel }: AddUserPageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [systemRole, setSystemRole] = useState<'USER' | 'ADMIN'>('USER');

  // Profile Image Upload Local States
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');

  // Cambodia Address States
  const [province, setProvince] = useState('Phnom Penh (Municipality)');
  const [district, setDistrict] = useState('');
  const [streetAddress, setStreetAddress] = useState('');

  useEffect(() => {
    const availableDistricts = CAMBODIA_LOCATION_DATA[province] || [];
    if (availableDistricts.length > 0) {
      setDistrict(availableDistricts[0]);
    } else {
      setDistrict('');
    }
  }, [province]);

  const handleImageChangeFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setImageFile(file);

    // Convert to Base64 String so it stays permanently persistent in memory across dashboard views
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

    // CRITICAL FIX: Providing image data string under BOTH 'avatar' and 'image' keys
    // to map with whatever property key your dashboard component uses.
    const finalImageString = imagePreviewUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100';

    const structuralPayload = {
      name: fullName,
      email: email,
      phone: phone || 'N/A',
      avatar: finalImageString, // Key вариант A
      image: finalImageString,  // Key вариант B (Fallback for generic UI lists)
      imageFile: imageFile, 
      workplace: fullCambodiaAddress,
      role: systemRole,
      status: 'Active'
    };

    onSave(structuralPayload);
  };

  const currentDistrictsList = CAMBODIA_LOCATION_DATA[province] || [];

  return (
    <div className="space-y-6 max-w-4xl animate-fadeIn text-slate-900">
      
      {/* BREADCRUMB HEADER */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <button type="button" onClick={onCancel} className="hover:text-slate-900 transition flex items-center gap-1 cursor-pointer">
            User Management
          </button>
          <span>&rsaquo;</span>
          <span className="text-slate-800 font-semibold">Add New User</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Add New User</h1>
        <p className="text-sm text-slate-500">Provision a fresh credential token assignment container.</p>
      </div>

      <form onSubmit={handleSubmitAction} className="space-y-6">
        
        {/* CARD 1: BASIC INFORMATION */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm border-b border-slate-100 pb-3">
            <User className="h-4 w-4 text-slate-600" />
            <span>Basic Information</span>
          </div>

          {/* DRAG & DROP INTEGRATED AVATAR UPLOAD COMPONENT */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-4 rounded-xl bg-slate-50/50 border border-slate-100">
            <div className="relative h-20 w-20 shrink-0 rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center overflow-hidden group shadow-inner">
              {imagePreviewUrl ? (
                <>
                  <img src={imagePreviewUrl} alt="Avatar preview" className="h-full w-full object-cover" />
                  <button 
                    type="button" 
                    onClick={removeProfileImageAction} 
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center text-white cursor-pointer"
                    title="Remove Photo"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <div className="text-slate-400 font-bold text-xs uppercase tracking-wide">Avatar</div>
              )}
            </div>

            <div className="flex-1 w-full space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">Profile Image Upload</label>
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
                <span className="text-xs font-semibold text-slate-700">Click to upload corporate headshot</span>
                <span className="text-[10px] text-slate-400">Supports PNG, JPG, or WEBP formats up to 5MB</span>
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
                placeholder="e.g. Jonathan Doe" 
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 px-3.5 text-xs font-medium text-slate-800 outline-hidden focus:border-slate-900 transition shadow-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="j.doe@enterprise.com" 
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 px-3.5 text-xs font-medium text-slate-800 outline-hidden focus:border-slate-900 transition shadow-xs"
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
              placeholder="+855 000-0000" 
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 px-3.5 text-xs font-medium text-slate-800 outline-hidden focus:border-slate-900 transition shadow-xs"
            />
          </div>
        </div>

        {/* CARD 2: DETAILED CAMBODIA ADDRESS MATRIX */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm border-b border-slate-100 pb-3">
            <MapPin className="h-4 w-4 text-slate-600" />
            <span>Workplace Assignment Location (Cambodia Address)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Province Selection */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Province / Municipality</label>
              <select 
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 px-3.5 text-xs font-medium text-slate-800 outline-hidden focus:border-slate-900 transition shadow-xs cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23475569%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2polyline%3E%3C%2Fsvg%3E')] bg-[length:1rem_1rem] bg-[right_1rem_center] bg-no-repeat"
              >
                {CAMBODIA_PROVINCES.map((prov) => (
                  <option key={prov} value={prov}>{prov}</option>
                ))}
              </select>
            </div>

            {/* Selectable District */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">District / Khan / Srok</label>
              <select 
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 px-3.5 text-xs font-medium text-slate-800 outline-hidden focus:border-slate-900 transition shadow-xs cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23475569%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2polyline%3E%3C%2Fsvg%3E')] bg-[length:1rem_1rem] bg-[right_1rem_center] bg-no-repeat"
              >
                {currentDistrictsList.map((dist) => (
                  <option key={dist} value={dist}>{dist}</option>
                ))}
              </select>
            </div>

            {/* Street / Sangkat / House No. Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Street / Sangkat / No.</label>
              <input 
                type="text" 
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                placeholder="e.g., No. 12, St. 294, Tonle Bassac" 
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 px-3.5 text-xs font-medium text-slate-800 outline-hidden focus:border-slate-900 transition shadow-xs"
                required
              />
            </div>
          </div>

          {/* Full Address Preview Strip */}
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-[11px] text-slate-500 font-medium">
            <span className="text-slate-400 uppercase tracking-wider font-bold block mb-0.5 text-[9px]">Compiled Location Schema Vector</span>
            <span className="font-mono text-slate-700">
              {streetAddress || '[Street Detail]'}, {district || '[Select District]'}, {province}, Cambodia
            </span>
          </div>
        </div>

        {/* CARD 3: SYSTEM REGISTRAR AUTHORITY LAYER */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm border-b border-slate-100 pb-3">
            <Shield className="h-4 w-4 text-slate-600" />
            <span>Identity Governance / Registrar Assignment</span>
          </div>

          <div className="space-y-3">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Assign Registrar Level</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Standard User Option Card */}
              <label className={`group p-5 rounded-xl border flex items-start gap-4 cursor-pointer transition-all duration-200 ${
                systemRole === 'USER' 
                  ? 'border-blue-600 bg-blue-50/40 shadow-xs' 
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
              }`}>
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all duration-200 text-white bg-white border-slate-300 group-hover:border-slate-400 shadow-2xs group-has-[:checked]:border-blue-600 group-has-[:checked]:bg-blue-600">
                  <input 
                    type="radio" 
                    name="systemRole" 
                    value="USER" 
                    checked={systemRole === 'USER'} 
                    onChange={() => setSystemRole('USER')}
                    className="sr-only"
                  />
                  <div className="h-1.5 w-1.5 rounded-full bg-white scale-0 transition-transform duration-200 group-has-[:checked]:scale-100" />
                </div>
                <div>
                  <h5 className={`text-xs font-bold transition-colors ${systemRole === 'USER' ? 'text-blue-900' : 'text-slate-900'}`}>
                    Standard User Token
                  </h5>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed font-normal">
                    Grants read/write capabilities over base workspace assets. Base-level authorization boundary definitions apply.
                  </p>
                </div>
              </label>

              {/* Administrator Option Card */}
              <label className={`group p-5 rounded-xl border flex items-start gap-4 cursor-pointer transition-all duration-200 ${
                systemRole === 'ADMIN' 
                  ? 'border-blue-600 bg-blue-50/40 shadow-xs' 
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
              }`}>
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all duration-200 text-white bg-white border-slate-300 group-hover:border-slate-400 shadow-2xs group-has-[:checked]:border-blue-600 group-has-[:checked]:bg-blue-600">
                  <input 
                    type="radio" 
                    name="systemRole" 
                    value="ADMIN" 
                    checked={systemRole === 'ADMIN'} 
                    onChange={() => setSystemRole('ADMIN')}
                    className="sr-only"
                  />
                  <div className="h-1.5 w-1.5 rounded-full bg-white scale-0 transition-transform duration-200 group-has-[:checked]:scale-100" />
                </div>
                <div>
                  <h5 className={`text-xs font-bold transition-colors ${systemRole === 'ADMIN' ? 'text-blue-900' : 'text-slate-900'}`}>
                    System Administrator
                  </h5>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed font-normal">
                    Elevated authority privileges. Unrestricted operational access parameters over identity management, billing infrastructure, and system settings.
                  </p>
                </div>
              </label>

            </div>
          </div>
        </div>

        {/* REGISTRAR FOOTER ACTIONS */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button 
            type="button" 
            onClick={onCancel}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-transparent transition cursor-pointer"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="rounded-lg bg-[#020617] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-900 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Smartphone className="h-3.5 w-3.5" /> Create Account
          </button>
        </div>

      </form>
    </div>
  );
}