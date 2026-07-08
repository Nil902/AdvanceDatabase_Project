import React, { useState } from 'react';
import {
  Search,
  Plus,
  Users,
  FileText,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit2,
  CheckCircle2,
} from 'lucide-react';

interface FamilyMember {
  id: string;
  nid: string;
  khmerName: string;
  englishName: string;
  relationship: string;
  dob: string;
  gender: 'Male' | 'Female';
  status: 'Active' | 'Deceased';
}

interface FamilyUnit {
  id: string;
  familyHeadNid: string;
  familyHeadKhmer: string;
  familyHeadEnglish: string;
  householdNumber: string;
  commune: string;
  district: string;
  province: string;
  memberCount: number;
  registeredDate: string;
  members: FamilyMember[];
}

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100';

// TODO: replace with real data fetched from your Laravel API
// e.g. GET /api/v1/family-units
const INITIAL_FAMILIES: FamilyUnit[] = [
  {
    id: '1',
    familyHeadNid: '010 582 914',
    familyHeadKhmer: 'សុខ ណារិទ្ធ',
    familyHeadEnglish: 'Sok Narith',
    householdNumber: 'HH-001-2024',
    commune: 'Tonle Bassac',
    district: 'Chamkar Mon',
    province: 'Phnom Penh',
    memberCount: 4,
    registeredDate: '2020-03-15',
    members: [
      { id: '1-1', nid: '010 582 914', khmerName: 'សុខ ណារិទ្ធ', englishName: 'Sok Narith', relationship: 'Head', dob: '1993-11-06', gender: 'Male', status: 'Active' },
      { id: '1-2', nid: '020 938 415', khmerName: 'ជា សុភា', englishName: 'Chea Sophea', relationship: 'Spouse', dob: '1995-03-14', gender: 'Female', status: 'Active' },
      { id: '1-3', nid: '', khmerName: 'ចាន់ បូរី', englishName: 'Chan Borey', relationship: 'Child', dob: '2018-09-05', gender: 'Male', status: 'Active' },
      { id: '1-4', nid: '', khmerName: 'ចាន់ ស្វាម', englishName: 'Chan Svam', relationship: 'Child', dob: '2021-02-12', gender: 'Female', status: 'Active' },
    ],
  },
  {
    id: '2',
    familyHeadNid: '050 392 814',
    familyHeadKhmer: 'គៀវ កល្យាណ',
    familyHeadEnglish: 'Keo Kalliyan',
    householdNumber: 'HH-002-2024',
    commune: 'Chrang Chamreh I',
    district: 'Russey Keo',
    province: 'Phnom Penh',
    memberCount: 3,
    registeredDate: '2021-06-20',
    members: [
      { id: '2-1', nid: '050 392 814', khmerName: 'គៀវ កល្យាណ', englishName: 'Keo Kalliyan', relationship: 'Head', dob: '1988-01-30', gender: 'Female', status: 'Active' },
      { id: '2-2', nid: '080 194 725', khmerName: 'លី សុវណ្ណា', englishName: 'Ly Sovanna', relationship: 'Parent', dob: '1960-05-18', gender: 'Female', status: 'Active' },
      { id: '2-3', nid: '', khmerName: 'គៀវ ពិសិដ្ឋ', englishName: 'Keo Piseth', relationship: 'Child', dob: '2019-11-22', gender: 'Male', status: 'Active' },
    ],
  },
  {
    id: '3',
    familyHeadNid: '030 748 291',
    familyHeadKhmer: 'វង្ស ពិសិដ្ឋ',
    familyHeadEnglish: 'Vong Piseth',
    householdNumber: 'HH-003-2024',
    commune: 'Kilomet Prammouy',
    district: 'Ruessei Keo',
    province: 'Phnom Penh',
    memberCount: 5,
    registeredDate: '2019-12-10',
    members: [
      { id: '3-1', nid: '030 748 291', khmerName: 'វង្ស ពិសិដ្ឋ', englishName: 'Vong Piseth', relationship: 'Head', dob: '1999-09-09', gender: 'Male', status: 'Active' },
      { id: '3-2', nid: '090 625 184', khmerName: 'សេង ស្រីនាង', englishName: 'Seng Sreyneang', relationship: 'Spouse', dob: '1996-12-18', gender: 'Female', status: 'Active' },
      { id: '3-3', nid: '', khmerName: 'វង្ស ផ្លូវ', englishName: 'Vong Phlou', relationship: 'Child', dob: '2020-06-14', gender: 'Male', status: 'Active' },
      { id: '3-4', nid: '', khmerName: 'វង្ស ដារ៉ា', englishName: 'Vong Dara', relationship: 'Child', dob: '2022-03-30', gender: 'Female', status: 'Active' },
      { id: '3-5', nid: '040 182 736', khmerName: 'គឹម រិទ្ធ', englishName: 'Kim Rith', relationship: 'Parent', dob: '1969-08-08', gender: 'Male', status: 'Deceased' },
    ],
  },
];

