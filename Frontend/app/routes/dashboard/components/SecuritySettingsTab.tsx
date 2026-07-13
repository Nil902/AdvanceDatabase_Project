import { useState } from 'react';
import { AlertTriangle, ChevronDown } from 'lucide-react';

// Global authentication / session configuration flags. Lifted to the page so
// changes persist across tab switches; hence the hook lives here but is called
// by the dashboard root.
export function useSecuritySettings() {
  const [mfaRequired, setMfaRequired] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState('15');
  const [ipRestriction, setIpRestriction] = useState(false);

  return {
    mfaRequired, setMfaRequired,
    sessionTimeout, setSessionTimeout,
    ipRestriction, setIpRestriction,
  };
}

export type SecuritySettings = ReturnType<typeof useSecuritySettings>;

// Global authentication / session policy toggles.
export function SecuritySettingsTab({ security }: { security: SecuritySettings }) {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Security Settings</h1>
        <p className="text-xs text-slate-500">Global rule parameters mapping authentication mechanisms and environment variables.</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          <div className="p-6 flex items-center justify-between gap-8 transition hover:bg-slate-50/30">
            <div className="space-y-1"><label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">Enforce Multi-Factor Authentication</label><span className="text-xs text-slate-400 block max-w-xl leading-relaxed">Require dual-factor matching tokens for standard personnel sessions.</span></div>
            <button type="button" onClick={() => security.setMfaRequired(!security.mfaRequired)} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${security.mfaRequired ? 'bg-slate-950' : 'bg-slate-200'}`}><span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${security.mfaRequired ? 'translate-x-5' : 'translate-x-0'}`} /></button>
          </div>
          <div className="p-6 flex items-center justify-between gap-8 transition hover:bg-slate-50/30">
            <div className="space-y-1"><label htmlFor="timeout-menu" className="text-xs font-bold text-slate-900 uppercase tracking-wider block">Session Inactivity Timeout</label><span className="text-xs text-slate-400 block max-w-xl leading-relaxed">Evict connection sessions automatically after a duration of structural inactivity.</span></div>
            <div className="relative shrink-0">
              <select id="timeout-menu" value={security.sessionTimeout} onChange={(e) => security.setSessionTimeout(e.target.value)} className="w-40 appearance-none rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-3 pr-10 text-xs font-bold text-slate-800 outline-none transition cursor-pointer hover:border-slate-300 focus:border-slate-400 focus:bg-white"><option value="5">5 Minutes</option><option value="15">15 Minutes</option><option value="30">30 Minutes</option><option value="60">1 Hour</option></select>
              <ChevronDown className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div className="p-6 flex items-center justify-between gap-8 transition hover:bg-slate-50/30">
            <div className="space-y-1"><label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">Restrict Access via Institutional IPs</label><span className="text-xs text-slate-400 block max-w-xl leading-relaxed">Block account authentication attempts initiated outside designated hardware nodes.</span></div>
            <button type="button" onClick={() => security.setIpRestriction(!security.ipRestriction)} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${security.ipRestriction ? 'bg-slate-950' : 'bg-slate-200'}`}><span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${security.ipRestriction ? 'translate-x-5' : 'translate-x-0'}`} /></button>
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 flex gap-3.5 shadow-xs">
        <div className="rounded-lg bg-amber-100 p-2 text-amber-700 h-9 w-9 flex items-center justify-center shrink-0"><AlertTriangle className="h-4 w-4" /></div>
        <div className="text-xs text-amber-900 space-y-1"><h5 className="font-bold tracking-wide text-amber-900 uppercase text-[10px]">Global Parameter Modification Warning</h5><p className="leading-relaxed font-medium text-slate-600">Altering configuration flags modifies validation variables platform-wide instantly. Validate operations protocol before saving parameters.</p></div>
      </div>
    </div>
  );
}
