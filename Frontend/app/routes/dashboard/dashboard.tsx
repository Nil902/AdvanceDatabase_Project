import { useState } from 'react';
import { useNavigate } from 'react-router';
import { registrarPath } from './constants';
import type { DashboardTab, ModuleKey } from './types';
import { DashboardLayout } from './components/DashboardLayout';
import { OverviewTab } from './components/OverviewTab';
import { UserManagementTab, useUsers } from './components/UserManagementTab';
import { ProfileSettingsTab, useProfileForm } from './components/ProfileSettingsTab';
import { AuditLogsTab } from './components/AuditLogsTab';
import { SecuritySettingsTab, useSecuritySettings } from './components/SecuritySettingsTab';

// Composition root for the admin dashboard. Owns the active tab and the shared
// stateful controllers (profile / users / security), then renders the matching
// section inside the layout shell. Each section lives in its own file.
export default function DashboardPage() {
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState<DashboardTab>('overview');

  const profile = useProfileForm();
  const users = useUsers();
  const security = useSecuritySettings();

  const goToModule = (module: ModuleKey) => navigate(`/registrar/${registrarPath[module]}`);

  return (
    <DashboardLayout
      currentTab={currentTab}
      onTabChange={setCurrentTab}
      profileName={profile.name}
      profileEmail={profile.email}
    >
      {currentTab === 'overview' && <OverviewTab onNavigate={goToModule} />}
      {currentTab === 'users' && <UserManagementTab users={users} />}
      {currentTab === 'profile' && <ProfileSettingsTab profile={profile} />}
      {currentTab === 'audit' && <AuditLogsTab />}
      {currentTab === 'security' && <SecuritySettingsTab security={security} />}
    </DashboardLayout>
  );
}
