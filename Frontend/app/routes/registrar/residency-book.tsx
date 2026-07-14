import React, { useEffect, useState } from 'react';
import {
    BookOpen, Plus, MapPin, ArrowLeft, Upload, CheckCircle2,
    UserPlus, ArrowLeftRight, Trash2, Inbox, Loader2, AlertCircle,
} from 'lucide-react';
import { api, ApiError, getStoredUser, type Paginated } from '~/lib/api';
import { CitizenSearch } from '~/components/CitizenSearch';

// ── API shapes ──────────────────────────────────────────────────────────────
interface ApiCitizen {
    id: number;
    national_id_number: string | null;
    full_name_kh: string | null;
    full_name_en: string | null;
}
interface ApiHousehold {
    id: number;
    household_number: string;
    household_head_id: number | null;
    head: ApiCitizen | null;
    location: {
        village_name?: string | null;
        commune_name?: string | null;
        district_name?: string | null;
        province_name?: string | null;
    } | null;
    house_no: string | null;
    address_detail: string | null;
    issued_at: string | null;
    created_date: string | null;
    members_count: number;
}
interface ApiMember {
    id: number;
    citizen: ApiCitizen | null;
    relation_to_head: string;
    is_current: boolean;
}
interface GeoRow { id: number; name_en: string | null; name_kh: string | null }

// ── UI models ────────────────────────────────────────────────────────────────
interface HouseholdMember {
    hhmId: number;
    citizenId: number;
    nameKh: string;
    nameEn: string;
    nid: string;
    relationship: string;
    isHead: boolean;
}

interface ResidencyBook {
    id: number;
    bookNumber: string;
    village: string;
    commune: string;
    province: string;
    registeredOn: string;
    civilAddress: string;
    membersCount: number;          // from API withCount (current members)
    headNameKh: string;
    headNameEn: string;
    members: HouseholdMember[] | null; // lazy-loaded when the book is opened
}

interface GeoOption { value: string; label: string }

const relationshipOptions = ['spouse', 'child', 'parent', 'sibling', 'other'];

function geoLabel(r: GeoRow): string {
    return r.name_en || r.name_kh || `#${r.id}`;
}

function toBook(h: ApiHousehold): ResidencyBook {
    const loc = h.location;
    const address = [h.house_no, loc?.village_name, loc?.commune_name, loc?.district_name, loc?.province_name, h.address_detail]
        .filter(Boolean)
        .join(', ');
    return {
        id: h.id,
        bookNumber: h.household_number,
        village: loc?.village_name ?? '—',
        commune: loc?.commune_name ?? '—',
        province: loc?.province_name ?? '—',
        registeredOn: h.issued_at ?? h.created_date ?? '',
        civilAddress: address || '—',
        membersCount: h.members_count ?? 0,
        headNameKh: h.head?.full_name_kh ?? '',
        headNameEn: h.head?.full_name_en ?? '',
        members: null,
    };
}

function toMember(m: ApiMember): HouseholdMember {
    return {
        hhmId: m.id,
        citizenId: m.citizen?.id ?? 0,
        nameKh: m.citizen?.full_name_kh ?? '',
        nameEn: m.citizen?.full_name_en || m.citizen?.full_name_kh || 'Unknown',
        nid: m.citizen?.national_id_number ?? '—',
        relationship: m.relation_to_head,
        isHead: m.relation_to_head === 'head',
    };
}

// Logged-in user stored at login (SystemUserResource).
interface StoredUser {
    full_name_en: string | null;
    full_name_kh: string | null;
    username: string;
}

type PanelMode =
    | { type: 'empty' }
    | { type: 'create' }
    | { type: 'detail'; bookId: number };

interface CreateForm {
    province: string;
    district: string;
    commune: string;
    village: string;
    streetAddress: string;
    head: ApiCitizen | null;
}

const emptyCreateForm: CreateForm = {
    province: '', district: '', commune: '', village: '', streetAddress: '', head: null,
};

function formatDate(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US');
}

