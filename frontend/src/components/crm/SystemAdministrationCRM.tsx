import { lazy, Suspense, type ReactNode } from 'react';
import { SubModuleView } from './shared/SubModuleView';

const AdminDashboardLiveView = lazy(() =>
  import('./admin/AdminDashboardLiveView').then((m) => ({ default: m.AdminDashboardLiveView })),
);
const SystemOperationsLiveView = lazy(() =>
  import('./admin/SystemOperationsLiveView').then((m) => ({ default: m.SystemOperationsLiveView })),
);
const SecurityBackupAuditLiveView = lazy(() =>
  import('./admin/SecurityBackupAuditLiveView').then((m) => ({ default: m.SecurityBackupAuditLiveView })),
);
const IntegrationsApiUpdatesLiveView = lazy(() =>
  import('./admin/IntegrationsApiUpdatesLiveView').then((m) => ({ default: m.IntegrationsApiUpdatesLiveView })),
);
const UserGovernanceView = lazy(() =>
  import('./settings/UserGovernanceView').then((m) => ({ default: m.UserGovernanceView })),
);
const LicenseSupportLiveView = lazy(() =>
  import('./admin/LicenseSupportLiveView').then((m) => ({ default: m.LicenseSupportLiveView })),
);

const DATABASE_VIEWS = new Set(['Database Manager', 'Database Management']);
const SERVER_VIEWS = new Set(['Server Monitor', 'Server & Performance']);
const SECURITY_VIEWS = new Set(['Security Manager', 'Security Management']);
const BACKUP_VIEWS = new Set(['Backup Manager', 'Backup & Restore']);
const LOGS_VIEWS = new Set(['System Logs', 'Audit Logs']);
const SYSTEM_CONFIG_VIEWS = new Set(['System Configuration', 'System Settings']);
const LICENSE_VIEWS = new Set(['License Management', 'License Manager']);
const SUPPORT_VIEWS = new Set(['Support & Maintenance']);

function wrap(node: ReactNode) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[30vh] text-sm text-slate-400">Loading page…</div>}>
      {node}
    </Suspense>
  );
}

export function SystemAdministrationCRM({ currentView = 'Admin Dashboard' }: { currentView?: string }) {
  if (currentView === 'Admin Dashboard') {
    return wrap(<AdminDashboardLiveView />);
  }

  if (currentView === 'User & Access Control' || currentView === 'User Management') {
    return wrap(<UserGovernanceView initialTab="users" />);
  }

  if (currentView === 'Role & Permission') {
    return wrap(<UserGovernanceView initialTab="roles" />);
  }

  if (SYSTEM_CONFIG_VIEWS.has(currentView)) {
    return wrap(<SystemOperationsLiveView initialTab="environment" />);
  }

  if (DATABASE_VIEWS.has(currentView)) {
    return wrap(<SystemOperationsLiveView initialTab="database" />);
  }

  if (SERVER_VIEWS.has(currentView)) {
    return wrap(<SystemOperationsLiveView initialTab="server" />);
  }

  if (SECURITY_VIEWS.has(currentView)) {
    return wrap(<SecurityBackupAuditLiveView initialTab="firewall" />);
  }

  if (BACKUP_VIEWS.has(currentView)) {
    return wrap(<SecurityBackupAuditLiveView initialTab="backup" />);
  }

  if (LOGS_VIEWS.has(currentView)) {
    return wrap(<SecurityBackupAuditLiveView initialTab="forensics" />);
  }

  if (currentView === 'Email & SMS Gateway') {
    return wrap(<IntegrationsApiUpdatesLiveView initialTab="gateways" />);
  }

  if (currentView === 'API Management') {
    return wrap(<IntegrationsApiUpdatesLiveView initialTab="api" />);
  }

  if (currentView === 'System Updates') {
    return wrap(<IntegrationsApiUpdatesLiveView initialTab="updates" />);
  }

  if (LICENSE_VIEWS.has(currentView)) {
    return wrap(<LicenseSupportLiveView initialTab="license" />);
  }

  if (SUPPORT_VIEWS.has(currentView)) {
    return wrap(<LicenseSupportLiveView initialTab="support" />);
  }

  if (currentView && currentView !== 'Admin Dashboard') {
    return <SubModuleView module="System Administration" title={currentView} />;
  }

  return wrap(<AdminDashboardLiveView />);
}
