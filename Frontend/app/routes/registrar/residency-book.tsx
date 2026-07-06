import React, { useState } from 'react';
import {
    BookOpen, Plus, MapPin, Search, ArrowLeft, Upload, CheckCircle2,
    UserPlus, ArrowLeftRight, Trash2, Inbox,
} from 'lucide-react';

interface HouseholdMember {
    id: string;
    nameKh: string;
    nameEn: string;
    nid: string;
    relationship: string;
    isHead: boolean;
}

interface ResidencyBook {
    id: string;
    bookNumber: string;
    village: string;
    commune: string;
    province: string;
    registeredOn: string; // ISO date
    civilAddress: string;
    members: HouseholdMember[];
}

interface GeoOption {
    value: string;
    label: string;
}

// TODO: replace with real data from Laravel API — GET /api/v1/residency-books
// memberCount is intentionally NOT stored here — it's derived from members.length
// wherever it's displayed. Storing it separately is how you get a ledger that says
// "3 Members" after someone's been deleted or relocated out.
const initialBooks: ResidencyBook[] = [
    {
        id: '1',
        bookNumber: 'HH-1001',
        village: 'Phum 1',
        commune: 'Tonle Bassac',
        province: 'Phnom Penh',
        registeredOn: '2018-05-20',
        civilAddress: '#12, Street 308, Phum 1, Tonle Bassac Commune, Chamkar Mon District, Phnom Penh',
        members: [
            { id: 'm1', nameKh: 'សុខ ណារិទ្ធ', nameEn: 'Sok Narith', nid: '010 582 914', relationship: 'Husband', isHead: true },
            { id: 'm2', nameKh: 'ជា សុភា', nameEn: 'Chea Sophea', nid: '010 582 915', relationship: 'Wife', isHead: false },
            { id: 'm3', nameKh: 'ចាន់ បូរី', nameEn: 'Chan Borey', nid: '010 582 916', relationship: 'Child', isHead: false },
        ],
    },
    {
        id: '2',
        bookNumber: 'HH-1002',
        village: 'Phum 1',
        commune: 'Tonle Bassac',
        province: 'Phnom Penh',
        registeredOn: '2019-02-11',
        civilAddress: '#14, Street 308, Phum 1, Tonle Bassac Commune, Chamkar Mon District, Phnom Penh',
        members: [
            { id: 'm4', nameKh: 'កឹម ពិសិដ្ឋ', nameEn: 'Kim Piseth', nid: '010 582 920', relationship: 'Head', isHead: true },
            { id: 'm5', nameKh: 'លី សុវណ្ណា', nameEn: 'Ly Sovanna', nid: '010 582 921', relationship: 'Wife', isHead: false },
        ],
    },
    {
        id: '3',
        bookNumber: 'HH-1003',
        village: 'Phum 1',
        commune: 'Tonle Bassac',
        province: 'Phnom Penh',
        registeredOn: '2020-09-03',
        civilAddress: '#16, Street 308, Phum 1, Tonle Bassac Commune, Chamkar Mon District, Phnom Penh',
        members: [
            { id: 'm6', nameKh: 'កឹម ពិសិដ្ឋ', nameEn: 'Kim Piseth', nid: '010 582 930', relationship: 'Head', isHead: true },
            { id: 'm7', nameKh: 'ហេង សុភាព', nameEn: 'Heng Sopheap', nid: '010 582 931', relationship: 'Sibling', isHead: false },
            { id: 'm8', nameKh: 'នួន សុជាតា', nameEn: 'Nuon Sochheata', nid: '010 582 932', relationship: 'Child', isHead: false },
        ],
    },
];

// TODO: replace with real cascading geo data — GET /api/v1/geo/provinces etc.
const geoData: Record<string, Record<string, Record<string, GeoOption[]>>> = {
    'Phnom Penh': {
        'Chamkar Mon': {
            'Tonle Bassac': [{ value: 'phum-1', label: 'Phum 1' }, { value: 'phum-2', label: 'Phum 2' }],
            'Boeung Keng Kang': [{ value: 'phum-1', label: 'Phum 1' }],
        },
        'Russey Keo': {
            'Chrang Chamreh I': [{ value: 'phum-1', label: 'Phum 1' }],
        },
    },
};

const provinceOptions: GeoOption[] = Object.keys(geoData).map((p) => ({ value: p, label: p }));
const relationshipOptions = ['Spouse', 'Child', 'Parent', 'Sibling', 'Other'];

// TODO: pull from logged-in registrar session instead of hardcoding
const currentRegistrar = 'Sok Cheat';

type PanelMode =
    | { type: 'empty' }
    | { type: 'create' }
    | { type: 'detail'; bookId: string };

interface CreateForm {
    province: string;
    district: string;
    commune: string;
    village: string;
    streetAddress: string;
    headOfHousehold: string;
}

