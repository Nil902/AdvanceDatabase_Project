import { useCallback, useEffect, useState } from 'react';
import type React from 'react';
import {
  Database,
  Server,
  Activity,
  RefreshCw,
  ExternalLink,
  HardDrive,
  Gauge,
  AlertTriangle,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { api } from '../../../lib/api';

// ── API response shapes (App\Http\Controllers\Api\V1\PerformanceController) ──
interface DbMetrics {
  status: 'up' | 'down';
  error?: string;
  database?: string;
  version?: string;
  uptime?: string;
  size?: { bytes: number; pretty: string };
  connections?: { active: number; idle: number; idle_in_transaction: number; total: number; max: number };
  cache_hit_ratio?: number;
  transactions?: { commit: number; rollback: number };
  tuples?: { inserted: number; updated: number; deleted: number; returned: number; fetched: number };
  deadlocks?: number;
  temp_files?: number;
  tables?: { name: string; rows: number; size: string; size_bytes: number; seq_scan: number; idx_scan: number }[];
}

interface RedisMetrics {
  status: 'up' | 'down';
  error?: string;
  version?: string;
  mode?: string;
  uptime_seconds?: number;
  connected_clients?: number;
  memory?: { used?: string; used_bytes: number; peak?: string; fragmentation_ratio: number };
  stats?: {
    total_connections_received: number;
    total_commands_processed: number;
    instantaneous_ops_per_sec: number;
    keyspace_hits: number;
    keyspace_misses: number;
    hit_rate: number;
    evicted_keys: number;
    expired_keys: number;
  };
  keyspace?: Record<string, number>;
  total_keys?: number;
}

interface PgBadger {
  url: string;
  index_url: string;
  description: string;
}

function StatusPill({ up }: { up: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
        up ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
      }`}
    >
      {up ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
      {up ? 'Online' : 'Unreachable'}
    </span>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  sub,
  tileBg,
  tileText,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  tileBg: string;
  tileText: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg ${tileBg} ${tileText} p-2.5`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <span className="block text-[11px] font-medium text-slate-500">{label}</span>
          <h3 className="mt-0.5 text-base font-bold text-slate-900">{value}</h3>
        </div>
      </div>
      {sub && <p className="mt-2 text-[11px] font-medium text-slate-400">{sub}</p>}
    </div>
  );
}

// Colour a ratio: green when healthy, amber when so-so, rose when poor.
function ratioTone(pct: number, goodAt = 95, warnAt = 80) {
  if (pct >= goodAt) return { tileBg: 'bg-emerald-50', tileText: 'text-emerald-600' };
  if (pct >= warnAt) return { tileBg: 'bg-amber-50', tileText: 'text-amber-600' };
  return { tileBg: 'bg-rose-50', tileText: 'text-rose-600' };
}

