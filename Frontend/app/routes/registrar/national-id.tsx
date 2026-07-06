import React, { useState } from 'react';
import {
    CreditCard, ShieldCheck, Eye, Inbox, Plus, Search, ArrowLeft, UserRound,
} from 'lucide-react';

type PipelineStage = 'Pending Admin' | 'Smart Print Active' | 'Dispatched Province' | 'Delivered Station';
type NidStatus = 'Active' | 'Suspended' | 'Disabled';

interface NidCard {
    id: string;
    cardNumber: string;    // NID-CARD-xxxx
    requestNumber: string; // ID-REQ-xxxx
    nid: string;
    nameKh: string;
    nameEn: string;
    dob: string;   // ISO
    sex: 'M' | 'F';
    address: string;
    expiresOn: string; // ISO
    delivered: boolean;
    status: NidStatus;
    pipelineStage: PipelineStage;
}

const pipelineStages: PipelineStage[] = ['Pending Admin', 'Smart Print Active', 'Dispatched Province', 'Delivered Station'];

// TODO: replace with GET /api/v1/nid-cards. `delivered` and `pipelineStage` are
// two separate booleans/enums tracking the same underlying fact — a card that's
// "Delivered Station" but delivered:false (or vice versa) is a state you can hit
// if these aren't kept in sync server-side. Consider making delivered derived
// from pipelineStage === 'Delivered Station' instead of storing both.
const initialCards: NidCard[] = [
    { id: '1', cardNumber: 'NID-CARD-2044', requestNumber: 'ID-REQ-5510', nid: '120034506', nameKh: 'សុខ ណារិទ្ធ', nameEn: 'Sok Narith', dob: '1993-11-06', sex: 'M', address: 'Phum 1, Tonle Bassac, Chamkar Mon, Phnom Penh', expiresOn: '2034-11-06', delivered: true, status: 'Active', pipelineStage: 'Smart Print Active' },
    { id: '2', cardNumber: 'NID-CARD-2045', requestNumber: 'ID-REQ-5511', nid: '120034507', nameKh: 'ជា សុភា', nameEn: 'Chea Sophea', dob: '1995-03-14', sex: 'F', address: 'Phum 1, Tonle Bassac, Chamkar Mon, Phnom Penh', expiresOn: '2034-03-14', delivered: false, status: 'Active', pipelineStage: 'Dispatched Province' },
    { id: '3', cardNumber: 'NID-CARD-2046', requestNumber: 'ID-REQ-5512', nid: '120034508', nameKh: 'ចាន់ បូរី', nameEn: 'Chan Borey', dob: '2001-07-22', sex: 'M', address: 'Phum 1, Tonle Bassac, Chamkar Mon, Phnom Penh', expiresOn: '2034-07-22', delivered: true, status: 'Active', pipelineStage: 'Delivered Station' },
    { id: '4', cardNumber: 'NID-CARD-2047', requestNumber: 'ID-REQ-5513', nid: '120034509', nameKh: 'លី សុវណ្ណា', nameEn: 'Ly Sovanna', dob: '1988-01-30', sex: 'F', address: 'Phum 2, Tonle Bassac, Chamkar Mon, Phnom Penh', expiresOn: '2034-01-30', delivered: true, status: 'Suspended', pipelineStage: 'Delivered Station' },
    { id: '5', cardNumber: 'NID-CARD-2048', requestNumber: 'ID-REQ-5514', nid: '120034510', nameKh: 'ហេង សុភាព', nameEn: 'Heng Sopheap', dob: '1999-09-09', sex: 'M', address: 'Phum 1, Chrang Chamreh I, Russey Keo, Phnom Penh', expiresOn: '2034-09-09', delivered: true, status: 'Active', pipelineStage: 'Delivered Station' },
    { id: '6', cardNumber: 'NID-CARD-2049', requestNumber: 'ID-REQ-5515', nid: '120034511', nameKh: 'នួន សុជាតា', nameEn: 'Nuon Sochheata', dob: '1996-12-18', sex: 'F', address: 'Phum 1, Chrang Chamreh I, Russey Keo, Phnom Penh', expiresOn: '2034-12-18', delivered: true, status: 'Active', pipelineStage: 'Delivered Station' },
    { id: '7', cardNumber: 'NID-CARD-2050', requestNumber: 'ID-REQ-5516', nid: '120034512', nameKh: 'កឹម ពិសិដ្ឋ', nameEn: 'Kim Piseth', dob: '1990-05-02', sex: 'M', address: 'Phum 1, Tonle Bassac, Chamkar Mon, Phnom Penh', expiresOn: '2034-05-02', delivered: true, status: 'Active', pipelineStage: 'Delivered Station' },
    { id: '8', cardNumber: 'NID-CARD-2051', requestNumber: 'ID-REQ-5517', nid: '120034513', nameKh: 'សុខ ចាន់ថា', nameEn: 'Sok Chanthy', dob: '1994-08-25', sex: 'F', address: 'Phum 1, Boeung Keng Kang, Chamkar Mon, Phnom Penh', expiresOn: '2034-08-25', delivered: true, status: 'Disabled', pipelineStage: 'Delivered Station' },
];

