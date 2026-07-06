import React, { useState } from 'react';
import {
  Search,
  UserPlus,
  FileText,
  Download,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

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

// TODO: replace with real data fetched from your Laravel API
// e.g. GET /api/v1/birth-certificates
const INITIAL_RECORDS: BirthRecord[] = [
  { id: '1', khmerName: 'សុខ ណារិទ្ធ', englishName: 'Sok Narith', nid: '010 582 914', status: 'Born Registered', gender: 'Male', civilStatusCode: 'CIV - 120034506', dateOfBirth: '1994-04-12', placeOfBirth: 'Siem Reap', fatherName: 'Sok Chey', motherName: 'Meas Sophia', birthCertNo: 'BC - 1994 - 4402', registryBookRef: 'Book #03A', avatar: DEFAULT_AVATAR },
  { id: '2', khmerName: 'ជា សុភា', englishName: 'Chea Sophea', nid: '020 938 415', status: 'Born Registered', gender: 'Female', civilStatusCode: 'CIV - 120034507', dateOfBirth: '1996-02-18', placeOfBirth: 'Phnom Penh', fatherName: 'Chea Vuthy', motherName: 'Sok Pisey', birthCertNo: 'BC - 1996 - 2214', registryBookRef: 'Book #03A', avatar: DEFAULT_AVATAR },
  { id: '3', khmerName: 'ចាន់ បូរី', englishName: 'Chan Borey', nid: '050 392 814', status: 'Born Registered', gender: 'Male', civilStatusCode: 'CIV - 120034508', dateOfBirth: '2018-09-05', placeOfBirth: 'Phnom Penh', fatherName: 'Sok Narith', motherName: 'Chea Sophea', birthCertNo: 'BC - 2018 - 8871', registryBookRef: 'Book #03A', avatar: DEFAULT_AVATAR },
  { id: '4', khmerName: 'គៀវ កល្យាណ', englishName: 'Keo Kalliyan', nid: '080 194 725', status: 'Born Registered', gender: 'Female', civilStatusCode: 'CIV - 120034509', dateOfBirth: '1988-11-30', placeOfBirth: 'Battambang', fatherName: 'Keo Sarin', motherName: 'Nou Chanthy', birthCertNo: 'BC - 1988 - 1190', registryBookRef: 'Book #02B', avatar: DEFAULT_AVATAR },
  { id: '5', khmerName: 'វង្ស ពិសិដ្ឋ', englishName: 'Vong Piseth', nid: '030 748 291', status: 'Born Registered', gender: 'Male', civilStatusCode: 'CIV - 120034510', dateOfBirth: '2000-06-21', placeOfBirth: 'Kandal', fatherName: 'Vong Sok', motherName: 'Ly Sreymom', birthCertNo: 'BC - 2000 - 4402', registryBookRef: 'Book #03A', avatar: DEFAULT_AVATAR },
  { id: '6', khmerName: 'សេង ស្រីនាង', englishName: 'Seng Sreyneang', nid: '090 625 184', status: 'Born Registered', gender: 'Female', civilStatusCode: 'CIV - 120034511', dateOfBirth: '1975-01-14', placeOfBirth: 'Siem Reap', fatherName: 'Seng Vibol', motherName: 'Chin Sopheak', birthCertNo: 'BC - 1975 - 0091', registryBookRef: 'Book #01A', avatar: DEFAULT_AVATAR },
  { id: '7', khmerName: 'គឹម រិទ្ធ', englishName: 'Kim Rith', nid: '040 182 736', status: 'Born Registered', gender: 'Male', civilStatusCode: 'CIV - 120034512', dateOfBirth: '1969-08-08', placeOfBirth: 'Phnom Penh', fatherName: 'Kim Heng', motherName: 'Sok Ny', birthCertNo: 'BC - 1969 - 0042', registryBookRef: 'Book #01A', avatar: DEFAULT_AVATAR },
  { id: '8', khmerName: 'ឈឹម នារី', englishName: 'Chhim Neary', nid: '070 591 823', status: 'No Birth Cert.', gender: 'Female', civilStatusCode: '—', dateOfBirth: '—', placeOfBirth: '—', fatherName: '—', motherName: '—', birthCertNo: '—', registryBookRef: '—', avatar: DEFAULT_AVATAR },
];

// TODO: pull from logged-in registrar's session
const currentRegistrarName = 'Sok Cheat';

export default function BirthCertificatePage() {
  const [records, setRecords] = useState<BirthRecord[]>(INITIAL_RECORDS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showDownloadToast, setShowDownloadToast] = useState(false);

  const [formKhmerName, setFormKhmerName] = useState('');
  const [formEnglishName, setFormEnglishName] = useState('');
  const [formGender, setFormGender] = useState<'Male' | 'Female'>('Male');
  const [formDob, setFormDob] = useState(() => new Date().toISOString().slice(0, 10));
  const [formPlaceOfBirth, setFormPlaceOfBirth] = useState('Phnom Penh');
  const [formOccupation, setFormOccupation] = useState('Child');
  const [formFatherName, setFormFatherName] = useState('');
  const [formMotherName, setFormMotherName] = useState('');

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
    setFormKhmerName('');
    setFormEnglishName('');
    setFormGender('Male');
    setFormDob(new Date().toISOString().slice(0, 10));
    setFormPlaceOfBirth('Phnom Penh');
    setFormOccupation('Child');
    setFormFatherName('');
    setFormMotherName('');
    setSelectedId(null);
    setShowRegisterForm(true);
  };

  const generateNid = () => {
    const rand = () => Math.floor(Math.random() * 900 + 100);
    return `${rand()} ${rand()} ${rand()}`;
  };

  const handleFinalizeRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formKhmerName.trim() || !formEnglishName.trim() || !formFatherName.trim() || !formMotherName.trim()) return;

    const year = formDob.slice(0, 4);
    const newRecord: BirthRecord = {
      id: crypto.randomUUID(),
      khmerName: formKhmerName.trim(),
      englishName: formEnglishName.trim(),
      nid: generateNid(),
      status: 'Born Registered',
      gender: formGender,
      civilStatusCode: `CIV - ${Math.floor(Math.random() * 900000 + 100000)}`,
      dateOfBirth: formDob,
      placeOfBirth: formPlaceOfBirth,
      fatherName: formFatherName.trim(),
      motherName: formMotherName.trim(),
      birthCertNo: `BC - ${year} - ${Math.floor(Math.random() * 9000 + 1000)}`,
      registryBookRef: 'Book #03A',
      avatar: DEFAULT_AVATAR,
    };

    setRecords((prev) => [newRecord, ...prev]);
    setShowRegisterForm(false);
    setSelectedId(newRecord.id);
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
            {filteredRecords.length === 0 && (
              <p className="p-6 text-center text-xs text-slate-400">No matching records.</p>
            )}
            {filteredRecords.map((record) => (
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
                  <h2 className="text-sm font-bold text-slate-900">Newborn Birth Registration Form</h2>
                  <p className="text-[11px] text-slate-400">Authorized Official Registrar: {currentRegistrarName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRegisterForm(false)}
                  className="text-[11px] font-semibold text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleFinalizeRegistration} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Khmer Name (registered)" required>
                    <input
                      type="text"
                      required
                      value={formKhmerName}
                      onChange={(e) => setFormKhmerName(e.target.value)}
                      placeholder="e.g. សុខ ធីតា"
                      className="input-field"
                    />
                  </Field>
                  <Field label="English Name (LATIN CAPITALS)" required>
                    <input
                      type="text"
                      required
                      value={formEnglishName}
                      onChange={(e) => setFormEnglishName(e.target.value.toUpperCase())}
                      placeholder="e.g. SOK THIDA"
                      className="input-field"
                    />
                  </Field>

                  <Field label="Gender" required>
                    <select value={formGender} onChange={(e) => setFormGender(e.target.value as 'Male' | 'Female')} className="input-field">
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </Field>
                  <Field label="Date of Birth" required>
                    <div className="relative">
                      <input
                        type="date"
                        required
                        value={formDob}
                        onChange={(e) => setFormDob(e.target.value)}
                        className="input-field pr-8"
                      />
                      <Calendar className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </Field>

                  <Field label="Place of Birth (Province/City)" required>
                    <select value={formPlaceOfBirth} onChange={(e) => setFormPlaceOfBirth(e.target.value)} className="input-field">
                      <option>Phnom Penh</option>
                      <option>Siem Reap</option>
                      <option>Battambang</option>
                      <option>Kandal</option>
                      <option>Kampong Cham</option>
                    </select>
                  </Field>
                  <Field label="Occupation">
                    <input
                      type="text"
                      value={formOccupation}
                      onChange={(e) => setFormOccupation(e.target.value)}
                      className="input-field"
                    />
                  </Field>

                  <Field label="Father's Name" required>
                    <input
                      type="text"
                      required
                      value={formFatherName}
                      onChange={(e) => setFormFatherName(e.target.value)}
                      placeholder="Father's full name"
                      className="input-field"
                    />
                  </Field>
                  <Field label="Mother's Name" required>
                    <input
                      type="text"
                      required
                      value={formMotherName}
                      onChange={(e) => setFormMotherName(e.target.value)}
                      placeholder="Mother's full name"
                      className="input-field"
                    />
                  </Field>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Finalize Civil Registration & Generate NID
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
              <p>Registrar: <span className="font-semibold text-slate-700">{currentRegistrarName}</span></p>
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