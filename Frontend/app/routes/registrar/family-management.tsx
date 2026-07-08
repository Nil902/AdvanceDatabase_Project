import React, { useState } from 'react';
import {
  Search,
  Plus,
  Users,
  FileText,
  Trash2,
  Edit2,
  CheckCircle2,
  ArrowLeft,
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Family Unit Management</h1>
        <p className="text-xs text-slate-500 mt-1">Register, track, and manage family relationships and household members</p>
      </div>

      <div className="grid grid-cols-2 gap-6 items-start">
        {/* LEFT PANEL: FAMILY LIST */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-700" />
              <h2 className="text-sm font-bold text-slate-900">Family Units</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
              Total: {families.length}
            </span>
          </div>

          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, NID, or household..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
              />
            </div>
          </div>

          <div className="max-h-[520px] overflow-y-auto divide-y divide-slate-100">
            {filteredFamilies.length === 0 && (
              <p className="p-6 text-center text-xs text-slate-400">No matching families.</p>
            )}
            {filteredFamilies.map((family) => (
              <button
                key={family.id}
                type="button"
                onClick={() => handleSelectFamily(family.id)}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left transition ${
                  panel.type === 'detail' && panel.familyId === family.id ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-slate-50'
                }`}
              >
                <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-slate-600">
                    {family.familyHeadEnglish.split(' ').map((n) => n[0]).join('').toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {family.familyHeadEnglish} <span className="font-medium text-slate-500">({family.familyHeadKhmer})</span>
                  </p>
                  <p className="text-[10px] text-slate-400">{family.householdNumber}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{family.memberCount} members • {family.commune}</p>
                </div>
                <span className="shrink-0 rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-slate-100 text-slate-700">
                  {family.memberCount}
                </span>
              </button>
            ))}
          </div>

          <div className="border-t border-slate-100 p-4">
            <button
              type="button"
              onClick={handleOpenCreateForm}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
            >
              <Plus className="h-3.5 w-3.5" />
              Register Family
            </button>
          </div>
        </div>

        {/* RIGHT PANEL: DETAILS/FORM/EMPTY */}
        {panel.type === 'empty' && (
          <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center shadow-sm">
            <Users className="mb-3 h-8 w-8 text-slate-300" />
            <p className="text-sm font-semibold text-slate-500">No family selected</p>
            <p className="mt-1 text-xs text-slate-400">Click a family unit in the list to view details,<br />or register a new family.</p>
          </div>
        )}

        {panel.type === 'create' && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900">Register New Family Unit</h2>
              <button
                type="button"
                onClick={() => setPanel({ type: 'empty' })}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
              >
                <ArrowLeft className="h-3 w-3" />
                Back
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mb-5">Authorized Official Registrar: {currentRegistrar}</p>

            <form onSubmit={handleCreateFamily} className="space-y-4">
              <Field label="Family Head Name (Khmer)" required>
                <input
                  type="text"
                  required
                  value={createForm.headKhmerName}
                  onChange={(e) => setCreateForm({ ...createForm, headKhmerName: e.target.value })}
                  placeholder="e.g. សុខ ណារិទ្ធ"
                  className="input-field"
                />
              </Field>

              <Field label="Family Head Name (English)" required>
                <input
                  type="text"
                  required
                  value={createForm.headEnglishName}
                  onChange={(e) => setCreateForm({ ...createForm, headEnglishName: e.target.value })}
                  placeholder="e.g. Sok Narith"
                  className="input-field"
                />
              </Field>

              <Field label="National ID Number" required>
                <input
                  type="text"
                  required
                  value={createForm.headNid}
                  onChange={(e) => setCreateForm({ ...createForm, headNid: e.target.value })}
                  placeholder="e.g. 010 582 914"
                  className="input-field"
                />
              </Field>

              <Field label="Commune" required>
                <input
                  type="text"
                  required
                  value={createForm.commune}
                  onChange={(e) => setCreateForm({ ...createForm, commune: e.target.value })}
                  className="input-field"
                />
              </Field>

              <Field label="District" required>
                <input
                  type="text"
                  required
                  value={createForm.district}
                  onChange={(e) => setCreateForm({ ...createForm, district: e.target.value })}
                  className="input-field"
                />
              </Field>

              <Field label="Province" required>
                <input
                  type="text"
                  required
                  value={createForm.province}
                  onChange={(e) => setCreateForm({ ...createForm, province: e.target.value })}
                  className="input-field"
                />
              </Field>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
              >
                <Plus className="h-3.5 w-3.5" />
                Create Family Unit
              </button>
            </form>
          </div>
        )}

        {panel.type === 'detail' && selected && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center">
                  <span className="text-xs font-bold text-slate-600">
                    {selected.familyHeadEnglish.split(' ').map((n) => n[0]).join('').toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {selected.familyHeadEnglish} <span className="font-medium text-slate-500">({selected.familyHeadKhmer})</span>
                  </p>
                  <p className="text-xs text-slate-500">{selected.householdNumber}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPanel({ type: 'empty' })}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
              >
                <ArrowLeft className="h-3 w-3" />
                Back
              </button>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-5 text-xs border-b border-slate-200 pb-5">
              <DetailField label="Household Number" value={selected.householdNumber} />
              <DetailField label="Member Count" value={String(selected.memberCount)} />
              <DetailField label="Location" value={`${selected.commune}, ${selected.district}`} />
              <DetailField label="Registered" value={formatDate(selected.registeredDate)} />
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-900 mb-3">Family Members</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 px-2 font-semibold text-slate-600">Name (Khmer)</th>
                      <th className="text-left py-2 px-2 font-semibold text-slate-600">Name (English)</th>
                      <th className="text-left py-2 px-2 font-semibold text-slate-600">Relationship</th>
                      <th className="text-left py-2 px-2 font-semibold text-slate-600">NID</th>
                      <th className="text-left py-2 px-2 font-semibold text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.members.map((member) => (
                      <tr key={member.id} className="border-b border-slate-100">
                        <td className="py-2 px-2">{member.khmerName}</td>
                        <td className="py-2 px-2">{member.englishName}</td>
                        <td className="py-2 px-2">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${getRelationshipColor(member.relationship)}`}>
                            {member.relationship}
                          </span>
                        </td>
                        <td className="py-2 px-2 font-mono text-slate-500 text-[10px]">{member.nid || '—'}</td>
                        <td className="py-2 px-2">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${statusBadgeClass(member.status)}`}>
                            {member.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-2 pt-5 border-t border-slate-200 mt-5">
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
                onClick={() => handleDeleteFamily(selected.id)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-red-700 ml-auto"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DELETE SUCCESS TOAST */}
      {showDeleteToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-xs font-bold text-white shadow-xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          Family deleted successfully
        </div>
      )}

      <style>{`
        .input-field {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid #e2e8f0;
          background: #fff;
          padding: 0.5rem 0.75rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: #1e293b;
          outline: none;
        }
        .input-field:focus {
          border-color: #94a3b8;
        }
      `}</style>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold text-slate-400 block">
        {label}{required && <span className="text-red-500"> *</span>}
      </label>
      {children}
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-slate-400 mb-1">{label}</p>
      <p className="font-bold text-slate-800 text-xs">{value}</p>
    </div>
  );
}
