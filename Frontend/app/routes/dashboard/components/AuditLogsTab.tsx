import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api, ApiError, type Paginated } from '../../../lib/api';

// Matches AuditLogController@index output.
interface AuditLog {
  id: number;
  action: string;
  target_table: string | null;
  target_id: number | null;
  actor: string;
  ip_address: string | null;
  user_agent: string | null;
  performed_at: string | null;
}

// Read-only chronological ledger of user actions (user_action_logs).
export function AuditLogsTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Paginated<AuditLog>>('/admin/audit-logs', { per_page: 100 })
      .then((res) => setLogs(res.data))
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load audit logs.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Audit Logs</h1>
        <p className="text-xs text-slate-500">Chronological ledger recording administrative actions and operations.</p>
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800">{error}</div>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3.5">Log ID</th>
              <th className="px-6 py-3.5">Timestamp</th>
              <th className="px-6 py-3.5">Actor</th>
              <th className="px-6 py-3.5">Action</th>
              <th className="px-6 py-3.5">Target</th>
              <th className="px-6 py-3.5">IP Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
            {loading && (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
            )}
            {!loading && logs.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400 font-medium">No audit activity recorded yet.</td></tr>
            )}
            {!loading && logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50/50 transition text-[11px]">
                <td className="px-6 py-3.5 font-mono font-bold text-slate-900">{log.id}</td>
                <td className="px-6 py-3.5 font-mono text-slate-500">{log.performed_at ?? '—'}</td>
                <td className="px-6 py-3.5 font-bold text-slate-700">{log.actor}</td>
                <td className="px-6 py-3.5 text-slate-800">{log.action}</td>
                <td className="px-6 py-3.5 text-slate-500">{log.target_table ? `${log.target_table}${log.target_id ? `#${log.target_id}` : ''}` : '—'}</td>
                <td className="px-6 py-3.5 font-mono text-slate-500">{log.ip_address ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
