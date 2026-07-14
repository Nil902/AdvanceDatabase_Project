interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  ipAddress: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

// TODO: GET /api/v1/audit-logs
const auditLogs: AuditLog[] = [
  { id: 'LOG-8821', timestamp: '2026-07-04 22:15:32', actor: 'admin@corporate.com', action: 'Modified system firewall parameters', ipAddress: '192.168.1.45', severity: 'WARNING' },
  { id: 'LOG-8820', timestamp: '2026-07-04 21:04:11', actor: 'alex.rivera@corporate.com', action: 'Provisioned standard user clearance token', ipAddress: '192.168.1.92', severity: 'INFO' },
  { id: 'LOG-8819', timestamp: '2026-07-04 19:42:01', actor: 'SYSTEM_DAEMON', action: 'Database query execution optimization completed', ipAddress: 'localhost', severity: 'INFO' },
  { id: 'LOG-8818', timestamp: '2026-07-04 18:22:50', actor: 'UNKNOWN_HOST', action: 'Failed SSH terminal authentication sequence match', ipAddress: '45.221.12.8', severity: 'CRITICAL' },
];

// Read-only chronological security ledger of administrative actions.
export function AuditLogsTab() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Audit Logs</h1>
        <p className="text-xs text-slate-500">Chronological security ledger recording administrative actions and operations.</p>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
          <tr><th className="px-6 py-3.5">Log ID</th><th className="px-6 py-3.5">Timestamp</th><th className="px-6 py-3.5">Actor</th><th className="px-6 py-3.5">Executed Action</th><th className="px-6 py-3.5">IP Address</th><th className="px-6 py-3.5 text-center">Severity</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
          {auditLogs.map((log) => (
            <tr key={log.id} className="hover:bg-slate-50/50 transition font-mono text-[11px]">
              <td className="px-6 py-3.5 text-slate-900 font-bold">{log.id}</td><td className="px-6 py-3.5 text-slate-500">{log.timestamp}</td><td className="px-6 py-3.5 text-slate-700 font-bold font-sans">{log.actor}</td><td className="px-6 py-3.5 text-slate-800 max-w-xs truncate font-sans font-medium">{log.action}</td><td className="px-6 py-3.5 text-slate-500">{log.ipAddress}</td>
              <td className="px-6 py-3.5"><div className="flex justify-center"><span className={`inline-flex items-center rounded px-2 py-0.5 text-[9px] font-bold tracking-wide uppercase ${log.severity === 'CRITICAL' ? 'bg-red-50 text-red-700 border border-red-100' : log.severity === 'WARNING' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-slate-100 text-slate-600'}`}>{log.severity}</span></div></td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
