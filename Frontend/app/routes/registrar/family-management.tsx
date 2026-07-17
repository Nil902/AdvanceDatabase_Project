import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Users,
  FileText,
  Trash2,
  Edit2,
  CheckCircle2,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { api } from '../../lib/api';
import { CitizenSearch } from '../../components/CitizenSearch';
import type { CitizenOption } from '../../components/CitizenSearch';

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

/** Map the Laravel API response shape into our local FamilyUnit interface. */
function mapApiFamily(raw: any): FamilyUnit {
  return {
    id: String(raw.id),
    familyHeadNid: raw.head_citizen?.national_id_number ?? '',
    familyHeadKhmer: raw.head_citizen?.full_name_kh ?? '',
    familyHeadEnglish: raw.head_citizen?.full_name_en ?? '',
    householdNumber: raw.household_number ?? raw.id,
    commune: raw.commune ?? '',
    district: raw.district ?? '',
    province: raw.province ?? '',
    memberCount: raw.members?.length ?? raw.member_count ?? 0,
    registeredDate: raw.created_at?.slice(0, 10) ?? '',
    members: (raw.members ?? []).map((m: any) => ({
      id: String(m.id),
      nid: m.citizen?.national_id_number ?? '',
      khmerName: m.citizen?.full_name_kh ?? '',
      englishName: m.citizen?.full_name_en ?? '',
      relationship: m.relationship ?? '',
      dob: m.citizen?.date_of_birth ?? '',
      gender: m.citizen?.gender === 'female' ? 'Female' : 'Male',
      status: m.citizen?.status === 'deceased' ? 'Deceased' : 'Active',
    })),
  };
}

type Panel =
  | { type: 'empty' }
  | { type: 'detail'; familyId: string }
  | { type: 'create' }
  | { type: 'add-member'; familyId: string };

