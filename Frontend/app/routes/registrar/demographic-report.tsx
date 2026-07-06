import React, { useState } from 'react';
import { Home, CreditCard, BookMarked, Activity, Users2, Download, X, CheckCircle2 } from 'lucide-react';

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

// TODO: replace all of this with real data fetched from your Laravel API
// e.g. GET /api/v1/reports/demographics
const stats = {
  totalResidents: 8,
  activeSmartIds: 4,
  residencyBooks: 3,
  livingCitizens: 6,
  deceasedFolders: 2,
};

const ageGroups: AgeGroup[] = [
  { label: '0–14 Years (Children)', labelKh: 'កុមារ', count: 2, percent: 25, colorClass: 'bg-sky-400' },
  { label: '15–24 Years (Youth)', labelKh: 'យុវជន', count: 0, percent: 0, colorClass: 'bg-emerald-400' },
  { label: '25–54 Years (Adults)', labelKh: 'មនុស្សពេញវ័យ', count: 5, percent: 63, colorClass: 'bg-amber-400' },
  { label: '55+ Years (Seniors)', labelKh: 'មនុស្សចាស់', count: 1, percent: 13, colorClass: 'bg-indigo-400' },
];

const genderSplit = { male: 5, female: 3 };

const areaDensity: AreaDensity[] = [
  { name: 'Kilomet Prammouy', count: 3 },
  { name: 'Chrang Chamreh I', count: 2 },
  { name: 'Russey Keo', count: 2 },
  { name: 'Tuol Sangkae I', count: 1 },
];

// TODO: pull from logged-in registrar / server clock instead of hardcoding
const reportMeta = {
  department: 'General Department of Identification, Ministry of Interior',
  departmentKh: 'នាយកដ្ឋានទូទៅនៃអត្តសញ្ញាណកម្មសាធារណៈ ក្រសួងមហាផ្ទៃ',
  compilerName: 'Sok Cheat',
  compilerRefId: 'SC-1002',
  generatedAt: new Date().toISOString(),
};

export default function DemographicReportPage() {
  const [showReport, setShowReport] = useState(false);
  const [showDownloadToast, setShowDownloadToast] = useState(false);

  const totalGender = genderSplit.male + genderSplit.female;
  const malePercent = Math.round((genderSplit.male / totalGender) * 100);
  const femalePercent = 100 - malePercent;

  const donutStyle: React.CSSProperties = {
    background: `conic-gradient(#3b82f6 0% ${malePercent}%, #ec4899 ${malePercent}% 100%)`,
  };

  const totalAreaCount = areaDensity.reduce((sum, a) => sum + a.count, 0);

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
        <StatCard label="Deceased Folders" value={stats.deceasedFolders} icon={Users2} iconColor="text-rose-600" iconBg="bg-rose-50" valueColor="text-rose-600" />
      </div>

      {/* AGE BREAKDOWN + GENDER DISTRIBUTION */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-slate-900">Age Group Breakdown Statistics</h2>
            <span className="text-[10px] font-semibold text-slate-400">Static freeze bracket</span>
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
        <div className="grid grid-cols-2 gap-x-10 gap-y-5">
          {areaDensity.map((area) => {
            const maxCount = Math.max(...areaDensity.map((a) => a.count));
            const percent = (area.count / maxCount) * 100;
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
                <ReportStat label="Deceased Folders (Awaiting Archive)" value={`${stats.deceasedFolders} files`} />
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
                      <td className="px-3 py-2">{a.count} citizens ({Math.round((a.count / totalAreaCount) * 100)}%)</td>
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