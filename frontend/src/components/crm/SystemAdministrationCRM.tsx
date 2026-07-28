import { SubModuleView } from './shared/SubModuleView';
import { AdminDashboardLiveView } from './admin/AdminDashboardLiveView';
import { SystemOperationsLiveView } from './admin/SystemOperationsLiveView';
import { SecurityBackupAuditLiveView } from './admin/SecurityBackupAuditLiveView';
import { IntegrationsApiUpdatesLiveView } from './admin/IntegrationsApiUpdatesLiveView';
import { UserGovernanceView } from './settings/UserGovernanceView';
import { LicenseSupportLiveView } from './admin/LicenseSupportLiveView';

const DATABASE_VIEWS = new Set(['Database Manager', 'Database Management']);
const SERVER_VIEWS = new Set(['Server Monitor', 'Server & Performance']);
const SECURITY_VIEWS = new Set(['Security Manager', 'Security Management']);
const BACKUP_VIEWS = new Set(['Backup Manager', 'Backup & Restore']);
const LOGS_VIEWS = new Set(['System Logs', 'Audit Logs']);
const SYSTEM_CONFIG_VIEWS = new Set(['System Configuration', 'System Settings']);
const LICENSE_VIEWS = new Set(['License Management', 'License Manager']);
const SUPPORT_VIEWS = new Set(['Support & Maintenance']);

export function SystemAdministrationCRM({ currentView = 'Admin Dashboard' }: { currentView?: string }) {
  if (currentView === 'Admin Dashboard') {
    return <AdminDashboardLiveView />;
  }

  if (currentView === 'User & Access Control' || currentView === 'User Management') {
    return <UserGovernanceView initialTab="users" />;
  }

  if (currentView === 'Role & Permission') {
    return <UserGovernanceView initialTab="roles" />;
  }

  if (SYSTEM_CONFIG_VIEWS.has(currentView)) {
    return <SystemOperationsLiveView initialTab="environment" />;
  }

  if (DATABASE_VIEWS.has(currentView)) {
    return <SystemOperationsLiveView initialTab="database" />;
  }

  if (SERVER_VIEWS.has(currentView)) {
    return <SystemOperationsLiveView initialTab="server" />;
  }

  if (SECURITY_VIEWS.has(currentView)) {
    return <SecurityBackupAuditLiveView initialTab="firewall" />;
  }

  if (BACKUP_VIEWS.has(currentView)) {
    return <SecurityBackupAuditLiveView initialTab="backup" />;
  }

  if (LOGS_VIEWS.has(currentView)) {
    return <SecurityBackupAuditLiveView initialTab="forensics" />;
  }

  if (currentView === 'Email & SMS Gateway') {
    return <IntegrationsApiUpdatesLiveView initialTab="gateways" />;
  }

  if (currentView === 'API Management') {
    return <IntegrationsApiUpdatesLiveView initialTab="api" />;
  }

  if (currentView === 'System Updates') {
    return <IntegrationsApiUpdatesLiveView initialTab="updates" />;
  }

  if (LICENSE_VIEWS.has(currentView)) {
    return <LicenseSupportLiveView initialTab="license" />;
  }

  if (SUPPORT_VIEWS.has(currentView)) {
    return <LicenseSupportLiveView initialTab="support" />;
  }

  if (currentView && currentView !== 'Admin Dashboard') {
    return <SubModuleView module="System Administration" title={currentView} />;
  }

  return <AdminDashboardLiveView />;
}