export default function FamilyManagementPage() {
  const [families, setFamilies] = useState<FamilyUnit[]>([]);
  const [panel, setPanel] = useState<Panel>({ type: 'empty' });
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [showDeleteToast, setShowDeleteToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // --- Create family state ---
  const [headCitizen, setHeadCitizen] = useState<CitizenOption | null>(null);
  const [familyCode, setFamilyCode] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // --- Add member state ---
  const [memberCitizen, setMemberCitizen] = useState<CitizenOption | null>(null);
  const [memberRelationship, setMemberRelationship] = useState('Spouse');
  const [addMemberLoading, setAddMemberLoading] = useState(false);

  // Search families from the API
  const searchFamilies = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setFamilies([]);
      return;
    }
    setSearching(true);
    try {
      const res = await api.get<{ data: any[] }>('/families/search', { query });
      setFamilies((res.data ?? []).map(mapApiFamily));
    } catch (err) {
      console.error('Failed to search families:', err);
      setFamilies([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounced search on searchTerm change
  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setFamilies([]);
      return;
    }
    const timeout = setTimeout(() => {
      searchFamilies(searchTerm);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchTerm, searchFamilies]);

  // Fetch a single family's full details (with tree)
  const fetchFamilyDetail = async (id: string) => {
    try {
      const res = await api.get<{ data: any }>(`/families/${id}/tree`);
      const mapped = mapApiFamily(res.data ?? res);
      setFamilies((prev) => {
        const idx = prev.findIndex((f) => f.id === id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = mapped;
          return updated;
        }
        return [...prev, mapped];
      });
    } catch (err) {
      console.error('Failed to fetch family tree:', err);
    }
  };

  const handleSelectFamily = async (id: string) => {
    setPanel({ type: 'detail', familyId: id });
    await fetchFamilyDetail(id);
  };

  const handleOpenCreateForm = () => {
    setHeadCitizen(null);
    setPanel({ type: 'create' });
  };

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!headCitizen) return;

    setCreateLoading(true);
    try {
      const res = await api.post<{ data: any }>('/families', {
        head_citizen_id: headCitizen.id,
        family_code: familyCode.trim() || null,
      });
      const newFamily = mapApiFamily(res.data ?? res);
      setFamilies((prev) => [...prev, newFamily]);
      setPanel({ type: 'detail', familyId: newFamily.id });
      setHeadCitizen(null);
      setFamilyCode('');
      showToast('Family created successfully');
    } catch (err: any) {
      console.error('Failed to create family:', err);
      showToast(err?.message ?? 'Failed to create family');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleOpenAddMember = (familyId: string) => {
    setMemberCitizen(null);
    setMemberRelationship('Spouse');
    setPanel({ type: 'add-member', familyId });
  };

  const handleAddMember = async (e: React.FormEvent, familyId: string) => {
    e.preventDefault();
    if (!memberCitizen) return;

    setAddMemberLoading(true);
    try {
      await api.post(`/families/${familyId}/members`, {
        citizen_id: memberCitizen.id,
        relationship: memberRelationship,
      });
      // Refresh the family detail
      await fetchFamilyDetail(familyId);
      setPanel({ type: 'detail', familyId });
      setMemberCitizen(null);
      showToast('Member added successfully');
    } catch (err: any) {
      console.error('Failed to add member:', err);
      showToast(err?.message ?? 'Failed to add member');
    } finally {
      setAddMemberLoading(false);
    }
  };

  const handleDeleteFamily = async (id: string) => {
    try {
      await api.del(`/families/${id}`);
      setFamilies((prev) => prev.filter((f) => f.id !== id));
      setPanel({ type: 'empty' });
      showToast('Family deleted successfully');
    } catch (err: any) {
      console.error('Failed to delete family:', err);
      showToast(err?.message ?? 'Failed to delete family');
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setShowDeleteToast(true);
    setTimeout(() => setShowDeleteToast(false), 3000);
  };

  const selected = panel.type === 'detail' ? families.find((f) => f.id === panel.familyId) ?? null : null;

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
              {searching && <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-slate-400" />}
            </div>
          </div>

          <div className="max-h-[520px] overflow-y-auto divide-y divide-slate-100">
            {searchTerm.trim().length < 2 && (
              <p className="p-6 text-center text-xs text-slate-400">Type at least 2 characters to search families.</p>
            )}
            {searchTerm.trim().length >= 2 && !searching && families.length === 0 && (
              <p className="p-6 text-center text-xs text-slate-400">No matching families.</p>
            )}
            {families.map((family) => (
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
                    {(family.familyHeadEnglish || '?').split(' ').map((n) => n[0]).join('').toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {family.familyHeadEnglish} {family.familyHeadKhmer && <span className="font-medium text-slate-500">({family.familyHeadKhmer})</span>}
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
            <p className="text-[11px] text-slate-400 mb-5">Select a citizen to be the family head.</p>

            <form onSubmit={handleCreateFamily} className="space-y-4">
              <Field label="Family Head (Search Citizen)" required>
                <CitizenSearch
                  placeholder="Search citizen by name or NID..."
                  selected={headCitizen}
                  onSelect={setHeadCitizen}
                />
              </Field>

              <Field label="Family Code (optional)">
                <input
                  type="text"
                  value={familyCode}
                  onChange={(e) => setFamilyCode(e.target.value)}
                  placeholder="Auto-assigned if left blank"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </Field>

              <button
                type="submit"
                disabled={!headCitizen || createLoading}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Create Family Unit
              </button>
            </form>
          </div>
        )}

        {panel.type === 'add-member' && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900">Add Family Member</h2>
              <button
                type="button"
                onClick={() => setPanel({ type: 'detail', familyId: panel.familyId })}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
              >
                <ArrowLeft className="h-3 w-3" />
                Back
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mb-5">Search for a citizen and assign their relationship to the family head.</p>

            <form onSubmit={(e) => handleAddMember(e, panel.familyId)} className="space-y-4">
              <Field label="Citizen" required>
                <CitizenSearch
                  placeholder="Search citizen by name or NID..."
                  selected={memberCitizen}
                  onSelect={setMemberCitizen}
                />
              </Field>

              <Field label="Relationship" required>
                <select
                  value={memberRelationship}
                  onChange={(e) => setMemberRelationship(e.target.value)}
                  className="input-field"
                >
                  <option value="Spouse">Spouse</option>
                  <option value="Child">Child</option>
                  <option value="Parent">Parent</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Other">Other</option>
                </select>
              </Field>

              <button
                type="submit"
                disabled={!memberCitizen || addMemberLoading}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addMemberLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Add Member
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
                    {(selected.familyHeadEnglish || '?').split(' ').map((n) => n[0]).join('').toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {selected.familyHeadEnglish} {selected.familyHeadKhmer && <span className="font-medium text-slate-500">({selected.familyHeadKhmer})</span>}
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
              <DetailField label="Location" value={`${selected.commune}${selected.district ? ', ' + selected.district : ''}`} />
              <DetailField label="Registered" value={selected.registeredDate ? formatDate(selected.registeredDate) : '—'} />
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
                    {selected.members.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-slate-400">No members found.</td>
                      </tr>
                    )}
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
                onClick={() => handleOpenAddMember(selected.id)}
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

      {/* TOAST NOTIFICATION */}
      {showDeleteToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-xs font-bold text-white shadow-xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          {toastMessage}
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
