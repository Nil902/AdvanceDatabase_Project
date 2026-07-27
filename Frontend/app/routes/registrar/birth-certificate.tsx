import React, { useEffect, useState } from 'react';
import {
  Search,
  UserPlus,
  FileText,
  Download,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ImagePlus,
} from 'lucide-react';
import { api, ApiError, getStoredUser, fetchAuthedBlobUrl, type Paginated } from '~/lib/api';
import { ParentPicker, parentPayload, emptyParent, type ParentValue } from '~/components/ParentPicker';
import { GeoSelect } from '~/components/GeoSelect';

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
  hasPhoto: boolean;
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
  has_photo?: boolean;
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
    hasPhoto: Boolean(c.has_photo),
  };
}

// Logged-in user stored at login (SystemUserResource). `officer` is present when
// the account is linked to a registration officer — used to stamp the issuing
// officer on new certificates (issued_by_officer_id).
interface StoredUser {
  full_name_en: string | null;
  full_name_kh: string | null;
  username: string;
  officer?: { officer_id: number; officer_name: string | null } | null;
}

// Phase 4.3 certificate detail fields (all optional at the UI level; numeric
// fields are strings here and coerced on submit).
interface BirthDetail {
  time_of_birth: string;
  birth_place_type: string;
  birth_facility_name: string;
  attendant_type: string;
  attendant_name: string;
  attendant_license_no: string;
  birth_weight_grams: string;
  gestational_age_weeks: string;
  multiple_birth_type: string;
  birth_order: string;
  is_live_birth: boolean;
  parents_marital_status: string;
  marriage_cert_reference: string;
  registration_type: '' | 'on_time' | 'late' | 'delayed';
  registration_justification: string;
  registry_book_volume: string;
  registry_book_page: string;
  registry_book_entry: string;
}

const emptyDetail: BirthDetail = {
  time_of_birth: '', birth_place_type: '', birth_facility_name: '',
  attendant_type: '', attendant_name: '', attendant_license_no: '',
  birth_weight_grams: '', gestational_age_weeks: '', multiple_birth_type: '',
  birth_order: '', is_live_birth: true, parents_marital_status: '',
  marriage_cert_reference: '', registration_type: '', registration_justification: '',
  registry_book_volume: '', registry_book_page: '', registry_book_entry: '',
};

// Suggest timeliness from the gap between birth and registration: on-time ≤30d,
// delayed >1y, otherwise late. Registrar can override.
function suggestRegistrationType(dob: string, registeredOn: string): 'on_time' | 'late' | 'delayed' {
  if (!dob || !registeredOn) return 'on_time';
  const days = (new Date(registeredOn).getTime() - new Date(dob).getTime()) / 86_400_000;
  if (days <= 30) return 'on_time';
  if (days > 365) return 'delayed';
  return 'late';
}

const num = (s: string): number | null => (s.trim() === '' ? null : Number(s));
const str = (s: string): string | null => (s.trim() === '' ? null : s.trim());

// Phase 4.4 informant / declarant (legally required).
interface InformantForm {
  full_name: string;
  national_id_number: string;
  relationship_to_child: string;
  address: string;
  phone_number: string;
  declaration_date: string;
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

