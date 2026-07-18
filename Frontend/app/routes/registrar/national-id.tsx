import React, { useEffect, useState } from 'react';
import {
    CreditCard, ShieldCheck, Eye, Inbox, Plus, ArrowLeft, UserRound, Loader2, AlertCircle, ImagePlus,
} from 'lucide-react';
import { api, ApiError, getStoredUser, fetchAuthedBlobUrl, type Paginated } from '~/lib/api';
import { CitizenSearch, type CitizenOption } from '~/components/CitizenSearch';

type PipelineStage = 'Pending Admin' | 'Smart Print Active' | 'Dispatched Province' | 'Delivered Station';
type NidStatus = 'Active' | 'Suspended' | 'Disabled';

interface NidCard {
    id: string;
    cardNumber: string;    // card_serial_number
    requestNumber: string;
    nid: string;
    nameKh: string;
    nameEn: string;
    dob: string;   // ISO
    sex: 'M' | 'F';
    address: string;
    expiresOn: string; // ISO
    status: NidStatus;
    hasPhoto: boolean;
    pipelineStage: PipelineStage;
    // NOTE: `delivered` is intentionally NOT stored here. It's derived from
    // pipelineStage via isDelivered() so the two can never disagree.
}

const pipelineStages: PipelineStage[] = ['Pending Admin', 'Smart Print Active', 'Dispatched Province', 'Delivered Station'];

// A card is "delivered" iff it has reached the final pipeline stage — single
// source of truth, no separate boolean to keep in sync.
function isDelivered(card: NidCard): boolean {
    return card.pipelineStage === 'Delivered Station';
}

// ── API shapes (IdCardController@search → IdCardResource) ───────────────────
// There is no GET /nid-cards; the list lives at GET /id-cards/search. The API
// only tracks `status` — the printing pipeline is a client-side concept, so we
// seed an initial stage from the status and manage stage changes locally.
interface ApiIdCard {
    id: number;
    card_serial_number: string;
    card_type: string;
    status: string;
    has_photo?: boolean;
    issue_date: string | null;
    expiry_date: string | null;
    citizen?: {
        id: number;
        national_id_number: string | null;
        full_name_kh: string | null;
        full_name_en: string | null;
        gender: string | null;
        date_of_birth: string | null;
        birth_place?: { province_name?: string | null } | null;
    } | null;
}

// Backend status vocabulary → the three UI states.
const API_TO_UI_STATUS: Record<string, NidStatus> = {
    active: 'Active', issued: 'Active',
    suspended: 'Suspended',
    revoked: 'Disabled', expired: 'Disabled', disabled: 'Disabled',
};
// UI states → the values UpdateStatusRequest accepts (active|suspended|revoked).
const UI_TO_API_STATUS: Record<NidStatus, 'active' | 'suspended' | 'revoked'> = {
    Active: 'active', Suspended: 'suspended', Disabled: 'revoked',
};

function mapUiStatus(apiStatus: string): NidStatus {
    return API_TO_UI_STATUS[apiStatus.toLowerCase()] ?? 'Disabled';
}

function toNidCard(c: ApiIdCard): NidCard {
    const cz = c.citizen ?? null;
    const status = mapUiStatus(c.status);
    return {
        id: String(c.id),
        cardNumber: c.card_serial_number,
        requestNumber: `REQ-${c.id}`,
        nid: cz?.national_id_number ?? '—',
        nameKh: cz?.full_name_kh ?? '',
        nameEn: cz?.full_name_en || cz?.full_name_kh || 'Unknown',
        dob: cz?.date_of_birth ?? '',
        sex: /^f/i.test(cz?.gender ?? '') ? 'F' : 'M',
        address: cz?.birth_place?.province_name ?? '',
        expiresOn: c.expiry_date ?? '',
        status,
        hasPhoto: Boolean(c.has_photo),
        // Live/issued cards are treated as already delivered; everything else
        // starts at the front of the pipeline.
        pipelineStage: status === 'Active' ? 'Delivered Station' : 'Pending Admin',
    };
}

// Logged-in user stored at login (SystemUserResource).
interface StoredUser {
    full_name_en: string | null;
    full_name_kh: string | null;
    username: string;
}

type Tab = 'inspect' | 'issues';
type Panel = { type: 'empty' } | { type: 'create' } | { type: 'detail'; cardId: string };

