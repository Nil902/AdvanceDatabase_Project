import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { getStoredUser, getToken, api } from '../../lib/api';
import { AuthGuard } from '../../components/AuthGuard';
import { registrarPath } from './constants';
import type { DashboardTab, ModuleKey } from './types';
import { DashboardLayout } from './components/DashboardLayout';
import { OverviewTab } from './components/OverviewTab';
import { UserManagementTab, useUsers } from './components/UserManagementTab';
import { PerformanceTab } from './components/PerformanceTab';
import { ProfileSettingsTab, useProfileForm } from './components/ProfileSettingsTab';
import { AuditLogsTab } from './components/AuditLogsTab';
import { SecuritySettingsTab, useSecuritySettings } from './components/SecuritySettingsTab';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState<DashboardTab>('overview');

  const user = getStoredUser<{ name: string; email: string }>();
  const profile = useProfileForm(user?.name ?? '', user?.email ?? '');
  const users = useUsers();
  const security = useSecuritySettings();

  const goToModule = (module: ModuleKey) => navigate(`/registrar/${registrarPath[module]}`);

  return (
    <AuthGuard area="admin">
      <DashboardLayout
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        profileName={profile.name}
        profileEmail={profile.email}
      >
        {currentTab === 'overview' && <OverviewTab onNavigate={goToModule} />}
        {currentTab === 'users' && <UserManagementTab users={users} />}
        {currentTab === 'performance' && <PerformanceTab />}
        {currentTab === 'profile' && <ProfileSettingsTab profile={profile} />}
        {currentTab === 'audit' && <AuditLogsTab />}
        {currentTab === 'security' && <SecuritySettingsTab security={security} />}
      </DashboardLayout>
    </AuthGuard>
  );
}
