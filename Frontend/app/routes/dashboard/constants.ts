import type React from 'react';
import { FileText, CreditCard, BookOpen, Users } from 'lucide-react';
import type { BreakdownEntry, ModuleKey } from './types';

export const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100';

// Maps a module to its registrar route segment. Used to navigate from the
// overview cards into the actual portal pages.
export const registrarPath: Record<ModuleKey, string> = {
  birth: 'birth-certificate',
  nid: 'national-id',
  residency: 'residency-book',
  family: 'family-management',
};

export const moduleMeta: Record<ModuleKey, {
  name: string;
  icon: React.ElementType;
  tileBg: string;
  tileText: string;
  linkText: string;
}> = {
  birth: { name: 'Birth Certificates', icon: FileText, tileBg: 'bg-blue-50', tileText: 'text-blue-600', linkText: 'text-blue-600' },
  nid: { name: 'National ID Cards', icon: CreditCard, tileBg: 'bg-purple-50', tileText: 'text-purple-600', linkText: 'text-purple-600' },
  residency: { name: 'Residency Books', icon: BookOpen, tileBg: 'bg-amber-50', tileText: 'text-amber-600', linkText: 'text-amber-600' },
  family: { name: 'Family Management', icon: Users, tileBg: 'bg-emerald-50', tileText: 'text-emerald-600', linkText: 'text-emerald-600' },
};

export const toneDot: Record<BreakdownEntry['tone'], string> = {
  good: 'bg-emerald-500',
  warn: 'bg-amber-500',
  bad: 'bg-rose-500',
  neutral: 'bg-slate-400',
};