// StoreIdCardRequest accepts these card_type / status values.
type CardType = 'national_id' | 'temp_id' | 'foreigner_id';
type CardStatus = 'active' | 'expired' | 'revoked' | 'lost' | 'stolen';
const cardTypeOptions: { value: CardType; label: string }[] = [
    { value: 'national_id', label: 'National ID' },
    { value: 'temp_id', label: 'Temporary ID' },
    { value: 'foreigner_id', label: 'Foreigner ID' },
];
const cardStatusOptions: { value: CardStatus; label: string }[] = [
    { value: 'active', label: 'Active' },
    { value: 'expired', label: 'Expired' },
    { value: 'revoked', label: 'Revoked' },
    { value: 'lost', label: 'Lost' },
    { value: 'stolen', label: 'Stolen' },
];

const today = () => new Date().toISOString().slice(0, 10);
const tenYearsOut = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 10);
    return d.toISOString().slice(0, 10);
};

interface CreateForm {
    citizen: CitizenOption | null;
    cardType: CardType;
    serial: string;
    status: CardStatus;
    issueDate: string;
    expiryDate: string;
    biometricRef: string;
    photo: File | null;
}
const emptyCreateForm: CreateForm = {
    citizen: null,
    cardType: 'national_id',
    serial: '',
    status: 'active',
    issueDate: today(),
    expiryDate: tenYearsOut(),
    biometricRef: '',
    photo: null,
};

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US');
}

function initials(nameEn: string): string {
    return nameEn.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

function statusPillClass(status: NidStatus): string {
    if (status === 'Active') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status === 'Suspended') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-red-50 text-red-700 border-red-200';
}