const emptyCreateForm: CreateForm = {
    province: '', district: '', commune: '', village: '', streetAddress: '', headOfHousehold: '',
};

function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US');
}

function initials(nameEn: string): string {
    const parts = nameEn.trim().split(/\s+/);
    return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

export default function ResidencyBookPage() {
    const [books, setBooks] = useState<ResidencyBook[]>(initialBooks);
    const [panel, setPanel] = useState<PanelMode>({ type: 'empty' });
    const [createForm, setCreateForm] = useState<CreateForm>(emptyCreateForm);
    const [showToast, setShowToast] = useState<string | null>(null);

    const [enrollQuery, setEnrollQuery] = useState('');
    const [enrollRelationship, setEnrollRelationship] = useState(relationshipOptions[0]);
    const [transferMemberId, setTransferMemberId] = useState('');
    const [transferTargetId, setTransferTargetId] = useState('');
    const [transferReason, setTransferReason] = useState('');

    function fireToast(message: string) {
        setShowToast(message);
        setTimeout(() => setShowToast(null), 2500);
    }

    // ---------- create-book form ----------
    const districtOptions: GeoOption[] = createForm.province
        ? Object.keys(geoData[createForm.province] ?? {}).map((d) => ({ value: d, label: d }))
        : [];
    const communeOptions: GeoOption[] = createForm.province && createForm.district
        ? Object.keys(geoData[createForm.province]?.[createForm.district] ?? {}).map((c) => ({ value: c, label: c }))
        : [];
    const villageOptions: GeoOption[] = createForm.province && createForm.district && createForm.commune
        ? geoData[createForm.province]?.[createForm.district]?.[createForm.commune] ?? []
        : [];

    function updateCreateField<K extends keyof CreateForm>(key: K, value: CreateForm[K]) {
        setCreateForm((prev) => {
            const next = { ...prev, [key]: value };
            if (key === 'province') { next.district = ''; next.commune = ''; next.village = ''; }
            if (key === 'district') { next.commune = ''; next.village = ''; }
            if (key === 'commune') { next.village = ''; }
            return next;
        });
    }

    function handleIssueBook() {
        // TODO: real validation + POST /api/v1/residency-books. This just no-ops
        // on missing fields instead of surfacing an error — fine for a demo, not for real use.
        if (!createForm.province || !createForm.district || !createForm.commune || !createForm.village || !createForm.headOfHousehold) {
            return;
        }
        const villageLabel = villageOptions.find((v) => v.value === createForm.village)?.label ?? createForm.village;
        const newBook: ResidencyBook = {
            id: crypto.randomUUID(),
            bookNumber: `HH-${1000 + books.length + 1}`,
            village: villageLabel,
            commune: createForm.commune,
            province: createForm.province,
            registeredOn: new Date().toISOString(),
            civilAddress: `${createForm.streetAddress}, ${villageLabel}, ${createForm.commune}, ${createForm.province}`,
            members: [
                { id: crypto.randomUUID(), nameKh: '', nameEn: createForm.headOfHousehold, nid: 'PENDING', relationship: 'Head', isHead: true },
            ],
        };
        setBooks((prev) => [newBook, ...prev]);
        setCreateForm(emptyCreateForm);
        setPanel({ type: 'detail', bookId: newBook.id });
        fireToast('Residency Book Issued');
    }

    // ---------- detail panel actions ----------
    const selectedBook = panel.type === 'detail' ? books.find((b) => b.id === panel.bookId) ?? null : null;

    function handleEnroll() {
        if (!selectedBook || !enrollQuery.trim()) return;
        // TODO: this must resolve enrollQuery to an actual citizen record via the
        // registry (GET /api/v1/citizens?q=) and pull their real NID — accepting
        // freeform text and stamping "PENDING" lets you enroll someone who was
        // never verified.
        const newMember: HouseholdMember = {
            id: crypto.randomUUID(),
            nameKh: '',
            nameEn: enrollQuery.trim(),
            nid: 'PENDING',
            relationship: enrollRelationship,
            isHead: false,
        };
        setBooks((prev) => prev.map((b) => (b.id === selectedBook.id ? { ...b, members: [...b.members, newMember] } : b)));
        setEnrollQuery('');
        fireToast('Resident Enrolled');
    }

    function handleMakeHead(memberId: string) {
        if (!selectedBook) return;
        setBooks((prev) => prev.map((b) => (
            b.id === selectedBook.id
                ? { ...b, members: b.members.map((m) => ({ ...m, isHead: m.id === memberId })) }
                : b
        )));
    }

    function handleDeleteMember(member: HouseholdMember) {
        if (!selectedBook) return;
        if (!window.confirm(`Remove ${member.nameEn} from this residency book?`)) return;
        setBooks((prev) => prev.map((b) => (
            b.id === selectedBook.id ? { ...b, members: b.members.filter((m) => m.id !== member.id) } : b
        )));
    }

    function handleRelocate() {
        if (!selectedBook || !transferMemberId || !transferTargetId.trim()) return;
        const target = books.find((b) => b.bookNumber === transferTargetId.trim());
        if (!target) {
            // TODO: real relocation is a server-side transaction with an audit trail
            // and effective date — not a client array splice. This is a stub.
            window.alert('No residency book found with that ID.');
            return;
        }
        const member = selectedBook.members.find((m) => m.id === transferMemberId);
        if (!member) return;
        setBooks((prev) => prev.map((b) => {
            if (b.id === selectedBook.id) return { ...b, members: b.members.filter((m) => m.id !== member.id) };
            if (b.id === target.id) return { ...b, members: [...b.members, { ...member, isHead: false }] };
            return b;
        }));
        setTransferMemberId('');
        setTransferTargetId('');
        setTransferReason('');
        fireToast('Member Relocated');
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
                            onClick={() => { setCreateForm(emptyCreateForm); setPanel({ type: 'create' }); }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-amber-600"
                        >
                            <Plus className="h-3 w-3" />
                            New Register
                        </button>
                    </div>

                    <div className="space-y-4">
                        {books.map((book) => {
                            const isSelected = panel.type === 'detail' && panel.bookId === book.id;
                            const head = book.members.find((m) => m.isHead);
                            return (
                                <button
                                    key={book.id}
                                    type="button"
                                    onClick={() => setPanel({ type: 'detail', bookId: book.id })}
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
                                            <p className="text-xs font-semibold text-slate-700">Head: {head?.nameKh || head?.nameEn || '—'}</p>
                                            <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                                                <MapPin className="h-3 w-3" />
                                                {book.village}, {book.commune}, {book.province}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
                    {book.members.length} Members
                  </span>
                                </button>
                            );
                        })}
                    </div>
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
                        <p className="text-[11px] text-slate-500 mb-5">Authorized Official Registrar: {currentRegistrar}</p>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <SelectField label="Province (ខេត្ត/ក្រុង)" value={createForm.province} onChange={(v) => updateCreateField('province', v)} options={provinceOptions} placeholder="Select province" />
                            <SelectField label="District (ស្រុក/ខណ្ឌ)" value={createForm.district} onChange={(v) => updateCreateField('district', v)} options={districtOptions} placeholder="Select district" disabled={!createForm.province} />
                            <SelectField label="Commune (ឃុំ/សង្កាត់)" value={createForm.commune} onChange={(v) => updateCreateField('commune', v)} options={communeOptions} placeholder="Select commune" disabled={!createForm.district} />
                            <SelectField label="Village (ភូមិ)" value={createForm.village} onChange={(v) => updateCreateField('village', v)} options={villageOptions} placeholder="Select village" disabled={!createForm.commune} />
                        </div>

                        <div className="mb-4">
                            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Street address/Detail notes *</label>
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
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={createForm.headOfHousehold}
                                    onChange={(e) => updateCreateField('headOfHousehold', e.target.value)}
                                    placeholder="Search Registry name (KH/ENG) or ID Number"
                                    className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                                />
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleIssueBook}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 py-2.5 text-xs font-bold text-white hover:bg-amber-600"
                        >
                            <Upload className="h-3.5 w-3.5" />
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

                        <p className="mb-2 text-[10px] font-bold tracking-wide text-slate-500">REGISTERED HOUSEHOLD MEMBERS</p>
                        <div className="mb-5 divide-y divide-slate-100 rounded-lg border border-slate-100">
                            {selectedBook.members.map((member) => (
                                <div key={member.id} className="flex items-center justify-between gap-3 p-3">
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
                                                    onClick={() => handleMakeHead(member.id)}
                                                    className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-200"
                                                >
                                                    Make Head
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteMember(member)}
                                                    aria-label={`Remove ${member.nameEn}`}
                                                    className="rounded-lg bg-red-50 p-1.5 text-red-600 hover:bg-red-100"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mb-5 rounded-lg border border-slate-100 p-3">
                            <div className="mb-2 flex items-center gap-1.5">
                                <UserPlus className="h-3.5 w-3.5 text-slate-700" />
                                <p className="text-xs font-bold text-slate-900">Enroll Resident into Book</p>
                            </div>
                            <div className="relative mb-2">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={enrollQuery}
                                    onChange={(e) => setEnrollQuery(e.target.value)}
                                    placeholder="Search Registry name (KH/ENG) or ID Number"
                                    className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
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
                                    className="rounded-lg bg-orange-600 px-4 py-2 text-xs font-bold text-white hover:bg-orange-700"
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
                                    {selectedBook.members.map((m) => (
                                        <option key={m.id} value={m.id}>{m.nameEn}</option>
                                    ))}
                                </select>
                                <input
                                    type="text"
                                    value={transferTargetId}
                                    onChange={(e) => setTransferTargetId(e.target.value)}
                                    placeholder="Residency ID"
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
                                    className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-900"
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