  // Register-certificate form: the child (newborn) is typed in directly and
  // created as a citizen on submit; the parents are resolved to existing citizens.
  const [formChildKh, setFormChildKh] = useState('');
  const [formChildEn, setFormChildEn] = useState('');
  const [formChildGender, setFormChildGender] = useState<'M' | 'F'>('M');
  const [formChildDob, setFormChildDob] = useState('');
  const [formMother, setFormMother] = useState<ParentValue>(emptyParent);
  const [formFather, setFormFather] = useState<ParentValue>(emptyParent);
  const [formBirthVillageId, setFormBirthVillageId] = useState<number | null>(null);
  // Bumped on open to remount the (uncontrolled) GeoSelect so it clears.
  const [formResetKey, setFormResetKey] = useState(0);
  const [formChildNationality, setFormChildNationality] = useState('Cambodian');
  const [formDetail, setFormDetail] = useState<BirthDetail>(emptyDetail);
  const setDetail = <K extends keyof BirthDetail>(key: K, value: BirthDetail[K]) =>
    setFormDetail((d) => ({ ...d, [key]: value }));
  const [formCertNumber, setFormCertNumber] = useState('');
  const todayStr = new Date().toISOString().slice(0, 10);
  const [formIssueDate, setFormIssueDate] = useState(todayStr);
  const [formRegisteredDate, setFormRegisteredDate] = useState(todayStr);
  const [formRemarks, setFormRemarks] = useState('');
  const [formPhoto, setFormPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [detailPhoto, setDetailPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [registrarName, setRegistrarName] = useState('Registrar');
  const [officerId, setOfficerId] = useState<number | null>(null);

  // Suggested timeliness from birth vs registration dates (registrar may override).
  const regTypeSuggestion = suggestRegistrationType(formChildDob, formRegisteredDate);
  const effectiveRegType = formDetail.registration_type || regTypeSuggestion;

  const [formInformant, setFormInformant] = useState<InformantForm>(() => ({
    full_name: '', national_id_number: '', relationship_to_child: '',
    address: '', phone_number: '', declaration_date: todayStr,
  }));
  const setInformant = <K extends keyof InformantForm>(k: K, v: InformantForm[K]) =>
    setFormInformant((i) => ({ ...i, [k]: v }));

  // Selected scan → local preview (revoke previous object URL to avoid leaks).
  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setFormPhoto(file);
    setPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  function clearPhoto() {
    setFormPhoto(null);
    setPhotoPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
  }

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
    if (u) {
      setRegistrarName(u.full_name_en || u.full_name_kh || u.username || 'Registrar');
      setOfficerId(u.officer?.officer_id ?? null);
    }
  }, []);

  const filteredRecords = records.filter((r) =>
    r.englishName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.khmerName.includes(searchTerm) ||
    r.nid.includes(searchTerm)
  );

  const selectedRecord = records.find((r) => r.id === selectedId) ?? null;

  // Load the selected record's stored scan (auth-guarded blob → object URL).
  // Blank it first so the previous record's scan never lingers while loading.
  useEffect(() => {
    setDetailPhoto(null);
    if (!selectedRecord?.hasPhoto) return;
    let active = true;
    let created: string | null = null;
    fetchAuthedBlobUrl(`/birth-certificates/${selectedRecord.id}/photo`)
      .then((url) => { if (active) { created = url; setDetailPhoto(url); } else URL.revokeObjectURL(url); })
      .catch(() => { if (active) setDetailPhoto(null); });
    return () => { active = false; if (created) URL.revokeObjectURL(created); };
  }, [selectedRecord?.id, selectedRecord?.hasPhoto]);

  const handleSelectCitizen = (id: string) => {
    setSelectedId(id);
    setShowRegisterForm(false);
  };

  const handleOpenRegisterForm = () => {
    setFormChildKh('');
    setFormChildEn('');
    setFormChildGender('M');
    setFormChildDob('');
    setFormMother(emptyParent);
    setFormFather(emptyParent);
    setFormBirthVillageId(null);
    setFormResetKey((k) => k + 1);
    setFormChildNationality('Cambodian');
    setFormDetail(emptyDetail);
    setFormInformant({
      full_name: '', national_id_number: '', relationship_to_child: '',
      address: '', phone_number: '', declaration_date: todayStr,
    });
    setFormCertNumber(`BC-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`);
    clearPhoto();
    setActionError(null);
    setSelectedId(null);
    setShowRegisterForm(true);
  };

