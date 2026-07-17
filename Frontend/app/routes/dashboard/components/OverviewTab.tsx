import { useState, useEffect } from 'react';
import type React from 'react';
import {
  Users,
  CreditCard,
  BookOpen,
  AlertTriangle,
  Clock,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  MapPin,
} from 'lucide-react';
import { api } from '../../../lib/api';
import { moduleMeta, toneDot } from '../constants';
import type { BreakdownEntry, ModuleKey } from '../types';

// ---------------------------------------------------------------------------
// OVERVIEW DATA
// TODO: replace this whole block with a single lightweight aggregate call —
// GET /api/v1/overview — returning pre-computed counts. Do NOT fetch every
// module's full record list on the home screen just to call .length on it.
// ---------------------------------------------------------------------------
interface OverviewSummary {
  birth: { total: number; registered: number; missingCert: number };
  nid: { total: number; active: number; suspended: number; disabled: number; undelivered: number };
  residency: { books: number; residents: number };
  family: { households: number; dependents: number };
}

interface ActivityItem {
  id: string;
  module: ModuleKey;
  action: string;
  actor: string;
  time: string;
}

interface AttentionItem {
  id: string;
  module: ModuleKey;
  label: string;
  count: number;
}

function KpiCard({
  icon: Icon,
  tileBg,
  tileText,
  label,
  value,
  hint,
  hintIcon: HintIcon,
}: {
  icon: React.ElementType;
  tileBg: string;
  tileText: string;
  label: string;
  value: string;
  hint: string;
  hintIcon: React.ElementType;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className={`rounded-lg ${tileBg} ${tileText} p-3`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <span className="block text-[11px] font-medium text-slate-500">{label}</span>
          <h3 className="mt-0.5 text-lg font-bold text-slate-900">{value}</h3>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
        <HintIcon className="h-3 w-3" />
        {hint}
      </div>
    </div>
  );
}

function ModuleCard({
  module,
  primary,
  breakdown,
  onOpen,
}: {
  module: ModuleKey;
  primary: string;
  breakdown: BreakdownEntry[];
  onOpen: () => void;
}) {
  const meta = moduleMeta[module];
  const Icon = meta.icon;
  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg ${meta.tileBg} ${meta.tileText} p-2.5`}>
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="text-xs font-bold text-slate-900">{meta.name}</h3>
      </div>

      <p className="mt-4 text-xl font-bold text-slate-900">{primary}</p>

      <div className="mt-3 space-y-1.5">
        {breakdown.map((b) => (
          <div key={b.label} className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className={`h-1.5 w-1.5 rounded-full ${toneDot[b.tone]}`} />
              {b.label}
            </span>
            <span className="font-bold text-slate-700">{b.value.toLocaleString()}</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onOpen}
        className={`mt-5 inline-flex items-center gap-1 text-[11px] font-bold ${meta.linkText} hover:gap-2 transition-all`}
      >
        Open module
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// The overview body, rendered inside the dashboard shell as a tab.
export function OverviewTab({ onNavigate }: { onNavigate: (module: ModuleKey) => void }) {
  const go = (module: ModuleKey) => () => onNavigate(module);

  const [summary, setSummary] = useState<OverviewSummary>({
    birth: { total: 0, registered: 0, missingCert: 0 },
    nid: { total: 0, active: 0, suspended: 0, disabled: 0, undelivered: 0 },
    residency: { books: 0, residents: 0 },
    family: { households: 0, dependents: 0 },
  });
  const [recentActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    // Keys match ReportController@summary (total_citizens, total_birth_certificates, …).
    api.get<any>('/reports/summary').then((data) => {
      setSummary({
        birth: { total: data.total_birth_certificates ?? 0, registered: data.total_birth_certificates ?? 0, missingCert: 0 },
        nid: { total: data.total_active_id_cards ?? 0, active: data.total_active_id_cards ?? 0, suspended: 0, disabled: 0, undelivered: 0 },
        residency: { books: data.total_households ?? 0, residents: data.total_citizens ?? 0 },
        family: { households: data.total_households ?? 0, dependents: data.total_citizens ?? 0 },
      });
    }).catch(() => {});
  }, []);

  const attention: AttentionItem[] = [
    { id: 't1', module: 'nid', label: 'Cards printed but not delivered', count: summary.nid.undelivered },
    { id: 't2', module: 'birth', label: 'Citizens with no birth certificate', count: summary.birth.missingCert },
    { id: 't3', module: 'nid', label: 'Suspended NID cards under review', count: summary.nid.suspended },
  ];

  const pendingActions = summary.nid.undelivered + summary.birth.missingCert;

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Registry Overview</h1>
        <p className="text-xs text-slate-500">
          Consolidated summary of civil registration, identity, and residency records across all modules.
        </p>
      </div>

      {/* KPI ROW */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard icon={Users} tileBg="bg-blue-50" tileText="text-blue-600" label="Registered Citizens" value={summary.birth.total.toLocaleString()} hint="+18 this week" hintIcon={TrendingUp} />
        <KpiCard icon={CreditCard} tileBg="bg-purple-50" tileText="text-purple-600" label="Smart NID Cards Issued" value={summary.nid.total.toLocaleString()} hint={`${summary.nid.active.toLocaleString()} active`} hintIcon={ShieldCheck} />
        <KpiCard icon={BookOpen} tileBg="bg-amber-50" tileText="text-amber-600" label="Household Residency Books" value={summary.residency.books.toLocaleString()} hint={`${summary.residency.residents.toLocaleString()} residents`} hintIcon={MapPin} />
        <KpiCard icon={AlertTriangle} tileBg="bg-rose-50" tileText="text-rose-600" label="Pending Actions" value={pendingActions.toLocaleString()} hint="Needs attention" hintIcon={Clock} />
      </div>

      {/* MODULE CARDS */}
      <div className="grid grid-cols-4 gap-4">
        <ModuleCard
          module="birth"
          primary={`${summary.birth.total.toLocaleString()} records`}
          onOpen={go('birth')}
          breakdown={[
            { label: 'Registered', value: summary.birth.registered, tone: 'good' },
            { label: 'No certificate', value: summary.birth.missingCert, tone: 'warn' },
          ]}
        />
        <ModuleCard
          module="nid"
          primary={`${summary.nid.total.toLocaleString()} cards`}
          onOpen={go('nid')}
          breakdown={[
            { label: 'Active', value: summary.nid.active, tone: 'good' },
            { label: 'Suspended', value: summary.nid.suspended, tone: 'warn' },
            { label: 'Disabled', value: summary.nid.disabled, tone: 'bad' },
          ]}
        />
        <ModuleCard
          module="residency"
          primary={`${summary.residency.books.toLocaleString()} books`}
          onOpen={go('residency')}
          breakdown={[{ label: 'Residents', value: summary.residency.residents, tone: 'neutral' }]}
        />
        <ModuleCard
          module="family"
          primary={`${summary.family.households.toLocaleString()} households`}
          onOpen={go('family')}
          breakdown={[{ label: 'Dependents', value: summary.family.dependents, tone: 'neutral' }]}
        />
      </div>

      {/* ACTIVITY + ATTENTION */}
      <div className="grid grid-cols-3 gap-6 items-start">
        <div className="col-span-2 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-600" />
              <h2 className="text-sm font-bold text-slate-900">Recent Registry Activity</h2>
            </div>
            <span className="text-[11px] text-slate-400">Last 24 hours</span>
          </div>
          <div className="divide-y divide-slate-100">
            {recentActivity.map((item) => {
              const meta = moduleMeta[item.module];
              const Icon = meta.icon;
              return (
                <div key={item.id} className="flex items-center gap-3 px-6 py-3.5 hover:bg-slate-50/50 transition">
                  <div className={`rounded-lg ${meta.tileBg} ${meta.tileText} p-2 shrink-0`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-800">{item.action}</p>
                    <p className="text-[11px] text-slate-400">by {item.actor}</p>
                  </div>
                  <span className="shrink-0 text-[11px] font-medium text-slate-400">{item.time}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-bold text-slate-900">Attention Required</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {attention.map((item) => {
              const meta = moduleMeta[item.module];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={go(item.module)}
                  className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left hover:bg-slate-50/50 transition"
                >
                  <span className="text-xs font-medium text-slate-600 leading-snug">{item.label}</span>
                  <span className={`shrink-0 rounded-lg ${meta.tileBg} ${meta.tileText} px-2.5 py-1 text-xs font-bold`}>
                    {item.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