export function PerformanceTab() {
  const [db, setDb] = useState<DbMetrics | null>(null);
  const [redis, setRedis] = useState<RedisMetrics | null>(null);
  const [pgbadger, setPgbadger] = useState<PgBadger | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dbRes, redisRes, pgRes] = await Promise.all([
        api.get<DbMetrics>('/admin/performance/database'),
        api.get<RedisMetrics>('/admin/performance/redis'),
        api.get<PgBadger>('/admin/performance/pgbadger'),
      ]);
      setDb(dbRes);
      setRedis(redisRes);
      setPgbadger(pgRes);
      setLastRefreshed(new Date());
    } catch (e: any) {
      setError(e?.message || 'Failed to load performance metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 15000); // auto-refresh every 15s
    return () => clearInterval(id);
  }, [load]);

  const dbHit = ratioTone(db?.cache_hit_ratio ?? 0);
  const redisHit = ratioTone(redis?.stats?.hit_rate ?? 0, 90, 60);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Infrastructure Performance</h1>
          <p className="text-xs text-slate-500">
            Live PostgreSQL and Redis telemetry, plus the pgBadger log-analysis report.
            {lastRefreshed && ` Updated ${lastRefreshed.toLocaleTimeString()}.`}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-slate-900 disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── PostgreSQL ─────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-blue-600" />
          <h2 className="text-sm font-bold text-slate-900">PostgreSQL Database</h2>
          <StatusPill up={db?.status === 'up'} />
          {db?.version && <span className="text-[11px] text-slate-400">v{db.version} · uptime {db.uptime}</span>}
        </div>

        {db?.status === 'down' && (
          <p className="text-xs text-rose-700">{db.error}</p>
        )}

        {db?.status === 'up' && (
          <>
            <div className="grid grid-cols-4 gap-4">
              <Metric icon={HardDrive} tileBg="bg-blue-50" tileText="text-blue-600" label="Database Size"
                value={db.size?.pretty ?? '—'} sub={db.database} />
              <Metric icon={Gauge} {...dbHit} label="Cache Hit Ratio"
                value={`${db.cache_hit_ratio ?? 0}%`} sub="Buffer cache efficiency" />
              <Metric icon={Activity} tileBg="bg-indigo-50" tileText="text-indigo-600" label="Connections"
                value={`${db.connections?.total ?? 0} / ${db.connections?.max ?? 0}`}
                sub={`${db.connections?.active ?? 0} active · ${db.connections?.idle ?? 0} idle`} />
              <Metric icon={Zap} tileBg="bg-purple-50" tileText="text-purple-600" label="Transactions"
                value={(db.transactions?.commit ?? 0).toLocaleString()}
                sub={`${(db.transactions?.rollback ?? 0).toLocaleString()} rollbacks · ${db.deadlocks ?? 0} deadlocks`} />
            </div>

            {db.tables && db.tables.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-3">
                  <h3 className="text-xs font-bold text-slate-900">Largest Tables</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="text-slate-400">
                      <tr className="border-b border-slate-100">
                        <th className="px-6 py-2 font-semibold">Table</th>
                        <th className="px-6 py-2 font-semibold text-right">Rows</th>
                        <th className="px-6 py-2 font-semibold text-right">Size</th>
                        <th className="px-6 py-2 font-semibold text-right">Seq scans</th>
                        <th className="px-6 py-2 font-semibold text-right">Index scans</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {db.tables.map((t) => (
                        <tr key={t.name} className="hover:bg-slate-50/50">
                          <td className="px-6 py-2 font-semibold text-slate-700">{t.name}</td>
                          <td className="px-6 py-2 text-right text-slate-600">{t.rows.toLocaleString()}</td>
                          <td className="px-6 py-2 text-right text-slate-600">{t.size}</td>
                          <td className="px-6 py-2 text-right text-slate-600">{t.seq_scan.toLocaleString()}</td>
                          <td className="px-6 py-2 text-right text-slate-600">{t.idx_scan.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Redis ──────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-rose-600" />
          <h2 className="text-sm font-bold text-slate-900">Redis Cache &amp; Queue</h2>
          <StatusPill up={redis?.status === 'up'} />
          {redis?.version && <span className="text-[11px] text-slate-400">v{redis.version} · {redis.mode}</span>}
        </div>

        {redis?.status === 'down' && (
          <p className="text-xs text-rose-700">{redis.error}</p>
        )}

        {redis?.status === 'up' && (
          <div className="grid grid-cols-4 gap-4">
            <Metric icon={HardDrive} tileBg="bg-rose-50" tileText="text-rose-600" label="Memory Used"
              value={redis.memory?.used ?? '—'} sub={`Peak ${redis.memory?.peak ?? '—'}`} />
            <Metric icon={Gauge} {...redisHit} label="Hit Rate"
              value={`${redis.stats?.hit_rate ?? 0}%`}
              sub={`${(redis.stats?.keyspace_hits ?? 0).toLocaleString()} hits · ${(redis.stats?.keyspace_misses ?? 0).toLocaleString()} misses`} />
            <Metric icon={Activity} tileBg="bg-amber-50" tileText="text-amber-600" label="Clients"
              value={String(redis.connected_clients ?? 0)}
              sub={`${redis.stats?.instantaneous_ops_per_sec ?? 0} ops/sec`} />
            <Metric icon={Database} tileBg="bg-emerald-50" tileText="text-emerald-600" label="Keys Stored"
              value={(redis.total_keys ?? 0).toLocaleString()}
              sub={`${(redis.stats?.expired_keys ?? 0).toLocaleString()} expired · ${(redis.stats?.evicted_keys ?? 0).toLocaleString()} evicted`} />
          </div>
        )}
      </section>

      {/* ── pgBadger ───────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-600" />
          <h2 className="text-sm font-bold text-slate-900">pgBadger Log Report</h2>
        </div>
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-xs text-slate-500">
            {pgbadger?.description ??
              'pgBadger analyses PostgreSQL query logs into a detailed performance report (slowest queries, temp files, locks, connection histograms). Regenerated hourly.'}
          </p>
          <a
            href={pgbadger?.index_url ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-white shadow transition ${
              pgbadger ? 'bg-emerald-600 hover:bg-emerald-700' : 'pointer-events-none bg-slate-300'
            }`}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open pgBadger Report
          </a>
        </div>
      </section>
    </div>
  );
}