  // Registers a newborn: POST /citizens (create the child) → POST
  // /birth-certificates linking that new citizen + optional existing parents.
  const handleFinalizeRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    if (!formChildKh.trim()) {
      setActionError("Enter the child's name (Khmer).");
      return;
    }
    if (!formChildDob) {
      setActionError("Enter the child's date of birth.");
      return;
    }
    if (!formCertNumber.trim()) {
      setActionError('Enter a certificate number.');
      return;
    }
    if (!formInformant.full_name.trim() || !formInformant.relationship_to_child.trim()) {
      setActionError("Enter the informant's name and relationship to the child.");
      return;
    }
    if (effectiveRegType !== 'on_time' && !formDetail.registration_justification.trim()) {
      setActionError('A justification is required for a late/delayed registration.');
      return;
    }
    setBusy(true);
    try {
      const childRes = await api.post<{ data: { id: number } }>('/citizens', {
        full_name_kh: formChildKh.trim(),
        full_name_en: formChildEn.trim() || null,
        gender: formChildGender,
        date_of_birth: formChildDob,
        nationality: str(formChildNationality) ?? 'Cambodian',
        birth_place_village_id: formBirthVillageId,
      });
      const created = await api.post<{ data: ApiBirthCertificate }>('/birth-certificates', {
        citizen_id: childRes.data.id,
        mother: parentPayload(formMother),
        father: parentPayload(formFather),
        certificate_number: formCertNumber.trim(),
        issue_date: formIssueDate || null,
        registered_date: formRegisteredDate || null,
        issued_by_officer_id: officerId,
        remarks: formRemarks.trim() || null,
        // Phase 4.3 detail
        time_of_birth: str(formDetail.time_of_birth),
        birth_place_type: str(formDetail.birth_place_type),
        birth_facility_name: str(formDetail.birth_facility_name),
        attendant_type: str(formDetail.attendant_type),
        attendant_name: str(formDetail.attendant_name),
        attendant_license_no: str(formDetail.attendant_license_no),
        birth_weight_grams: num(formDetail.birth_weight_grams),
        gestational_age_weeks: num(formDetail.gestational_age_weeks),
        multiple_birth_type: str(formDetail.multiple_birth_type),
        birth_order: num(formDetail.birth_order),
        is_live_birth: formDetail.is_live_birth,
        parents_marital_status: str(formDetail.parents_marital_status),
        marriage_cert_reference: str(formDetail.marriage_cert_reference),
        registration_type: formDetail.registration_type || regTypeSuggestion,
        registration_justification: str(formDetail.registration_justification),
        registry_book_volume: str(formDetail.registry_book_volume),
        registry_book_page: str(formDetail.registry_book_page),
        registry_book_entry: str(formDetail.registry_book_entry),
        // Phase 4.4 informant / declarant (required)
        informant: {
          full_name: formInformant.full_name.trim(),
          national_id_number: str(formInformant.national_id_number),
          relationship_to_child: formInformant.relationship_to_child.trim(),
          address: str(formInformant.address),
          phone_number: str(formInformant.phone_number),
          declaration_date: formInformant.declaration_date || null,
        },
      });
      // Attach the scan (if any) as a second step; a failed upload is non-fatal.
      if (formPhoto) {
        const fd = new FormData();
        fd.append('photo', formPhoto);
        try {
          await api.post(`/birth-certificates/${created.data.id}/photo`, fd);
        } catch {
          setActionError('Certificate registered, but the image upload failed.');
        }
      }
      const list = await loadRecords();
      setShowRegisterForm(false);
      clearPhoto();
      const createdRow = list.find((r) => r.birthCertNo === formCertNumber.trim());
      if (createdRow) setSelectedId(createdRow.id);
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
                  onClick={() => { clearPhoto(); setShowRegisterForm(false); }}
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
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Child's Name (Khmer)" required>
                    <input
                      type="text"
                      required
                      value={formChildKh}
                      onChange={(e) => setFormChildKh(e.target.value)}
                      placeholder="ឈ្មោះកុមារ (ខ្មែរ)"
                      className="input-field"
                    />
                  </Field>
                  <Field label="Child's Name (English)">
                    <input
                      type="text"
                      value={formChildEn}
                      onChange={(e) => setFormChildEn(e.target.value)}
                      placeholder="Child name (English)"
                      className="input-field"
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Gender" required>
                    <select
                      value={formChildGender}
                      onChange={(e) => setFormChildGender(e.target.value as 'M' | 'F')}
                      className="input-field"
                    >
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                    </select>
                  </Field>
                  <Field label="Date of Birth" required>
                    <input
                      type="date"
                      required
                      max={todayStr}
                      value={formChildDob}
                      onChange={(e) => setFormChildDob(e.target.value)}
                      className="input-field"
                    />
                  </Field>
                </div>

                <Field label="Child's Nationality">
                  <input
                    type="text"
                    value={formChildNationality}
                    onChange={(e) => setFormChildNationality(e.target.value)}
                    placeholder="Cambodian"
                    className="input-field"
                  />
                </Field>

                <Field label="Place of Birth">
                  <GeoSelect key={formResetKey} onChange={setFormBirthVillageId} />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Mother" required>
                    <ParentPicker value={formMother} onChange={setFormMother} required todayStr={todayStr} />
                  </Field>
                  <Field label="Father (optional)">
                    <ParentPicker value={formFather} onChange={setFormFather} todayStr={todayStr} />
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

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Issue Date">
                    <input type="date" value={formIssueDate} onChange={(e) => setFormIssueDate(e.target.value)} className="input-field" />
                  </Field>
                  <Field label="Registered Date">
                    <input type="date" value={formRegisteredDate} onChange={(e) => setFormRegisteredDate(e.target.value)} className="input-field" />
                  </Field>
                </div>

                {/* ── Certificate details (Phase 4.3) ──────────────────── */}
                <div className="space-y-4 rounded-lg border border-slate-200 p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Birth Details</p>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Time of Birth">
                      <input type="time" value={formDetail.time_of_birth} onChange={(e) => setDetail('time_of_birth', e.target.value)} className="input-field" />
                    </Field>
                    <Field label="Live Birth?">
                      <select value={formDetail.is_live_birth ? 'yes' : 'no'} onChange={(e) => setDetail('is_live_birth', e.target.value === 'yes')} className="input-field">
                        <option value="yes">Live birth</option>
                        <option value="no">Stillbirth</option>
                      </select>
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Birth Place Type">
                      <select value={formDetail.birth_place_type} onChange={(e) => setDetail('birth_place_type', e.target.value)} className="input-field">
                        <option value="">—</option>
                        <option value="hospital">Hospital</option>
                        <option value="health_centre">Health centre</option>
                        <option value="home">Home</option>
                        <option value="in_transit">In transit</option>
                        <option value="other">Other</option>
                      </select>
                    </Field>
                    <Field label="Facility Name">
                      <input type="text" value={formDetail.birth_facility_name} onChange={(e) => setDetail('birth_facility_name', e.target.value)} className="input-field" />
                    </Field>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <Field label="Attendant">
                      <select value={formDetail.attendant_type} onChange={(e) => setDetail('attendant_type', e.target.value)} className="input-field">
                        <option value="">—</option>
                        <option value="doctor">Doctor</option>
                        <option value="midwife">Midwife</option>
                        <option value="traditional">Traditional</option>
                        <option value="none">None</option>
                      </select>
                    </Field>
                    <Field label="Attendant Name">
                      <input type="text" value={formDetail.attendant_name} onChange={(e) => setDetail('attendant_name', e.target.value)} className="input-field" />
                    </Field>
                    <Field label="Licence No.">
                      <input type="text" value={formDetail.attendant_license_no} onChange={(e) => setDetail('attendant_license_no', e.target.value)} className="input-field" />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Birth Weight (g)">
                      <input type="number" min={200} max={10000} value={formDetail.birth_weight_grams} onChange={(e) => setDetail('birth_weight_grams', e.target.value)} className="input-field" />
                    </Field>
                    <Field label="Gestational Age (weeks)">
                      <input type="number" min={20} max={45} value={formDetail.gestational_age_weeks} onChange={(e) => setDetail('gestational_age_weeks', e.target.value)} className="input-field" />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Multiple Birth">
                      <select value={formDetail.multiple_birth_type} onChange={(e) => setDetail('multiple_birth_type', e.target.value)} className="input-field">
                        <option value="">—</option>
                        <option value="singleton">Singleton</option>
                        <option value="twin">Twin</option>
                        <option value="triplet_plus">Triplet+</option>
                      </select>
                    </Field>
                    <Field label="Birth Order">
                      <input type="number" min={1} max={10} value={formDetail.birth_order} onChange={(e) => setDetail('birth_order', e.target.value)} className="input-field" />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Parents' Marital Status">
                      <select value={formDetail.parents_marital_status} onChange={(e) => setDetail('parents_marital_status', e.target.value)} className="input-field">
                        <option value="">—</option>
                        <option value="married">Married</option>
                        <option value="unmarried">Unmarried</option>
                        <option value="divorced">Divorced</option>
                        <option value="widowed">Widowed</option>
                      </select>
                    </Field>
                    <Field label="Marriage Cert. Reference">
                      <input type="text" value={formDetail.marriage_cert_reference} onChange={(e) => setDetail('marriage_cert_reference', e.target.value)} className="input-field" />
                    </Field>
                  </div>

                  <Field label={`Registration Type (suggested: ${regTypeSuggestion.replace('_', '-')})`}>
                    <select
                      value={effectiveRegType}
                      onChange={(e) => setDetail('registration_type', e.target.value as BirthDetail['registration_type'])}
                      className="input-field"
                    >
                      <option value="on_time">On-time (≤30 days)</option>
                      <option value="late">Late</option>
                      <option value="delayed">Delayed (&gt;1 year)</option>
                    </select>
                  </Field>

                  {effectiveRegType !== 'on_time' && (
                    <Field label="Justification (required for late/delayed)" required>
                      <textarea
                        required
                        value={formDetail.registration_justification}
                        onChange={(e) => setDetail('registration_justification', e.target.value)}
                        rows={2}
                        className="input-field"
                        placeholder="Reason the registration is late/delayed…"
                      />
                    </Field>
                  )}

                  <div className="grid grid-cols-3 gap-4">
                    <Field label="Registry Vol.">
                      <input type="text" value={formDetail.registry_book_volume} onChange={(e) => setDetail('registry_book_volume', e.target.value)} className="input-field" />
                    </Field>
                    <Field label="Registry Page">
                      <input type="text" value={formDetail.registry_book_page} onChange={(e) => setDetail('registry_book_page', e.target.value)} className="input-field" />
                    </Field>
                    <Field label="Registry Entry">
                      <input type="text" value={formDetail.registry_book_entry} onChange={(e) => setDetail('registry_book_entry', e.target.value)} className="input-field" />
                    </Field>
                  </div>
                </div>

                {/* ── Informant / declarant (Phase 4.4, required) ──────── */}
                <div className="space-y-4 rounded-lg border border-slate-200 p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Informant / Declarant</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Full Name" required>
                      <input type="text" required value={formInformant.full_name} onChange={(e) => setInformant('full_name', e.target.value)} className="input-field" />
                    </Field>
                    <Field label="Relationship to Child" required>
                      <input type="text" required value={formInformant.relationship_to_child} onChange={(e) => setInformant('relationship_to_child', e.target.value)} placeholder="e.g. Mother, Father, Grandparent" className="input-field" />
                    </Field>
                    <Field label="National ID">
                      <input type="text" value={formInformant.national_id_number} onChange={(e) => setInformant('national_id_number', e.target.value)} className="input-field" />
                    </Field>
                    <Field label="Phone">
                      <input type="text" value={formInformant.phone_number} onChange={(e) => setInformant('phone_number', e.target.value)} className="input-field" />
                    </Field>
                    <Field label="Address">
                      <input type="text" value={formInformant.address} onChange={(e) => setInformant('address', e.target.value)} className="input-field" />
                    </Field>
                    <Field label="Declaration Date" required>
                      <input type="date" required max={todayStr} value={formInformant.declaration_date} onChange={(e) => setInformant('declaration_date', e.target.value)} className="input-field" />
                    </Field>
                  </div>
                </div>

                <Field label="Remarks (optional)">
                  <textarea
                    rows={2}
                    value={formRemarks}
                    onChange={(e) => setFormRemarks(e.target.value)}
                    placeholder="Any additional notes"
                    className="input-field"
                  />
                </Field>

                <Field label="Certificate Scan / Photo (optional)">
                  <div className="flex items-center gap-4">
                    <div className="flex h-24 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100 text-slate-400">
                      {photoPreview ? (
                        <img src={photoPreview} alt="Selected" className="h-full w-full object-cover" />
                      ) : (
                        <FileText className="h-8 w-8" />
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                        <ImagePlus className="h-3.5 w-3.5" />
                        {formPhoto ? 'Change Image' : 'Upload Image'}
                        <input type="file" accept="image/*" onChange={onPhotoChange} className="hidden" />
                      </label>
                      <p className="text-[10px] text-slate-400">JPG or PNG, up to 4 MB.</p>
                    </div>
                  </div>
                </Field>

                <button
                  type="submit"
                  disabled={busy || !formChildKh.trim() || !formChildDob}
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

              {detailPhoto && (
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 mb-1">Certificate Scan / Photo</p>
                  <img src={detailPhoto} alt="Certificate scan" className="max-h-64 rounded-lg border border-slate-200 object-contain" />
                </div>
              )}

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