export default function NationalIdCardPage() {
    const [cards, setCards] = useState<NidCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [panel, setPanel] = useState<Panel>({ type: 'empty' });
    const [tab, setTab] = useState<Tab>('inspect');
    const [flipped, setFlipped] = useState(false);
    const [createForm, setCreateForm] = useState<CreateForm>(emptyCreateForm);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [detailPhoto, setDetailPhoto] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [registrarName, setRegistrarName] = useState('Registrar');

    // Selected photo → local preview (revoke the previous object URL to avoid leaks).
    function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0] ?? null;
        setCreateForm((f) => ({ ...f, photo: file }));
        setPhotoPreview((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return file ? URL.createObjectURL(file) : null;
        });
    }

    function resetCreateForm() {
        setCreateForm(emptyCreateForm);
        setPhotoPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    }

    // Identify the authorizing registrar from the logged-in session. Set after
    // mount (localStorage is client-only) to avoid an SSR hydration mismatch.
    useEffect(() => {
        const u = getStoredUser<StoredUser>();
        if (u) setRegistrarName(u.full_name_en || u.full_name_kh || u.username || 'Registrar');
    }, []);

    // GET /id-cards/search — the ID-card list endpoint (no dedicated /nid-cards).
    async function loadCards(): Promise<NidCard[]> {
        const res = await api.get<Paginated<ApiIdCard>>('/id-cards/search', { per_page: 100 });
        const mapped = res.data.map(toNidCard);
        setCards(mapped);
        return mapped;
    }

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                await loadCards();
            } catch (err) {
                if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load ID cards.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const selected = panel.type === 'detail' ? cards.find((c) => c.id === panel.cardId) ?? null : null;

    // Load the selected card's stored photo (auth-guarded blob → object URL).
    useEffect(() => {
        let active = true;
        let created: string | null = null;
        if (selected?.hasPhoto) {
            fetchAuthedBlobUrl(`/id-cards/${selected.id}/photo`)
                .then((url) => { if (active) { created = url; setDetailPhoto(url); } else URL.revokeObjectURL(url); })
                .catch(() => { if (active) setDetailPhoto(null); });
        } else {
            setDetailPhoto(null);
        }
        return () => { active = false; if (created) URL.revokeObjectURL(created); };
    }, [selected?.id, selected?.hasPhoto]);

    function selectCard(id: string) {
        setFlipped(false);
        setPanel({ type: 'detail', cardId: id });
    }

    // Pipeline stage is a client-side concept (the API has no such column), so
    // this stays local. `delivered` is derived, so nothing else to sync.
    function setStage(cardId: string, stage: PipelineStage) {
        setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, pipelineStage: stage } : c)));
    }

    // PATCH /id-cards/{id}/status — optimistic update, revert on failure.
    async function setStatus(cardId: string, status: NidStatus) {
        setActionError(null);
        const previous = cards.find((c) => c.id === cardId)?.status;
        setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, status } : c)));
        try {
            await api.patch(`/id-cards/${cardId}/status`, { status: UI_TO_API_STATUS[status] });
        } catch (err) {
            setCards((prev) => prev.map((c) => (c.id === cardId && previous ? { ...c, status: previous } : c)));
            setActionError(err instanceof ApiError ? err.message : 'Failed to update card status.');
        }
    }

    // POST /id-cards — issue a smart card for a resolved citizen. Serial is
    // auto-generated; issue/expiry default to a 10-year validity.
    async function handleIssueCard() {
        setActionError(null);
        if (!createForm.citizen) {
            setActionError('Select a verified citizen first.');
            return;
        }
        const serial = createForm.serial.trim() || `NID-${Date.now().toString().slice(-8)}`;

        setBusy(true);
        try {
            const created = await api.post<{ data: ApiIdCard }>('/id-cards', {
                citizen_id: createForm.citizen.id,
                card_serial_number: serial,
                card_type: createForm.cardType,
                status: createForm.status,
                issue_date: createForm.issueDate,
                expiry_date: createForm.expiryDate,
                biometric_ref: createForm.biometricRef.trim() || null,
            });
            // Attach the photo (if any) as a second step. A failed upload is
            // non-fatal — the card is already issued.
            if (createForm.photo) {
                const fd = new FormData();
                fd.append('photo', createForm.photo);
                try {
                    await api.post(`/id-cards/${created.data.id}/photo`, fd);
                } catch {
                    setActionError('Card issued, but the photo upload failed. You can retry from the card.');
                }
            }
            const list = await loadCards();
            const newId = String(created.data.id);
            resetCreateForm();
            if (list.find((c) => c.id === newId)) selectCard(newId);
            else setPanel({ type: 'empty' });
        } catch (err) {
            setActionError(err instanceof ApiError ? err.message : 'Failed to issue ID card.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">National ID Card Registry</h1>
                <p className="text-xs text-slate-500 mt-1">Management of ID Card.</p>
            </div>

            <div className="grid grid-cols-2 gap-6 items-start">
                {/* LEDGER */}
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between p-6 pb-4">
                        <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-slate-700" />
                            <h2 className="text-sm font-bold text-slate-900">Smart NID Cards</h2>
                        </div>
                        <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
              Total: {cards.length}
            </span>
                    </div>

                    <div className="flex border-b border-slate-100">
                        <button
                            type="button"
                            onClick={() => setTab('inspect')}
                            className={`flex-1 py-3 text-sm font-bold ${tab === 'inspect' ? 'bg-white text-purple-700' : 'bg-slate-50 text-slate-400'}`}
                        >
                            Inspect NID
                        </button>
                        <button
                            type="button"
                            onClick={() => setTab('issues')}
                            className={`flex-1 py-3 text-sm font-bold ${tab === 'issues' ? 'bg-white text-purple-700' : 'bg-slate-50 text-slate-400'}`}
                        >
                            Issues/Replace
                        </button>
                    </div>

                    {tab === 'issues' ? (
                        <div className="p-6 text-xs text-slate-400">Issues/Replace workflow — not built yet.</div>
                    ) : loading ? (
                        <div className="flex items-center justify-center gap-2 p-6 text-xs text-slate-400">
                            <Loader2 className="h-4 w-4 animate-spin" /> Loading smart NID cards…
                        </div>
                    ) : error ? (
                        <div className="flex items-start gap-2 p-6 text-xs text-red-700">
                            <AlertCircle className="h-4 w-4 shrink-0 stroke-[2.5]" /> {error}
                        </div>
                    ) : cards.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400">No ID cards on file yet.</div>
                    ) : (
                        <div className="max-h-[560px] divide-y divide-slate-100 overflow-y-auto">
                            {cards.map((card) => {
                                const isSelected = panel.type === 'detail' && panel.cardId === card.id;
                                return (
                                    <button
                                        key={card.id}
                                        type="button"
                                        onClick={() => selectCard(card.id)}
                                        className={`flex w-full items-center justify-between gap-3 p-4 text-left ${
                                            isSelected ? 'border-l-4 border-purple-500 bg-purple-50' : 'hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-700">
                                                {initials(card.nameEn)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-bold text-slate-900">{card.nameKh} ({card.nameEn})</p>
                                                <p className="text-[11px] text-slate-500">Card: {card.requestNumber} &nbsp; NID: {card.nid}</p>
                                            </div>
                                        </div>
                                        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                                            isDelivered(card) ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'
                                        }`}>
                      {isDelivered(card) ? 'Delivered' : 'Not Delivered'}
                    </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    <div className="border-t border-slate-100 p-4">
                        <button
                            type="button"
                            onClick={() => { resetCreateForm(); setPanel({ type: 'create' }); }}
                            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-purple-600 py-2.5 text-xs font-bold text-white hover:bg-purple-700"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            New Card Request
                        </button>
                    </div>
                </div>

                {/* RIGHT PANEL */}
                {panel.type === 'empty' && (
                    <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center shadow-sm">
                        <Inbox className="mb-3 h-8 w-8 text-slate-300" />
                        <p className="text-sm font-semibold text-slate-500">No card selected</p>
                        <p className="mt-1 text-xs text-slate-400">Click a card in the list to inspect it,<br />or issue a new one.</p>
                    </div>
                )}

                {panel.type === 'create' && (
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                            <h2 className="text-sm font-bold text-slate-900">New Card Request</h2>
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

                        <div className="mb-4">
                            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Applicant (verified citizen) *</label>
                            <CitizenSearch
                                placeholder="Search Registry name (KH/ENG) or ID Number"
                                selected={createForm.citizen}
                                onSelect={(c) => setCreateForm((f) => ({ ...f, citizen: c }))}
                                ringClass="focus:ring-purple-400"
                            />
                        </div>

                        <div className="mb-6">
                            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Card Type *</label>
                            <select
                                value={createForm.cardType}
                                onChange={(e) => setCreateForm((f) => ({ ...f, cardType: e.target.value as CardType }))}
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
                            >
                                {cardTypeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>

                        <div className="mb-4">
                            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Card Serial Number</label>
                            <input
                                type="text"
                                value={createForm.serial}
                                onChange={(e) => setCreateForm((f) => ({ ...f, serial: e.target.value }))}
                                placeholder="Auto-generated if left blank"
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
                            />
                        </div>

                        <div className="mb-4 grid grid-cols-2 gap-4">
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Issue Date *</label>
                                <input
                                    type="date"
                                    value={createForm.issueDate}
                                    onChange={(e) => setCreateForm((f) => ({ ...f, issueDate: e.target.value }))}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Expiry Date *</label>
                                <input
                                    type="date"
                                    value={createForm.expiryDate}
                                    onChange={(e) => setCreateForm((f) => ({ ...f, expiryDate: e.target.value }))}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
                                />
                            </div>
                        </div>

                        <div className="mb-4 grid grid-cols-2 gap-4">
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Status *</label>
                                <select
                                    value={createForm.status}
                                    onChange={(e) => setCreateForm((f) => ({ ...f, status: e.target.value as CardStatus }))}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
                                >
                                    {cardStatusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Biometric Ref (UUID)</label>
                                <input
                                    type="text"
                                    value={createForm.biometricRef}
                                    onChange={(e) => setCreateForm((f) => ({ ...f, biometricRef: e.target.value }))}
                                    placeholder="Optional"
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
                                />
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Card Holder Photo</label>
                            <div className="flex items-center gap-4">
                                <div className="flex h-24 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100 text-slate-400">
                                    {photoPreview ? (
                                        <img src={photoPreview} alt="Selected" className="h-full w-full object-cover" />
                                    ) : (
                                        <UserRound className="h-8 w-8" />
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                                        <ImagePlus className="h-3.5 w-3.5" />
                                        {createForm.photo ? 'Change Photo' : 'Upload Photo'}
                                        <input type="file" accept="image/*" onChange={onPhotoChange} className="hidden" />
                                    </label>
                                    <p className="text-[10px] text-slate-400">JPG or PNG, up to 4 MB. Optional.</p>
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleIssueCard}
                            disabled={busy || !createForm.citizen}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 py-2.5 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-60"
                        >
                            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                            Issue New NID Card
                        </button>
                    </div>
                )}

                {panel.type === 'detail' && selected && (
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-start justify-between mb-5">
                            <div className="flex items-start gap-2">
                                <ShieldCheck className="mt-0.5 h-5 w-5 text-purple-600" />
                                <div>
                                    <p className="text-base font-bold text-slate-900">Card File: {selected.cardNumber}</p>
                                    <p className="text-xs text-slate-500">
                                        National Smart Registration &nbsp;
                                        <span className="text-slate-400">Status:</span>{' '}
                                        <span className={`font-semibold ${selected.status === 'Active' ? 'text-emerald-600' : selected.status === 'Suspended' ? 'text-amber-600' : 'text-red-600'}`}>
                      {selected.status}
                    </span>
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setFlipped((f) => !f)}
                                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                <Eye className="h-3.5 w-3.5" />
                                {flipped ? 'Flip to Front' : 'Flip to Back'}
                            </button>
                        </div>

                        <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
                            {!flipped ? (
                                <div className="mx-auto max-w-md rounded-lg border border-slate-300 bg-[#f3ead9] p-4 font-mono text-[10px] leading-tight text-slate-800 shadow-sm">
                                    <div className="mb-2 flex items-center justify-between">
                                        <span className="font-sans text-[9px] font-bold tracking-widest text-slate-500">KINGDOM OF CAMBODIA</span>
                                        <span className="font-sans text-[9px] text-slate-400">{selected.cardNumber}</span>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="flex h-20 w-16 shrink-0 items-center justify-center overflow-hidden rounded bg-slate-200 text-slate-400">
                                            {detailPhoto ? (
                                                <img src={detailPhoto} alt="Card holder" className="h-full w-full object-cover" />
                                            ) : (
                                                <UserRound className="h-8 w-8" />
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-1 font-sans text-[10px] text-slate-700">
                                            <p><span className="font-semibold text-slate-500">Name:</span> {selected.nameKh || '—'} ({selected.nameEn})</p>
                                            <p><span className="font-semibold text-slate-500">NID:</span> {selected.nid}</p>
                                            <p><span className="font-semibold text-slate-500">DOB:</span> {selected.dob ? formatDate(selected.dob) : '—'} &nbsp; <span className="font-semibold text-slate-500">Sex:</span> {selected.sex}</p>
                                            <p><span className="font-semibold text-slate-500">Address:</span> {selected.address || '—'}</p>
                                            <p><span className="font-semibold text-slate-500">Expires:</span> {selected.expiresOn ? formatDate(selected.expiresOn) : '—'}</p>
                                        </div>
                                    </div>
                                    <div className="mt-3 border-t border-slate-300 pt-2 text-[9px] tracking-widest text-slate-600">
                                        <p>IDKHM{selected.nid}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</p>
                                        <p>{selected.sex}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="mx-auto max-w-md rounded-lg border border-slate-300 bg-[#f3ead9] p-4 font-sans text-[10px] text-slate-700 shadow-sm">
                                    <p className="mb-3 font-semibold text-slate-500">Issuing Authority</p>
                                    <p className="mb-4">General Department of Identification, Ministry of Interior</p>
                                    <div className="mb-3 flex h-10 items-end gap-[2px]">
                                        {Array.from({ length: 40 }).map((_, i) => (
                                            <span key={i} className="w-[2px] bg-slate-800" style={{ height: `${8 + ((i * 7) % 24)}px` }} />
                                        ))}
                                    </div>
                                    <p className="text-[9px] text-slate-400">This is a placeholder back face — not a real security barcode.</p>
                                </div>
                            )}
                        </div>

                        <p className="mb-2 text-[10px] font-bold tracking-wide text-slate-500">SMART CARD PHYSICAL PRINTING LOGISTICS PIPELINE</p>
                        <div className="mb-5 grid grid-cols-4 gap-2">
                            {pipelineStages.map((stage) => (
                                <button
                                    key={stage}
                                    type="button"
                                    onClick={() => setStage(selected.id, stage)}
                                    className={`rounded-lg border py-2 text-[11px] font-semibold ${
                                        selected.pipelineStage === stage
                                            ? 'border-slate-900 bg-slate-900 text-white'
                                            : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                                    }`}
                                >
                                    {stage}
                                </button>
                            ))}
                        </div>

                        <p className="mb-2 text-[10px] font-bold tracking-wide text-slate-500">MANAGE NID STATUS</p>
                        {actionError && (
                            <div className="mb-2 flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0 stroke-[2.5]" /> {actionError}
                            </div>
                        )}
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setStatus(selected.id, 'Active')}
                                className={`rounded-lg border px-4 py-2 text-xs font-bold ${selected.status === 'Active' ? statusPillClass('Active') : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                            >
                                Set Active
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatus(selected.id, 'Suspended')}
                                className={`rounded-lg border px-4 py-2 text-xs font-bold ${selected.status === 'Suspended' ? statusPillClass('Suspended') : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                            >
                                Set Suspended
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatus(selected.id, 'Disabled')}
                                className={`rounded-lg border px-4 py-2 text-xs font-bold ${selected.status === 'Disabled' ? statusPillClass('Disabled') : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                            >
                                Set Disabled
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}