// TODO: pull from session
const currentRegistrar = 'Sok Cheat';

type Tab = 'inspect' | 'issues';
type Panel = { type: 'empty' } | { type: 'create' } | { type: 'detail'; cardId: string };

interface CreateForm {
    applicant: string;
    nid: string;
}
const emptyCreateForm: CreateForm = { applicant: '', nid: '' };

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
    const [cards, setCards] = useState<NidCard[]>(initialCards);
    const [panel, setPanel] = useState<Panel>({ type: 'empty' });
    const [tab, setTab] = useState<Tab>('inspect');
    const [flipped, setFlipped] = useState(false);
    const [createForm, setCreateForm] = useState<CreateForm>(emptyCreateForm);

    const selected = panel.type === 'detail' ? cards.find((c) => c.id === panel.cardId) ?? null : null;

    function selectCard(id: string) {
        setFlipped(false);
        setPanel({ type: 'detail', cardId: id });
    }

    function setStage(cardId: string, stage: PipelineStage) {
        setCards((prev) => prev.map((c) => (
            c.id === cardId ? { ...c, pipelineStage: stage, delivered: stage === 'Delivered Station' } : c
        )));
    }

    function setStatus(cardId: string, status: NidStatus) {
        setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, status } : c)));
    }

    function handleIssueCard() {
        // TODO: real flow is POST /api/v1/nid-cards after resolving `applicant` to a
        // verified citizen record. This just fabricates one client-side.
        if (!createForm.applicant.trim()) return;
        const n = cards.length + 1;
        const newCard: NidCard = {
            id: crypto.randomUUID(),
            cardNumber: `NID-CARD-${2043 + n}`,
            requestNumber: `ID-REQ-${5509 + n}`,
            nid: createForm.nid.trim() || 'PENDING',
            nameKh: '',
            nameEn: createForm.applicant.trim(),
            dob: '',
            sex: 'M',
            address: '',
            expiresOn: '',
            delivered: false,
            status: 'Active',
            pipelineStage: 'Pending Admin',
        };
        setCards((prev) => [newCard, ...prev]);
        setCreateForm(emptyCreateForm);
        selectCard(newCard.id);
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
                                            card.delivered ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'
                                        }`}>
                      {card.delivered ? 'Delivered' : 'Not Delivered'}
                    </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    <div className="border-t border-slate-100 p-4">
                        <button
                            type="button"
                            onClick={() => { setCreateForm(emptyCreateForm); setPanel({ type: 'create' }); }}
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
                        <p className="text-[11px] text-slate-500 mb-5">Authorized Official Registrar: {currentRegistrar}</p>

                        <div className="mb-4">
                            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Applicant *</label>
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={createForm.applicant}
                                    onChange={(e) => setCreateForm((f) => ({ ...f, applicant: e.target.value }))}
                                    placeholder="Search Registry name (KH/ENG) or ID Number"
                                    className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                                />
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="mb-1.5 block text-xs font-semibold text-slate-700">NID Number (leave blank to auto-assign)</label>
                            <input
                                type="text"
                                value={createForm.nid}
                                onChange={(e) => setCreateForm((f) => ({ ...f, nid: e.target.value }))}
                                placeholder="e.g. 120034514"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={handleIssueCard}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 py-2.5 text-xs font-bold text-white hover:bg-purple-700"
                        >
                            <ShieldCheck className="h-3.5 w-3.5" />
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
                                        <div className="flex h-20 w-16 shrink-0 items-center justify-center rounded bg-slate-200 text-slate-400">
                                            <UserRound className="h-8 w-8" />
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