function initials(nameEn: string): string {
    const parts = nameEn.trim().split(/\s+/);
    return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

export default function ResidencyBookPage() {
    const [books, setBooks] = useState<ResidencyBook[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [panel, setPanel] = useState<PanelMode>({ type: 'empty' });
    const [createForm, setCreateForm] = useState<CreateForm>(emptyCreateForm);
    const [showToast, setShowToast] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [membersLoading, setMembersLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [registrarName, setRegistrarName] = useState('Registrar');

    // Identify the authorizing registrar from the logged-in session. Set after
    // mount (localStorage is client-only) to avoid an SSR hydration mismatch.
    useEffect(() => {
        const u = getStoredUser<StoredUser>();
        if (u) setRegistrarName(u.full_name_en || u.full_name_kh || u.username || 'Registrar');
    }, []);

    // geo cascade options
    const [provinces, setProvinces] = useState<GeoOption[]>([]);
    const [districts, setDistricts] = useState<GeoOption[]>([]);
    const [communes, setCommunes] = useState<GeoOption[]>([]);
    const [villages, setVillages] = useState<GeoOption[]>([]);

    // enroll + transfer form state
    const [enrollCitizen, setEnrollCitizen] = useState<ApiCitizen | null>(null);
    const [enrollRelationship, setEnrollRelationship] = useState(relationshipOptions[0]);
    const [transferMemberId, setTransferMemberId] = useState('');
    const [transferTargetId, setTransferTargetId] = useState('');
    const [transferReason, setTransferReason] = useState('');

    function fireToast(message: string) {
        setShowToast(message);
        setTimeout(() => setShowToast(null), 2500);
    }

    // ── load ledger ────────────────────────────────────────────────────────────
    async function loadBooks(): Promise<ResidencyBook[]> {
        const res = await api.get<Paginated<ApiHousehold>>('/households', { per_page: 100 });
        const mapped = res.data.map(toBook);
        setBooks(mapped);
        return mapped;
    }

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                await loadBooks();
            } catch (err) {
                if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load residency books.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // provinces once
    useEffect(() => {
        api.get<GeoRow[]>('/geo/provinces')
            .then((rows) => setProvinces(rows.map((r) => ({ value: String(r.id), label: geoLabel(r) }))))
            .catch(() => setProvinces([]));
    }, []);

    // cascade: district ← province, commune ← district, village ← commune
    useEffect(() => {
        if (!createForm.province) { setDistricts([]); return; }
        api.get<GeoRow[]>('/geo/districts', { province_id: createForm.province })
            .then((rows) => setDistricts(rows.map((r) => ({ value: String(r.id), label: geoLabel(r) }))))
            .catch(() => setDistricts([]));
    }, [createForm.province]);

    useEffect(() => {
        if (!createForm.district) { setCommunes([]); return; }
        api.get<GeoRow[]>('/geo/communes', { district_id: createForm.district })
            .then((rows) => setCommunes(rows.map((r) => ({ value: String(r.id), label: geoLabel(r) }))))
            .catch(() => setCommunes([]));
    }, [createForm.district]);

    useEffect(() => {
        if (!createForm.commune) { setVillages([]); return; }
        api.get<GeoRow[]>('/geo/villages', { commune_id: createForm.commune })
            .then((rows) => setVillages(rows.map((r) => ({ value: String(r.id), label: geoLabel(r) }))))
            .catch(() => setVillages([]));
    }, [createForm.commune]);

    function updateCreateField<K extends keyof CreateForm>(key: K, value: CreateForm[K]) {
        setCreateForm((prev) => {
            const next = { ...prev, [key]: value };
            if (key === 'province') { next.district = ''; next.commune = ''; next.village = ''; }
            if (key === 'district') { next.commune = ''; next.village = ''; }
            if (key === 'commune') { next.village = ''; }
            return next;
        });
    }

    // ── open a book: lazy-load its members ──────────────────────────────────────
    async function openBook(bookId: number) {
        setPanel({ type: 'detail', bookId });
        setActionError(null);
        const book = books.find((b) => b.id === bookId);
        if (!book || book.members !== null) return;
        await loadMembers(bookId);
    }

    async function loadMembers(bookId: number) {
        setMembersLoading(true);
        try {
            const res = await api.get<{ data: ApiMember[] }>(`/households/${bookId}/members`);
            const members = res.data.filter((m) => m.is_current).map(toMember);
            setBooks((prev) => prev.map((b) => (b.id === bookId ? { ...b, members, membersCount: members.length } : b)));
        } catch (err) {
            setActionError(err instanceof ApiError ? err.message : 'Failed to load household members.');
        } finally {
            setMembersLoading(false);
        }
    }

    const selectedBook = panel.type === 'detail' ? books.find((b) => b.id === panel.bookId) ?? null : null;

    // ── create book ─────────────────────────────────────────────────────────────
    async function handleIssueBook() {
        setActionError(null);
        if (!createForm.village || !createForm.head) {
            setActionError('Select a village and a head of household.');
            return;
        }
        setBusy(true);
        try {
            const created = await api.post<{ data: ApiHousehold }>('/households', {
                household_number: `HH-${Date.now().toString().slice(-6)}`,
                village_id: Number(createForm.village),
                household_head_id: createForm.head.id,
                house_no: createForm.streetAddress || null,
                address_detail: createForm.streetAddress || null,
                issued_at: new Date().toISOString().slice(0, 10),
            });
            const list = await loadBooks();
            setCreateForm(emptyCreateForm);
            const newId = created.data.id;
            setPanel({ type: 'detail', bookId: newId });
            if (list.find((b) => b.id === newId)) await loadMembers(newId);
            fireToast('Residency Book Issued');
        } catch (err) {
            setActionError(err instanceof ApiError ? err.message : 'Failed to issue residency book.');
        } finally {
            setBusy(false);
        }
    }

    // ── member actions ──────────────────────────────────────────────────────────
    async function handleEnroll() {
        if (!selectedBook || !enrollCitizen) return;
        setActionError(null);
        setBusy(true);
        try {
            await api.post(`/households/${selectedBook.id}/members`, {
                citizen_id: enrollCitizen.id,
                relation_to_head: enrollRelationship,
            });
            await loadMembers(selectedBook.id);
            setEnrollCitizen(null);
            fireToast('Resident Enrolled');
        } catch (err) {
            setActionError(err instanceof ApiError ? err.message : 'Failed to enroll resident.');
        } finally {
            setBusy(false);
        }
    }

    async function handleMakeHead(member: HouseholdMember) {
        if (!selectedBook) return;
        setActionError(null);
        setBusy(true);
        try {
            await api.patch(`/households/${selectedBook.id}/head`, { new_head_citizen_id: member.citizenId });
            await loadMembers(selectedBook.id);
            // head name shown in the ledger changed — refresh the list too
            await loadBooks();
            setPanel({ type: 'detail', bookId: selectedBook.id });
            fireToast('Head of Household Updated');
        } catch (err) {
            setActionError(err instanceof ApiError ? err.message : 'Failed to change head.');
        } finally {
            setBusy(false);
        }
    }

    async function handleDeleteMember(member: HouseholdMember) {
        if (!selectedBook) return;
        if (!window.confirm(`Remove ${member.nameEn} from this residency book?`)) return;
        setActionError(null);
        setBusy(true);
        try {
            await api.del(`/households/${selectedBook.id}/members/${member.citizenId}`);
            await loadMembers(selectedBook.id);
            fireToast('Member Removed');
        } catch (err) {
            setActionError(err instanceof ApiError ? err.message : 'Failed to remove member.');
        } finally {
            setBusy(false);
        }
    }

    async function handleRelocate() {
        if (!selectedBook || !transferMemberId || !transferTargetId.trim()) return;
        const target = books.find((b) => b.bookNumber === transferTargetId.trim());
        if (!target) {
            setActionError('No residency book found with that ID.');
            return;
        }
        setActionError(null);
        setBusy(true);
        try {
            await api.post('/households/transfer', {
                citizen_id: Number(transferMemberId),
                from_household_id: selectedBook.id,
                to_household_id: target.id,
                reason: transferReason || null,
            });
            await loadMembers(selectedBook.id);
            setBooks((prev) => prev.map((b) => (b.id === target.id ? { ...b, members: null } : b)));
            setTransferMemberId('');
            setTransferTargetId('');
            setTransferReason('');
            fireToast('Member Relocated');
        } catch (err) {
            setActionError(err instanceof ApiError ? err.message : 'Failed to relocate member.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Residency Registration &amp; Address Book</h1>
                <p className="text-xs text-slate-500 mt-1">Province-district domicile records and residence books.</p>
            </div>

            <div className="grid grid-cols-2 gap-6 items-start">
                {/* LEDGER */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-slate-700" />
                            <h2 className="text-sm font-bold text-slate-900">Residency Book Ledger</h2>
                        </div>
                        <button
                            type="button"
                            onClick={() => { setCreateForm(emptyCreateForm); setActionError(null); setPanel({ type: 'create' }); }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-amber-600"
                        >
                            <Plus className="h-3 w-3" />
                            New Register
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center gap-2 py-10 text-xs text-slate-400">
                            <Loader2 className="h-4 w-4 animate-spin" /> Loading residency books…
                        </div>
                    ) : error ? (
                        <div className="flex items-start gap-2 py-6 text-xs text-red-700">
                            <AlertCircle className="h-4 w-4 shrink-0 stroke-[2.5]" /> {error}
                        </div>
                    ) : books.length === 0 ? (
                        <p className="py-10 text-center text-xs text-slate-400">No residency books registered yet.</p>
                    ) : (
                        <div className="space-y-4">
                            {books.map((book) => {
                                const isSelected = panel.type === 'detail' && panel.bookId === book.id;
                                const count = book.members ? book.members.length : book.membersCount;
                                const headLabel = book.headNameKh || book.headNameEn || '—';
                                return (
                                    <button
                                        key={book.id}
                                        type="button"
                                        onClick={() => openBook(book.id)}
                                        className={`flex w-full items-start justify-between rounded-lg p-3 text-left transition-colors ${
                                            isSelected ? 'border-l-4 border-amber-400 bg-amber-50' : 'border border-slate-100 hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-[10px] font-bold text-amber-700">
                                                HH
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">Book: {book.bookNumber}</p>
                                                <p className="text-xs font-semibold text-slate-700">Head: {headLabel}</p>
                                                <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                                                    <MapPin className="h-3 w-3" />
                                                    {book.village}, {book.commune}, {book.province}
                                                </div>
                                            </div>
                                        </div>
                                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
                    {count} Members
                  </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* RIGHT PANEL */}
                {panel.type === 'empty' && (
                    <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center shadow-sm">
                        <Inbox className="mb-3 h-8 w-8 text-slate-300" />
                        <p className="text-sm font-semibold text-slate-500">No residency book selected</p>
                        <p className="mt-1 text-xs text-slate-400">Click a book in the ledger to view its details,<br />or issue a new one.</p>
                    </div>
                )}

                {panel.type === 'create' && (
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                            <h2 className="text-sm font-bold text-slate-900">Establish Household Residency book</h2>
                            <button
                                type="button"
                                onClick={() => setPanel({ type: 'empty' })}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
                            >
                                <ArrowLeft className="h-3 w-3" />
                                Back
                            </button>
                        </div>
                        <p className="text-[11px] text-slate-500 mb-5">Authorized Official Registrar: {registrarName}</p>

                        {actionError && (
                            <div className="mb-4 flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0 stroke-[2.5]" /> {actionError}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <SelectField label="Province (ខេត្ត/ក្រុង)" value={createForm.province} onChange={(v) => updateCreateField('province', v)} options={provinces} placeholder="Select province" />
                            <SelectField label="District (ស្រុក/ខណ្ឌ)" value={createForm.district} onChange={(v) => updateCreateField('district', v)} options={districts} placeholder="Select district" disabled={!createForm.province} />
                            <SelectField label="Commune (ឃុំ/សង្កាត់)" value={createForm.commune} onChange={(v) => updateCreateField('commune', v)} options={communes} placeholder="Select commune" disabled={!createForm.district} />
                            <SelectField label="Village (ភូមិ)" value={createForm.village} onChange={(v) => updateCreateField('village', v)} options={villages} placeholder="Select village" disabled={!createForm.commune} />
                        </div>

                        <div className="mb-4">
                            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Street address/Detail notes</label>
                            <input
                                type="text"
                                value={createForm.streetAddress}
                                onChange={(e) => updateCreateField('streetAddress', e.target.value)}
                                placeholder="e.g. #12A, Road Block 5"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                            />
                        </div>

                        <div className="mb-6">
                            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Designate Head of household *</label>
                            <CitizenSearch
                                placeholder="Search citizen by name (KH/ENG) or NID"
                                selected={createForm.head}
                                onSelect={(c) => updateCreateField('head', c)}
                                ringClass="focus:ring-amber-400"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={handleIssueBook}
                            disabled={busy}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 py-2.5 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-60"
                        >
                            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                            Issue Residency Book &amp; Stamp Seal
                        </button>
                    </div>
                )}

                {panel.type === 'detail' && selectedBook && (
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-[11px] font-bold text-amber-700">
                                HH
                            </div>
                            <div>
                                <p className="text-base font-bold text-slate-900">Residency ID: {selectedBook.bookNumber}</p>
                                <p className="text-xs text-slate-400">Registered on system database: {formatDate(selectedBook.registeredOn)}</p>
                            </div>
                        </div>

                        <div className="mb-5 rounded-lg bg-slate-50 p-3">
                            <div className="flex items-start gap-2">
                                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
                                <div>
                                    <p className="text-xs font-bold text-slate-800">Official Civil Address REGISTER</p>
                                    <p className="text-xs text-slate-600 mt-0.5">{selectedBook.civilAddress}</p>
                                </div>
                            </div>
                        </div>

                        {actionError && (
                            <div className="mb-3 flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0 stroke-[2.5]" /> {actionError}
                            </div>
                        )}

                        <p className="mb-2 text-[10px] font-bold tracking-wide text-slate-500">REGISTERED HOUSEHOLD MEMBERS</p>
                        <div className="mb-5 divide-y divide-slate-100 rounded-lg border border-slate-100">
                            {membersLoading ? (
                                <div className="flex items-center justify-center gap-2 p-4 text-xs text-slate-400">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Loading members…
                                </div>
                            ) : !selectedBook.members || selectedBook.members.length === 0 ? (
                                <p className="p-4 text-center text-xs text-slate-400">No current members.</p>
                            ) : (
                                selectedBook.members.map((member) => (
                                    <div key={member.hhmId} className="flex items-center justify-between gap-3 p-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-700">
                                                {initials(member.nameEn)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-bold text-slate-900">
                                                    {member.nameKh ? `${member.nameKh} (${member.nameEn})` : member.nameEn}
                                                </p>
                                                <p className="text-[11px] text-slate-500">
                                                    NID: {member.nid} &nbsp; Relationship: <span className="font-semibold text-amber-600">{member.relationship}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                            {member.isHead ? (
                                                <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">
                          Head of Household
                        </span>
                                            ) : (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleMakeHead(member)}
                                                        disabled={busy}
                                                        className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-60"
                                                    >
                                                        Make Head
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteMember(member)}
                                                        disabled={busy}
                                                        aria-label={`Remove ${member.nameEn}`}
                                                        className="rounded-lg bg-red-50 p-1.5 text-red-600 hover:bg-red-100 disabled:opacity-60"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="mb-5 rounded-lg border border-slate-100 p-3">
                            <div className="mb-2 flex items-center gap-1.5">
                                <UserPlus className="h-3.5 w-3.5 text-slate-700" />
                                <p className="text-xs font-bold text-slate-900">Enroll Resident into Book</p>
                            </div>
                            <div className="mb-2">
                                <CitizenSearch
                                    placeholder="Search citizen by name (KH/ENG) or NID"
                                    selected={enrollCitizen}
                                    onSelect={setEnrollCitizen}
                                    ringClass="focus:ring-orange-400"
                                />
                            </div>
                            <div className="flex gap-2">
                                <select
                                    value={enrollRelationship}
                                    onChange={(e) => setEnrollRelationship(e.target.value)}
                                    className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
                                >
                                    {relationshipOptions.map((r) => <option key={r} value={r}>{r}</option>)}
                                </select>
                                <button
                                    type="button"
                                    onClick={handleEnroll}
                                    disabled={busy || !enrollCitizen}
                                    className="rounded-lg bg-orange-600 px-4 py-2 text-xs font-bold text-white hover:bg-orange-700 disabled:opacity-60"
                                >
                                    Add Link
                                </button>
                            </div>
                        </div>

                        <div className="rounded-lg border border-slate-100 p-3">
                            <div className="mb-2 flex items-center gap-1.5">
                                <ArrowLeftRight className="h-3.5 w-3.5 text-slate-700" />
                                <p className="text-xs font-bold text-slate-900">Transfer Member (Relocation)</p>
                            </div>
                            <div className="mb-2 grid grid-cols-2 gap-2">
                                <select
                                    value={transferMemberId}
                                    onChange={(e) => setTransferMemberId(e.target.value)}
                                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
                                >
                                    <option value="">-- Choose Member --</option>
                                    {(selectedBook.members ?? []).map((m) => (
                                        <option key={m.hhmId} value={m.citizenId}>{m.nameEn}</option>
                                    ))}
                                </select>
                                <input
                                    type="text"
                                    value={transferTargetId}
                                    onChange={(e) => setTransferTargetId(e.target.value)}
                                    placeholder="Target Residency ID (e.g. HH-1002)"
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
                                />
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={transferReason}
                                    onChange={(e) => setTransferReason(e.target.value)}
                                    placeholder="Reason, e.g. Marriage"
                                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
                                />
                                <button
                                    type="button"
                                    onClick={handleRelocate}
                                    disabled={busy}
                                    className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-900 disabled:opacity-60"
                                >
                                    Relocate
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {showToast && (
                <div className="fixed top-6 right-6 z-50 flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-xs font-bold text-white shadow-xl">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    {showToast}
                </div>
            )}
        </div>
    );
}

function SelectField({
                         label, value, onChange, options, placeholder, disabled,
                     }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: GeoOption[];
    placeholder: string;
    disabled?: boolean;
}) {
    return (
        <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">{label} *</label>
            <select
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
                <option value="">{placeholder}</option>
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
    );
}