// TODO: pull from logged-in registrar's session
const currentRegistrar = 'Sok Cheat';

type Panel = { type: 'empty' } | { type: 'detail'; familyId: string } | { type: 'create' };

interface CreateForm {
  headKhmerName: string;
  headEnglishName: string;
  headNid: string;
  commune: string;
  district: string;
  province: string;
}
const emptyCreateForm: CreateForm = {
  headKhmerName: '',
  headEnglishName: '',
  headNid: '',
  commune: 'Phnom Penh',
  district: 'Chamkar Mon',
  province: 'Phnom Penh',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getRelationshipColor(relationship: string): string {
  if (relationship === 'Head') return 'bg-slate-900 text-white';
  if (relationship === 'Spouse') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  if (relationship === 'Parent') return 'bg-amber-50 text-amber-700 border border-amber-200';
  if (relationship === 'Child') return 'bg-blue-50 text-blue-700 border border-blue-200';
  return 'bg-slate-50 text-slate-700 border border-slate-200';
}

function statusBadgeClass(status: string): string {
  if (status === 'Active') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  return 'bg-red-50 text-red-700 border border-red-200';
}

export default function FamilyManagementPage() {
  const [families, setFamilies] = useState<FamilyUnit[]>(INITIAL_FAMILIES);
  const [panel, setPanel] = useState<Panel>({ type: 'empty' });
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFamilyId, setExpandedFamilyId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreateForm);
  const [showDeleteToast, setShowDeleteToast] = useState(false);

  const filteredFamilies = families.filter((f) =>
    f.familyHeadEnglish.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.familyHeadKhmer.includes(searchTerm) ||
    f.familyHeadNid.includes(searchTerm) ||
    f.householdNumber.includes(searchTerm)
  );

  const selected = panel.type === 'detail' ? families.find((f) => f.id === panel.familyId) ?? null : null;

  const handleSelectFamily = (id: string) => {
    setPanel({ type: 'detail', familyId: id });
    setExpandedFamilyId(id);
  };

  const handleOpenCreateForm = () => {
    setCreateForm(emptyCreateForm);
    setPanel({ type: 'create' });
  };

  const handleCreateFamily = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.headKhmerName.trim() || !createForm.headEnglishName.trim() || !createForm.headNid.trim()) return;

    const newFamily: FamilyUnit = {
      id: crypto.randomUUID(),
      familyHeadNid: createForm.headNid,
      familyHeadKhmer: createForm.headKhmerName,
      familyHeadEnglish: createForm.headEnglishName,
      householdNumber: `HH-${String(families.length + 1).padStart(3, '0')}-2024`,
      commune: createForm.commune,
      district: createForm.district,
      province: createForm.province,
      memberCount: 1,
      registeredDate: new Date().toISOString().slice(0, 10),
      members: [
        {
          id: `${crypto.randomUUID()}-1`,
          nid: createForm.headNid,
          khmerName: createForm.headKhmerName,
          englishName: createForm.headEnglishName,
          relationship: 'Head',
          dob: '',
          gender: 'Male',
          status: 'Active',
        },
      ],
    };

    setFamilies([...families, newFamily]);
    setPanel({ type: 'detail', familyId: newFamily.id });
    setCreateForm(emptyCreateForm);
  };

  const handleDeleteFamily = (id: string) => {
    setFamilies(families.filter((f) => f.id !== id));
    setPanel({ type: 'empty' });
    setShowDeleteToast(true);
    setTimeout(() => setShowDeleteToast(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Family Unit Management</h1>
        <p className="text-xs text-slate-500 mt-1">Register, track, and manage family relationships and household members</p>
      </div>

      {/* SEARCH & ACTION BAR */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, NID, or household number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          type="button"
          onClick={handleOpenCreateForm}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Register Family
        </button>
      </div>

      {/* FAMILIES LIST */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {filteredFamilies.length === 0 ? (
          <div className="p-6 text-center">
            <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-600">No families found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search terms</p>
          </div>
        ) : (
          filteredFamilies.map((family, index) => (
            <div key={family.id} className={`${index > 0 ? 'border-t border-slate-200' : ''}`}>
              <button
                type="button"
                onClick={() => handleSelectFamily(family.id)}
                className="w-full p-4 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center">
                        <span className="text-xs font-bold text-slate-600">
                          {family.familyHeadEnglish.split(' ').map((n) => n[0]).join('').toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">
                          {family.familyHeadEnglish} <span className="text-slate-400 font-normal">({family.familyHeadKhmer})</span>
                        </p>
                        <p className="text-xs text-slate-500">{family.householdNumber} • {family.memberCount} members</p>
                      </div>
                    </div>
                    <div className="flex gap-2 text-xs text-slate-500">
                      <span>{family.commune}</span>
                      <span>•</span>
                      <span>{family.district}</span>
                      <span>•</span>
                      <span>{family.province}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                      {family.memberCount} members
                    </span>
                    {expandedFamilyId === family.id ? (
                      <ChevronUp className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                </div>
              </button>

              {/* EXPANDED DETAILS */}
              {expandedFamilyId === family.id && (
                <div className="border-t border-slate-200 bg-slate-50 p-4 space-y-4">
                  {/* FAMILY MEMBERS TABLE */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 mb-3">Family Members</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="text-left py-2 px-3 font-semibold text-slate-600">Name (Khmer)</th>
                            <th className="text-left py-2 px-3 font-semibold text-slate-600">Name (English)</th>
                            <th className="text-left py-2 px-3 font-semibold text-slate-600">Relationship</th>
                            <th className="text-left py-2 px-3 font-semibold text-slate-600">NID</th>
                            <th className="text-left py-2 px-3 font-semibold text-slate-600">DOB</th>
                            <th className="text-left py-2 px-3 font-semibold text-slate-600">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {family.members.map((member) => (
                            <tr key={member.id} className="border-b border-slate-200">
                              <td className="py-2 px-3">{member.khmerName}</td>
                              <td className="py-2 px-3">{member.englishName}</td>
                              <td className="py-2 px-3">
                                <span className={`inline-block px-2 py-1 rounded-full text-[10px] font-semibold ${getRelationshipColor(member.relationship)}`}>
                                  {member.relationship}
                                </span>
                              </td>
                              <td className="py-2 px-3 font-mono text-slate-500">{member.nid || '—'}</td>
                              <td className="py-2 px-3 text-slate-500">{member.dob ? formatDate(member.dob) : '—'}</td>
                              <td className="py-2 px-3">
                                <span className={`inline-block px-2 py-1 rounded border text-[10px] font-semibold ${statusBadgeClass(member.status)}`}>
                                  {member.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="flex gap-2 pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-blue-700"
                    >
                      <Edit2 className="h-3 w-3" />
                      Edit Family
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-600 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-slate-700"
                    >
                      <Plus className="h-3 w-3" />
                      Add Member
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteFamily(family.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-red-700 ml-auto"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* CREATE FAMILY MODAL */}
      {panel.type === 'create' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Register New Family Unit</h2>

            <form onSubmit={handleCreateFamily} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Family Head Name (Khmer)</label>
                <input
                  type="text"
                  value={createForm.headKhmerName}
                  onChange={(e) => setCreateForm({ ...createForm, headKhmerName: e.target.value })}
                  placeholder="e.g. សុខ ណារិទ្ធ"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Family Head Name (English)</label>
                <input
                  type="text"
                  value={createForm.headEnglishName}
                  onChange={(e) => setCreateForm({ ...createForm, headEnglishName: e.target.value })}
                  placeholder="e.g. Sok Narith"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">National ID Number</label>
                <input
                  type="text"
                  value={createForm.headNid}
                  onChange={(e) => setCreateForm({ ...createForm, headNid: e.target.value })}
                  placeholder="e.g. 010 582 914"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Commune</label>
                <input
                  type="text"
                  value={createForm.commune}
                  onChange={(e) => setCreateForm({ ...createForm, commune: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">District</label>
                <input
                  type="text"
                  value={createForm.district}
                  onChange={(e) => setCreateForm({ ...createForm, district: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Province</label>
                <input
                  type="text"
                  value={createForm.province}
                  onChange={(e) => setCreateForm({ ...createForm, province: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setPanel({ type: 'empty' })}
                  className="flex-1 rounded-lg bg-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
                >
                  Create Family
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE SUCCESS TOAST */}
      {showDeleteToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-xs font-bold text-white shadow-xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          Family deleted successfully
        </div>
      )}
    </div>
  );
}
