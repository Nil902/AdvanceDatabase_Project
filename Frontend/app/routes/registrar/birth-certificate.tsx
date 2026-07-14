import React, { useEffect, useState } from 'react';
import {
  Search,
  UserPlus,
  FileText,
  Download,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { api, ApiError, getStoredUser, type Paginated } from '~/lib/api';
import { CitizenSearch, type CitizenOption } from '~/components/CitizenSearch';

interface BirthRecord {
  id: string;
  khmerName: string;
  englishName: string;
  nid: string;
  status: 'Born Registered' | 'No Birth Cert.';
  gender: 'Male' | 'Female';
  civilStatusCode: string;
  dateOfBirth: string;
  placeOfBirth: string;
  fatherName: string;
  motherName: string;
  birthCertNo: string;
  registryBookRef: string;
  avatar: string;
}

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100';

// ── API response shapes (BirthCertificateController@index → BirthCertificateResource) ──
// index() eager-loads only `citizen` and `officer` — parents / birth place are
// NOT in the list payload, so those detail fields fall back to "—".
interface ApiCitizen {
  id: number;
  national_id_number: string | null;
  full_name_kh: string | null;
  full_name_en: string | null;
  gender: string | null;
  date_of_birth: string | null;
  birth_place?: { province_name?: string | null } | null;
}
interface ApiBirthCertificate {
  id: number;
  certificate_number: string;
  status: string;
  issue_date: string | null;
  registered_date: string | null;
  citizen?: ApiCitizen | null;
  mother?: ApiCitizen | null;
  father?: ApiCitizen | null;
}

// Map a Laravel BirthCertificateResource onto the UI's BirthRecord shape.
function toBirthRecord(c: ApiBirthCertificate): BirthRecord {
  const cz = c.citizen ?? null;
  return {
    id: String(c.id),
    khmerName: cz?.full_name_kh ?? '—',
    englishName: cz?.full_name_en ?? '—',
    nid: cz?.national_id_number ?? '—',
    status: c.status === 'cancelled' ? 'No Birth Cert.' : 'Born Registered',
    gender: /^f/i.test(cz?.gender ?? '') ? 'Female' : 'Male',
    civilStatusCode: cz ? `CIV - ${cz.id}` : '—',
    dateOfBirth: cz?.date_of_birth ?? '—',
    placeOfBirth: cz?.birth_place?.province_name ?? '—',
    fatherName: c.father?.full_name_en ?? '—',
    motherName: c.mother?.full_name_en ?? '—',
    birthCertNo: c.certificate_number,
    registryBookRef: c.registered_date ? `Reg. ${c.registered_date}` : '—',
    avatar: DEFAULT_AVATAR,
  };
}

// Logged-in user stored at login (SystemUserResource).
interface StoredUser {
  full_name_en: string | null;
  full_name_kh: string | null;
  username: string;
}

export default function BirthCertificatePage() {
  const [records, setRecords] = useState<BirthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showDownloadToast, setShowDownloadToast] = useState(false);

  // Register-certificate form: the child + parents are resolved to existing
  // citizens (POST /birth-certificates links a citizen_id, it does not create one).
  const [formChild, setFormChild] = useState<CitizenOption | null>(null);
  const [formMother, setFormMother] = useState<CitizenOption | null>(null);
  const [formFather, setFormFather] = useState<CitizenOption | null>(null);
  const [formCertNumber, setFormCertNumber] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [registrarName, setRegistrarName] = useState('Registrar');

  // GET /birth-certificates (paginated). Client-side search covers the loaded page.
  async function loadRecords(): Promise<BirthRecord[]> {
    const res = await api.get<Paginated<ApiBirthCertificate>>('/birth-certificates', { per_page: 100 });
    const mapped = res.data.map(toBirthRecord);
    setRecords(mapped);
    return mapped;
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await loadRecords();
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load birth certificates.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Registrar identity from the logged-in session (client-only; set post-mount).
  useEffect(() => {
    const u = getStoredUser<StoredUser>();
    if (u) setRegistrarName(u.full_name_en || u.full_name_kh || u.username || 'Registrar');
  }, []);

  const filteredRecords = records.filter((r) =>
    r.englishName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.khmerName.includes(searchTerm) ||
    r.nid.includes(searchTerm)
  );

  const selectedRecord = records.find((r) => r.id === selectedId) ?? null;

  const handleSelectCitizen = (id: string) => {
    setSelectedId(id);
    setShowRegisterForm(false);
  };

  const handleOpenRegisterForm = () => {
    setFormChild(null);
    setFormMother(null);
    setFormFather(null);
    setFormCertNumber(`BC-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`);
    setActionError(null);
    setSelectedId(null);
    setShowRegisterForm(true);
  };

  // POST /birth-certificates — link an existing citizen (child) + optional parents.
  const handleFinalizeRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    if (!formChild) {
      setActionError('Select the child — a registered citizen.');
      return;
    }
    if (!formCertNumber.trim()) {
      setActionError('Enter a certificate number.');
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    setBusy(true);
    try {
      await api.post('/birth-certificates', {
        citizen_id: formChild.id,
        mother_citizen_id: formMother?.id ?? null,
        father_citizen_id: formFather?.id ?? null,
        certificate_number: formCertNumber.trim(),
        issue_date: today,
        registered_date: today,
      });
      const list = await loadRecords();
      setShowRegisterForm(false);
      const created = list.find((r) => r.birthCertNo === formCertNumber.trim());
      if (created) setSelectedId(created.id);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to register birth certificate.');
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadPdf = () => {
    window.print();
    setShowDownloadToast(true);
    setTimeout(() => setShowDownloadToast(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Civil Registry & Birth Certificates</h1>
        <p className="text-xs text-slate-500 mt-1">Management of name births, name indices, and document stamping.</p>
      </div>

      <div className="grid grid-cols-2 gap-6 items-start">

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Civil Registry List</h2>
            </div>
            <button
              type="button"
              onClick={handleOpenRegisterForm}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-blue-700"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Register Newborn
            </button>
          </div>

          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search Registry name (KH/ENG) or ID Number"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
              />
            </div>
          </div>

          <div className="max-h-[520px] overflow-y-auto divide-y divide-slate-100">
            {loading && (
              <p className="flex items-center justify-center gap-2 p-6 text-xs text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading civil registry…
              </p>
            )}
            {error && !loading && (
              <p className="flex items-start gap-2 p-6 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 stroke-[2.5]" /> {error}
              </p>
            )}
            {!loading && !error && filteredRecords.length === 0 && (
              <p className="p-6 text-center text-xs text-slate-400">No matching records.</p>
            )}
            {!loading && !error && filteredRecords.map((record) => (
              <button
                key={record.id}
                type="button"
                onClick={() => handleSelectCitizen(record.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${
                  selectedId === record.id ? 'bg-blue-50' : 'hover:bg-slate-50'
                }`}
              >
                <img src={record.avatar} alt={record.englishName} className="h-9 w-9 rounded-full object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{record.khmerName} <span className="font-medium text-slate-500">({record.englishName})</span></p>
                  <p className="text-[10px] text-slate-400">NID: {record.nid}</p>
                </div>
                <span className={`shrink-0 rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                  record.status === 'Born Registered' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  {record.status}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm min-h-[400px]">
          {showRegisterForm ? (
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Register Birth Certificate</h2>
                  <p className="text-[11px] text-slate-400">Authorized Official Registrar: {registrarName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRegisterForm(false)}
                  className="text-[11px] font-semibold text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
              </div>

              {actionError && (
                <div className="mb-4 flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 stroke-[2.5]" /> {actionError}
                </div>
              )}

              <form onSubmit={handleFinalizeRegistration} className="space-y-4">
                <Field label="Child (registered citizen)" required>
                  <CitizenSearch
                    placeholder="Search citizen by name (KH/ENG) or NID"
                    selected={formChild}
                    onSelect={setFormChild}
                    ringClass="focus:ring-blue-400"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Mother (optional)">
                    <CitizenSearch
                      placeholder="Search mother"
                      selected={formMother}
                      onSelect={setFormMother}
                      ringClass="focus:ring-blue-400"
                    />
                  </Field>
                  <Field label="Father (optional)">
                    <CitizenSearch
                      placeholder="Search father"
                      selected={formFather}
                      onSelect={setFormFather}
                      ringClass="focus:ring-blue-400"
                    />
                  </Field>
                </div>

                <Field label="Certificate Number" required>
                  <input
                    type="text"
                    required
                    value={formCertNumber}
                    onChange={(e) => setFormCertNumber(e.target.value)}
                    placeholder="e.g. BC-2026-0091"
                    className="input-field"
                  />
                </Field>

                <button
                  type="submit"
                  disabled={busy || !formChild}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                  Register Birth Certificate
                </button>
              </form>
            </div>
          ) : selectedRecord ? (
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={selectedRecord.avatar} alt={selectedRecord.englishName} className="h-12 w-12 rounded-full object-cover" />
                  <div>
                    <p className="text-sm font-bold text-slate-900">{selectedRecord.khmerName} <span className="font-medium text-slate-500">({selectedRecord.englishName})</span></p>
                    <p className="text-[11px] text-slate-400">National Registration Number: {selectedRecord.nid}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReport(true)}
                  disabled={selectedRecord.status === 'No Birth Cert.'}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Download className="h-3 w-3" />
                  Export PDF Report
                </button>
              </div>

              <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-xs">
                <DetailField label="Civil Status Code" value={selectedRecord.civilStatusCode} />
                <DetailField label="Gender" value={selectedRecord.gender} />
                <DetailField label="Date of Birth" value={selectedRecord.dateOfBirth} />
                <DetailField label="Place of Birth" value={selectedRecord.placeOfBirth} />
                <DetailField label="Father's Name" value={selectedRecord.fatherName} />
                <DetailField label="Mother's Name" value={selectedRecord.motherName} />
                <DetailField label="Birth Certification No." value={selectedRecord.birthCertNo} />
                <DetailField label="Registry Book Reference" value={selectedRecord.registryBookRef} />
              </div>

              {selectedRecord.status === 'No Birth Cert.' && (
                <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  This citizen has no birth certificate on file. A certificate must be issued before a PDF report can be exported.
                </p>
              )}
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center px-8">
              <FileText className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-700">No Citizen Selected</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Select an existing resident on the left side to review or print official civil Birth Certificate, or click <span className="font-semibold text-slate-500">Register Newborn</span> to create a new registration record.
              </p>
            </div>
          )}
        </div>
      </div>

      {showReport && selectedRecord && (
        <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-6 print:static print:bg-white print:p-0">
          <style>{`
            @media print {
              body * { visibility: hidden; }
              #birth-cert-print-area, #birth-cert-print-area * { visibility: visible; }
              #birth-cert-print-area { position: absolute; inset: 0; width: 100%; }
              .no-print { display: none !important; }
            }
          `}</style>

          <div className="no-print fixed top-6 right-6 z-50 flex gap-2">
            <button
              type="button"
              onClick={() => setShowReport(false)}
              className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-red-700"
            >
              Close the Report
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-4 py-2 text-xs font-bold text-white shadow hover:bg-slate-800"
            >
              <Download className="h-3.5 w-3.5" />
              Download PDF
            </button>
          </div>

          <div id="birth-cert-print-area" className="w-full max-w-3xl rounded-xl bg-white p-10 shadow-2xl my-4 print:shadow-none print:rounded-none print:my-0 text-[13px] text-slate-800">
            <div className="text-center mb-6">
              <p className="font-bold">KINGDOM OF CAMBODIA</p>
              <p className="font-bold tracking-wide">NATION RELIGION KING</p>
              <p className="mt-1">of of of</p>
            </div>

            <h2 className="text-center font-bold underline mb-6">EXTRACT OF BIRTH CERTIFICATE</h2>

            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <p className="text-slate-500 text-xs mb-1">Extract of the birth certificate from</p>
                <p className="font-bold">Book of birth Certificate No. {selectedRecord.registryBookRef.replace('Book #', '')}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-1">Birth certificate No.</p>
                <p className="font-bold">{selectedRecord.birthCertNo}</p>
              </div>
            </div>

            <table className="w-full text-sm mb-4">
              <tbody>
                <tr className="border-t border-slate-200">
                  <td className="py-2 pr-4 text-slate-500 w-1/2">Surname</td>
                  <td className="py-2 font-bold uppercase">{selectedRecord.englishName.split(' ')[0]}</td>
                </tr>
                <tr className="border-t border-slate-200">
                  <td className="py-2 pr-4 text-slate-500">Given name</td>
                  <td className="py-2 font-bold uppercase">{selectedRecord.englishName.split(' ').slice(1).join(' ') || '—'}</td>
                </tr>
                <tr className="border-t border-slate-200">
                  <td className="py-2 pr-4 text-slate-500">Gender</td>
                  <td className="py-2">{selectedRecord.gender}</td>
                </tr>
                <tr className="border-t border-slate-200">
                  <td className="py-2 pr-4 text-slate-500">Nationality</td>
                  <td className="py-2">Khmer</td>
                </tr>
                <tr className="border-t border-slate-200">
                  <td className="py-2 pr-4 text-slate-500">Date of Birth</td>
                  <td className="py-2">{selectedRecord.dateOfBirth}</td>
                </tr>
                <tr className="border-t border-slate-200">
                  <td className="py-2 pr-4 text-slate-500 align-top">Place of birth</td>
                  <td className="py-2">{selectedRecord.placeOfBirth}, Cambodia</td>
                </tr>
              </tbody>
            </table>

            <p className="font-bold mb-2">About parents</p>
            <table className="w-full text-sm mb-6">
              <thead>
                <tr className="text-left text-slate-500 text-xs">
                  <th className="pb-1 font-normal">Father</th>
                  <th className="pb-1 font-normal">Mother</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-slate-200">
                  <td className="py-2 font-bold uppercase">{selectedRecord.fatherName}</td>
                  <td className="py-2 font-bold uppercase">{selectedRecord.motherName}</td>
                </tr>
                <tr className="border-t border-slate-200 text-xs text-slate-500">
                  <td className="py-2">Nationality: Khmer</td>
                  <td className="py-2">Nationality: Khmer</td>
                </tr>
              </tbody>
            </table>

            <div className="text-xs text-slate-500 space-y-1 border-t border-slate-200 pt-4">
              <p>We, Registrar of {selectedRecord.placeOfBirth} District, have seen and certified that the right signature is genuine signature of the registrar.</p>
              <p>Registrar: <span className="font-semibold text-slate-700">{registrarName}</span></p>
              <p>This document is an official sample extract generated from NIMS civil registry data.</p>
            </div>
          </div>
        </div>
      )}

      {showDownloadToast && (
        <div className="no-print fixed top-6 right-6 z-50 flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-xs font-bold text-white shadow-xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          Downloaded Successfully
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
      <p className="font-bold text-slate-800">{value}</p>
    </div>
  );
}