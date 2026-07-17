// Types shared across more than one dashboard section. Types used by only a
// single section live in that section's own file.

export interface UserAccount {
  id: string;
  name: string;
  avatar: string;
  lastActive: string;
  email: string;
  role: 'ADMIN' | 'USER';
  status: 'Active' | 'Inactive' | 'Suspended';
}

// The registrar modules surfaced on the overview screen.
export type ModuleKey = 'birth' | 'nid' | 'residency' | 'family';

// The sections addressable from the sidebar.
export type DashboardTab = 'overview' | 'users' | 'performance' | 'profile' | 'audit' | 'security';

export interface BreakdownEntry {
  label: string;
  value: number;
  tone: 'good' | 'warn' | 'bad' | 'neutral';
}
