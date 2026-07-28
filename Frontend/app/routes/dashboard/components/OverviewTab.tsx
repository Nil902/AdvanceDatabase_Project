import { useState, useEffect } from 'react';
import type React from 'react';
import {
  Users,
  CreditCard,
  BookOpen,
  Clock,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  MapPin,
  HeartHandshake,
} from 'lucide-react';
import { api } from '../../../lib/api';
import { moduleMeta, toneDot } from '../constants';
import type { BreakdownEntry, ModuleKey } from '../types';

// ---------------------------------------------------------------------------
// OVERVIEW DATA — all live.
//   KPIs / module cards  ← GET /api/v1/reports/summary (cached aggregate counts)
//   Recent activity      ← GET /api/v1/admin/audit-logs (the real audit trail)
// No fabricated figures: every number shown is returned by the API.
// ---------------------------------------------------------------------------
interface OverviewSummary {
  citizens: number;
  births: number;
  marriages: number;
  households: number;
  activeCards: number;
}

// One row from AuditLogController@index.
interface AuditRow {
  id: number;
  action: string;
  target_table: string | null;
  target_id: number | null;
  actor: string;
  performed_at: string | null;
}

// Pick the module icon that best represents an audited table.
function moduleForTable(table: string | null): ModuleKey {
  switch (table) {
    case 'birth_certificates': return 'birth';
    case 'identity_cards': return 'nid';
    case 'households':
    case 'household_members': return 'residency';
    default: return 'family';
  }
}

function activityLabel(row: AuditRow): string {
  const verb = row.action.charAt(0).toUpperCase() + row.action.slice(1);
  if (row.action === 'login' || row.action === 'logout') return verb;
  if (!row.target_table) return verb;
  const entity = row.target_table.replace(/_/g, ' ').replace(/s$/, '');
  return row.target_id ? `${verb} ${entity} #${row.target_id}` : `${verb} ${entity}`;
}

function formatWhen(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso.replace(' ', 'T'));
  return isNaN(d.getTime()) ? iso : d.toLocaleString();
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
    citizens: 0, births: 0, marriages: 0, households: 0, activeCards: 0,
  });
  const [recentActivity, setRecentActivity] = useState<AuditRow[]>([]);

  useEffect(() => {
    // Keys match ReportController@summary.
    api.get<any>('/reports/summary').then((data) => {
      setSummary({
        citizens: data.total_citizens ?? 0,
        births: data.total_birth_certificates ?? 0,
        marriages: data.total_marriages ?? 0,
        households: data.total_households ?? 0,
        activeCards: data.total_active_id_cards ?? 0,
      });
    }).catch(() => {});

    // Real activity feed straight from the audit trail.
    api.get<{ data: AuditRow[] }>('/admin/audit-logs', { per_page: 8 })
      .then((res) => setRecentActivity(res.data))
      .catch(() => {});
  }, []);

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
        <KpiCard icon={Users} tileBg="bg-blue-50" tileText="text-blue-600" label="Registered Citizens" value={summary.citizens.toLocaleString()} hint="Total on record" hintIcon={TrendingUp} />
        <KpiCard icon={CreditCard} tileBg="bg-purple-50" tileText="text-purple-600" label="Active NID Cards" value={summary.activeCards.toLocaleString()} hint="Currently valid" hintIcon={ShieldCheck} />
        <KpiCard icon={BookOpen} tileBg="bg-amber-50" tileText="text-amber-600" label="Household Books" value={summary.households.toLocaleString()} hint="Active residency books" hintIcon={MapPin} />
        <KpiCard icon={HeartHandshake} tileBg="bg-emerald-50" tileText="text-emerald-600" label="Active Marriages" value={summary.marriages.toLocaleString()} hint="Registered unions" hintIcon={TrendingUp} />
      </div>

      {/* MODULE CARDS */}
      <div className="grid grid-cols-4 gap-4">
        <ModuleCard
          module="birth"
          primary={`${summary.births.toLocaleString()} certificates`}
          onOpen={go('birth')}
          breakdown={[{ label: 'Registered citizens', value: summary.citizens, tone: 'good' }]}
        />
        <ModuleCard
          module="nid"
          primary={`${summary.activeCards.toLocaleString()} active cards`}
          onOpen={go('nid')}
          breakdown={[]}
        />
        <ModuleCard
          module="residency"
          primary={`${summary.households.toLocaleString()} books`}
          onOpen={go('residency')}
          breakdown={[{ label: 'Residents', value: summary.citizens, tone: 'neutral' }]}
        />
        <ModuleCard
          module="family"
          primary={`${summary.households.toLocaleString()} households`}
          onOpen={go('family')}
          breakdown={[{ label: 'Active marriages', value: summary.marriages, tone: 'neutral' }]}
        />
      </div>

      {/* RECENT ACTIVITY (live audit trail) */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-600" />
            <h2 className="text-sm font-bold text-slate-900">Recent Registry Activity</h2>
          </div>
          <span className="text-[11px] text-slate-400">Latest {recentActivity.length} events</span>
        </div>
        <div className="divide-y divide-slate-100">
          {recentActivity.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
              <Clock className="h-6 w-6 text-slate-300" />
              <p className="text-xs font-medium text-slate-400">No registry activity recorded yet.</p>
            </div>
          )}
          {recentActivity.map((item) => {
            const meta = moduleMeta[moduleForTable(item.target_table)];
            const Icon = meta.icon;
            return (
              <div key={item.id} className="flex items-center gap-3 px-6 py-3.5 hover:bg-slate-50/50 transition">
                <div className={`rounded-lg ${meta.tileBg} ${meta.tileText} p-2 shrink-0`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-800">{activityLabel(item)}</p>
                  <p className="text-[11px] text-slate-400">by {item.actor}</p>
                </div>
                <span className="shrink-0 text-[11px] font-medium text-slate-400">{formatWhen(item.performed_at)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
