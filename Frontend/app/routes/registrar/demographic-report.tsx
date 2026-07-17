import React, { useEffect, useState } from 'react';
import { Home, CreditCard, BookMarked, Activity, Users2, Download, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { api, ApiError, getStoredUser } from '~/lib/api';

interface AgeGroup {
  label: string;
  labelKh: string;
  count: number;
  percent: number;
  colorClass: string;
}

interface AreaDensity {
  name: string;
  count: number;
}

// ── API response shapes (see ReportController) ──────────────────────────────
interface ReportSummary {
  total_citizens: number;
  total_birth_certificates: number;
  total_marriages: number;
  total_households: number;
  total_active_id_cards: number;
}
// GET /reports/demographics?group_by=... returns a flat array of { <dimension>, total }
interface GenderRow { gender: string; total: number }
interface AgeRow { age_group: string; total: number }
interface ProvinceRow { province_name_en: string; total: number }

// Display config for the four age buckets the API bins into (see the SQL CASE
// in ReportController::demographics).
const AGE_ORDER = ['0-17', '18-34', '35-59', '60+'] as const;
const AGE_DISPLAY: Record<string, { label: string; labelKh: string; colorClass: string }> = {
  '0-17': { label: '0–17 Years (Minors)', labelKh: 'អនីតិជន', colorClass: 'bg-sky-400' },
  '18-34': { label: '18–34 Years (Youth)', labelKh: 'យុវជន', colorClass: 'bg-emerald-400' },
  '35-59': { label: '35–59 Years (Adults)', labelKh: 'មនុស្សពេញវ័យ', colorClass: 'bg-amber-400' },
  '60+': { label: '60+ Years (Seniors)', labelKh: 'មនុស្សចាស់', colorClass: 'bg-indigo-400' },
};

const emptySummary: ReportSummary = {
  total_citizens: 0,
  total_birth_certificates: 0,
  total_marriages: 0,
  total_households: 0,
  total_active_id_cards: 0,
};

// Stored user shape (SystemUserResource) used for the report's compiler line.
interface ReportUser {
  user_id: number;
  username: string;
  full_name_en: string | null;
}

const departmentInfo = {
  department: 'General Department of Identification, Ministry of Interior',
  departmentKh: 'នាយកដ្ឋានទូទៅនៃអត្តសញ្ញាណកម្មសាធារណៈ ក្រសួងមហាផ្ទៃ',
};

export default function DemographicReportPage() {
  // Compiler identity + timestamp come from the logged-in user and the clock.
  const reportUser = getStoredUser<ReportUser>();
  const reportMeta = {
    ...departmentInfo,
    compilerName: reportUser?.full_name_en || reportUser?.username || 'Unknown Officer',
    compilerRefId: reportUser ? `UID-${reportUser.user_id}` : '—',
    generatedAt: new Date().toLocaleString(),
  };

  const [showReport, setShowReport] = useState(false);
  const [showDownloadToast, setShowDownloadToast] = useState(false);

  // ── Server data ───────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ReportSummary>(emptySummary);
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>([]);
  const [genderSplit, setGenderSplit] = useState({ male: 0, female: 0 });
  const [areaDensity, setAreaDensity] = useState<AreaDensity[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [summaryRes, genderRes, ageRes, provinceRes] = await Promise.all([
          api.get<ReportSummary>('/reports/summary'),
          api.get<GenderRow[]>('/reports/demographics', { group_by: 'gender' }),
          api.get<AgeRow[]>('/reports/demographics', { group_by: 'age_group' }),
          api.get<ProvinceRow[]>('/reports/demographics', { group_by: 'province' }),
        ]);
        if (cancelled) return;

        setSummary(summaryRes);

        const male = genderRes.find((r) => /^m/i.test(r.gender ?? ''))?.total ?? 0;
        const female = genderRes.find((r) => /^f/i.test(r.gender ?? ''))?.total ?? 0;
        setGenderSplit({ male, female });

        const ageTotal = ageRes.reduce((sum, r) => sum + Number(r.total), 0);
        setAgeGroups(
          AGE_ORDER.map((bucket) => {
            const count = Number(ageRes.find((r) => r.age_group === bucket)?.total ?? 0);
            const meta = AGE_DISPLAY[bucket];
            return {
              label: meta.label,
              labelKh: meta.labelKh,
              colorClass: meta.colorClass,
              count,
              percent: ageTotal > 0 ? Math.round((count / ageTotal) * 100) : 0,
            };
          }),
        );

        setAreaDensity(
          provinceRes
            .map((r) => ({ name: r.province_name_en, count: Number(r.total) }))
            .sort((a, b) => b.count - a.count),
        );
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'Failed to load demographic data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Derived values (guarded against empty data) ─────────────────────────────
  const stats = {
    totalResidents: summary.total_citizens,
    activeSmartIds: summary.total_active_id_cards,
    residencyBooks: summary.total_households,
    livingCitizens: summary.total_citizens,
    birthCertificates: summary.total_birth_certificates,
  };

  const totalGender = genderSplit.male + genderSplit.female;
  const malePercent = totalGender > 0 ? Math.round((genderSplit.male / totalGender) * 100) : 0;
  const femalePercent = totalGender > 0 ? 100 - malePercent : 0;

  const donutStyle: React.CSSProperties = {
    background: `conic-gradient(#3b82f6 0% ${malePercent}%, #ec4899 ${malePercent}% 100%)`,
  };

  const totalAreaCount = areaDensity.reduce((sum, a) => sum + a.count, 0);
  const maxAreaCount = areaDensity.reduce((max, a) => Math.max(max, a.count), 0);

  const handleDownloadPdf = () => {
    // TODO: replace with a real PDF export.
    // Simplest real option: window.print() with the @media print rules below
    // (browser's own "Save as PDF" in the print dialog).
    // For a generated file without the print dialog, use a library like
    // jsPDF/html2pdf on the client, or better: have Laravel generate the PDF
    // server-side (e.g. barryvdh/laravel-dompdf) and return it as a download.
    window.print();

    setShowDownloadToast(true);
    setTimeout(() => setShowDownloadToast(false), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-sm text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading demographic insights…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-800">
        <AlertCircle className="h-4 w-4 shrink-0 stroke-[2.5]" />
        <div>
          <p className="font-bold">Could not load report data</p>
          <p className="mt-0.5">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">National Identification Demographic Insights</h1>
        <p className="text-xs text-slate-500 mt-1">Management-Level Summaries and Registration Statistics</p>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard label="Total Residents" value={stats.totalResidents} icon={Home} iconColor="text-blue-600" iconBg="bg-blue-50" valueColor="text-slate-900" />
        <StatCard label="Active Smart IDs" value={stats.activeSmartIds} icon={CreditCard} iconColor="text-emerald-600" iconBg="bg-emerald-50" valueColor="text-emerald-600" />
        <StatCard label="Residency Books" value={stats.residencyBooks} icon={BookMarked} iconColor="text-amber-600" iconBg="bg-amber-50" valueColor="text-amber-600" />
        <StatCard label="Living Citizens" value={stats.livingCitizens} icon={Activity} iconColor="text-indigo-600" iconBg="bg-indigo-50" valueColor="text-slate-900" />
        <StatCard label="Birth Certificates" value={stats.birthCertificates} icon={Users2} iconColor="text-rose-600" iconBg="bg-rose-50" valueColor="text-rose-600" />
      </div>

      {/* AGE BREAKDOWN + GENDER DISTRIBUTION */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-slate-900">Age Group Breakdown Statistics</h2>
            <span className="text-[10px] font-semibold text-slate-400">Live from registry</span>
          </div>
          <div className="space-y-5">
            {ageGroups.map((group) => (
              <div key={group.label}>
                <div className="flex items-center justify-between mb-1.5 text-xs">
                  <span className="font-semibold text-slate-700">{group.label}</span>
                  <span className="text-slate-400">{group.count} citizens ({group.percent}%)</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full rounded-full ${group.colorClass}`} style={{ width: `${group.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col items-center">
          <h2 className="text-sm font-bold text-slate-900 self-start mb-6">Gender Distribution</h2>
          <div className="relative h-36 w-36 rounded-full" style={donutStyle}>
            <div className="absolute inset-3 rounded-full bg-white flex flex-col items-center justify-center">
              <span className="text-[9px] font-bold tracking-widest text-slate-400">SEX SPLIT</span>
              <span className="text-sm font-bold text-slate-900">{genderSplit.male}M : {genderSplit.female}F</span>
            </div>
          </div>
          <div className="flex gap-5 mt-6 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="font-semibold text-slate-600">Male: {malePercent}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-pink-500" />
              <span className="font-semibold text-slate-600">Female: {femalePercent}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* GEOGRAPHICAL DENSITY */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold text-slate-900">Geographical Citizen Density Breakdown</h2>
          <button
            type="button"
            onClick={() => setShowReport(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-slate-800"
          >
            <Download className="h-3 w-3" />
            Export PDF Report
          </button>
        </div>
        {areaDensity.length === 0 ? (
          <p className="text-xs text-slate-400">No citizens registered against a province yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-10 gap-y-5">
            {areaDensity.map((area) => {
              const percent = maxAreaCount > 0 ? (area.count / maxAreaCount) * 100 : 0;
              return (
                <div key={area.name}>
                  <div className="flex items-center justify-between mb-1.5 text-xs">
                    <span className="font-semibold text-slate-700">{area.name}</span>
                    <span className="text-slate-400">{area.count} citizens registered</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-indigo-400" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── EXPORT / OFFICIAL REPORT MODAL ─────────────────────────────── */}
      {showReport && (
        <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-6 print:static print:bg-white print:p-0">
          <style>{`
            @media print {
              body * { visibility: hidden; }
              #report-print-area, #report-print-area * { visibility: visible; }
              #report-print-area { position: absolute; inset: 0; width: 100%; }
              .no-print { display: none !important; }
            }
          `}</style>

          {/* Action bar (hidden when printing) */}
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

          {/* Report paper */}
          <div id="report-print-area" className="w-full max-w-3xl rounded-xl bg-white p-10 shadow-2xl my-4 print:shadow-none print:rounded-none print:my-0">
            <div className="text-center border-b border-slate-200 pb-5 mb-6">
              <p className="font-bold text-slate-900">ព្រះរាជាណាចក្រកម្ពុជា</p>
              <p className="text-xs font-bold tracking-widest text-slate-600 mt-0.5">KINGDOM OF CAMBODIA</p>
              <p className="text-[10px] text-slate-400">Nation · Religion · King</p>
              <h2 className="text-base font-bold text-slate-900 mt-3">OFFICIAL DEMOGRAPHIC AND REGISTRATION DECREE REPORT</h2>
              <p className="text-[11px] text-slate-500">របាយការណ៍ប្រកាសស្ថិតិ និងចុះបញ្ជីផ្លូវការ</p>
            </div>

            <section className="mb-6">
              <h3 className="text-xs font-bold text-slate-900 mb-2">REPORT INFORMATION / ព័ត៌មានរបាយការណ៍</h3>
              <div className="text-[11px] text-slate-700 space-y-1.5">
                <p><span className="font-semibold">Department:</span> {reportMeta.department} / {reportMeta.departmentKh}</p>
                <p><span className="font-semibold">Compiler Statistician:</span> {reportMeta.compilerName} (Signature Reference ID: {reportMeta.compilerRefId})</p>
                <p><span className="font-semibold">Generation Timestamp:</span> {reportMeta.generatedAt}</p>
              </div>
            </section>

            <section className="mb-6">
              <h3 className="text-xs font-bold text-slate-900 mb-2">I. POPULATION AGGREGATE INDICES / សន្ទស្សន៍ប្រជាសរុប</h3>
              <div className="grid grid-cols-4 gap-3">
                <ReportStat label="Total Database Folders" value={`${stats.totalResidents} citizens`} />
                <ReportStat label="Active Smart National ID Cards" value={`${stats.activeSmartIds} smart cards`} />
                <ReportStat label="Registered Family Residency Books" value={`${stats.residencyBooks} books`} />
                <ReportStat label="Birth Certificates Issued" value={`${stats.birthCertificates} files`} />
              </div>
            </section>

            <section className="mb-6">
              <h3 className="text-xs font-bold text-slate-900 mb-2">II. DEMOGRAPHICS BREAKDOWN / ការបែងចែកប្រជាសាស្ត្រ</h3>
              <table className="w-full text-[11px] border border-slate-200">
                <thead>
                  <tr className="bg-slate-800 text-white text-left">
                    <th className="px-3 py-2 font-semibold">Age Bracket</th>
                    <th className="px-3 py-2 font-semibold">Citizen Count</th>
                    <th className="px-3 py-2 font-semibold">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {ageGroups.map((g) => (
                    <tr key={g.label} className="border-t border-slate-200">
                      <td className="px-3 py-2">{g.label} / {g.labelKh}</td>
                      <td className="px-3 py-2">{g.count}</td>
                      <td className="px-3 py-2">{g.percent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="mb-6">
              <h3 className="text-xs font-bold text-slate-900 mb-2">III. GEOGRAPHIC DISPERSION TABLE / តារាងការពង្រីកភូមិសាស្ត្រ</h3>
              <table className="w-full text-[11px] border border-slate-200">
                <thead>
                  <tr className="bg-slate-800 text-white text-left">
                    <th className="px-3 py-2 font-semibold">Zone</th>
                    <th className="px-3 py-2 font-semibold">Registered Citizen Density</th>
                  </tr>
                </thead>
                <tbody>
                  {areaDensity.map((a) => (
                    <tr key={a.name} className="border-t border-slate-200">
                      <td className="px-3 py-2">{a.name}</td>
                      <td className="px-3 py-2">{a.count} citizens ({totalAreaCount > 0 ? Math.round((a.count / totalAreaCount) * 100) : 0}%)</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <p className="text-[10px] text-slate-400 border-t border-slate-200 pt-4">
              This document is an official sample overview generated from NIMS data. / ឯកសារនេះគឺជាទិដ្ឋភាពគំរូផ្លូវការដែលបានបង្កើតចេញពីទិន្នន័យ NIMS ។
            </p>
          </div>
        </div>
      )}

      {/* Download success toast */}
      {showDownloadToast && (
        <div className="no-print fixed top-6 right-6 z-50 flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-xs font-bold text-white shadow-xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          Downloaded Successfully
        </div>
      )}
    </div>
  );
}

function ReportStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
      <p className="text-[9px] text-slate-500 mb-1">{label}</p>
      <p className="text-xs font-bold text-slate-900">{value}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  iconColor,
  iconBg,
  valueColor,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
  valueColor: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold text-slate-500">{label}</span>
        <div className={`rounded-lg p-1.5 ${iconBg} ${iconColor}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
    </div>
  );
}
