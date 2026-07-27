import { useCallback, useEffect, useState } from 'react';
import {
  RefreshCw, Upload, Users, History, Download, CalendarClock, Power, Settings, GitMerge,
  Key, ListOrdered, Palette, Pipette, Code, Menu, LayoutDashboard, CheckCircle2,
} from 'lucide-react';
import {
  fetchDataModulesUiOverview,
  fetchImportLogDetail,
  importEmployees,
  importParents,
  syncDataModulesUi,
  type DataModulesUiOverview,
} from '../../../lib/settingsDataModulesUiServices';
import { AcademicLoading, AcademicPageHeader, AcademicPageShell, am } from '../AcademicManagement/AcademicManagementUi';

type TabKey =
  | 'import-employees' | 'import-parents' | 'import-history' | 'export-history' | 'scheduled-exports'
  | 'module-activation' | 'module-config' | 'workflows' | 'feature-perms' | 'module-order'
  | 'theme' | 'colors' | 'custom-css' | 'menus' | 'dashboard';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'import-employees', label: 'Import Employees', icon: <Upload size={14} /> },
  { key: 'import-parents', label: 'Import Parents', icon: <Users size={14} /> },
  { key: 'import-history', label: 'Import History', icon: <History size={14} /> },
  { key: 'export-history', label: 'Export History', icon: <Download size={14} /> },
  { key: 'scheduled-exports', label: 'Scheduled Exports', icon: <CalendarClock size={14} /> },
  { key: 'module-activation', label: 'Module Activation', icon: <Power size={14} /> },
  { key: 'module-config', label: 'Module Configuration', icon: <Settings size={14} /> },
  { key: 'workflows', label: 'Workflow Settings', icon: <GitMerge size={14} /> },
  { key: 'feature-perms', label: 'Feature Permissions', icon: <Key size={14} /> },
  { key: 'module-order', label: 'Module Order', icon: <ListOrdered size={14} /> },
  { key: 'theme', label: 'Theme Settings', icon: <Palette size={14} /> },
  { key: 'colors', label: 'Color Schemes', icon: <Pipette size={14} /> },
  { key: 'custom-css', label: 'Custom CSS', icon: <Code size={14} /> },
  { key: 'menus', label: 'Menu Management', icon: <Menu size={14} /> },
  { key: 'dashboard', label: 'Dashboard Widgets', icon: <LayoutDashboard size={14} /> },
];

function Table({ rows, cols }: { rows: Array<Record<string, unknown>>; cols: { key: string; label: string }[] }) {
  if (!rows.length) return <p className="text-xs text-slate-500">No records. Sync from Institution Setup.</p>;
  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg">
      <table className="w-full text-xs">
        <thead><tr className="bg-slate-50">{cols.map((c) => <th key={c.key} className="text-left px-3 py-2 font-bold">{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-slate-100">
              {cols.map((c) => <td key={c.key} className="px-3 py-2">{String(row[c.key] ?? '—')}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.trim().split('\n').filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const vals = line.split(',').map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ''; });
    return row;
  });
}

export function DataModulesUiView() {
  const [data, setData] = useState<DataModulesUiOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState<TabKey>('import-employees');
  const [csvInput, setCsvInput] = useState('');
  const [importDetail, setImportDetail] = useState<Record<string, unknown> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await fetchDataModulesUiOverview()); } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleSync = async () => {
    const res = await syncDataModulesUi();
    setMessage(res.message);
    void load();
  };

  const runImport = async (type: 'employees' | 'parents') => {
    const rows = parseCsv(csvInput);
    if (!rows.length) { setMessage('Paste CSV with header row first'); return; }
    const res = type === 'employees'
      ? await importEmployees(rows, 'paste.csv')
      : await importParents(rows, 'paste.csv');
    setMessage(`Imported ${res.successCount} rows, ${res.errorCount} errors (log: ${res.logId})`);
    setCsvInput('');
    void load();
  };

  const viewImportLog = async (logId: string) => {
    setImportDetail(await fetchImportLogDetail(logId));
  };

  if (loading && !data) return <AcademicLoading label="Loading data management & UI…" />;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Settings Management › Data Management, Modules & UI"
        title="Data Management, Modules & UI"
        subtitle="Bulk imports, export history, module activation, workflows, theme, menus, and dashboard widgets"
        actions={(
          <button type="button" onClick={() => void handleSync()} className={am.btnSecondary}>
            <RefreshCw size={14} /> Sync from Setup
          </button>
        )}
      />

      <div className={am.content}>
        {message && (
          <div className="mb-4 px-4 py-2 bg-teal-50 text-teal-800 text-sm rounded-lg border border-teal-200 flex items-center gap-2">
            <CheckCircle2 size={16} />{message}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2 mb-4">
          {Object.entries(data?.stats ?? {}).map(([k, v]) => (
            <div key={k} className={`${am.card} p-2 text-center`}>
              <p className="text-[10px] text-slate-500 font-semibold capitalize">{k.replace(/([A-Z])/g, ' $1')}</p>
              <p className="text-base font-bold text-slate-800">{v}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-1 mb-4">
          {TABS.map((t) => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className={`flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium rounded-lg border ${tab === t.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {(tab === 'import-employees' || tab === 'import-parents') && (
          <div className={`${am.card} space-y-3`}>
            <p className="text-sm text-slate-600">
              Paste CSV data (header row required). {tab === 'import-employees'
                ? 'Columns: employeeCode, fullName, department, mobile, email'
                : 'Columns: parentName, mobile, studentAdmissionNumber, relationship'}
            </p>
            <textarea className="w-full h-32 text-xs border border-slate-200 rounded-lg p-2 font-mono" value={csvInput}
              onChange={(e) => setCsvInput(e.target.value)}
              placeholder={tab === 'import-employees'
                ? 'employeeCode,fullName,department,mobile,email\nEMP001,John Doe,Science,9876543210,john@school.edu'
                : 'parentName,mobile,studentAdmissionNumber,relationship\nJane Doe,9876543210,ADM2025001,MOTHER'} />
            <button type="button" className={am.btnPrimary} onClick={() => void runImport(tab === 'import-employees' ? 'employees' : 'parents')}>
              <Upload size={14} /> Run Import
            </button>
          </div>
        )}

        {tab === 'import-history' && (
          <div className="space-y-3">
            <Table rows={data?.importLogs ?? []} cols={[
              { key: 'createdAt', label: 'Date' },
              { key: 'importType', label: 'Type' },
              { key: 'fileName', label: 'File' },
              { key: 'status', label: 'Status' },
              { key: 'successCount', label: 'Success' },
              { key: 'errorCount', label: 'Errors' },
            ]} />
            <div className="flex flex-wrap gap-2">
              {(data?.importLogs ?? []).slice(0, 5).map((l) => (
                <button key={String(l.id)} type="button" className={am.btnSecondary} onClick={() => void viewImportLog(String(l.id))}>
                  View errors: {String(l.id).slice(0, 8)}
                </button>
              ))}
            </div>
            {importDetail && (
              <pre className="text-xs bg-slate-50 border rounded-lg p-3 overflow-auto max-h-48">
                {JSON.stringify(importDetail.errorMatrix, null, 2)}
              </pre>
            )}
          </div>
        )}

        {tab === 'export-history' && (
          <Table rows={data?.exportHistory ?? []} cols={[
            { key: 'createdAt', label: 'Date' },
            { key: 'userEmail', label: 'User' },
            { key: 'module', label: 'Module' },
            { key: 'exportFormat', label: 'Format' },
            { key: 'rowsExported', label: 'Rows' },
          ]} />
        )}

        {tab === 'scheduled-exports' && (
          <Table rows={data?.scheduledExports ?? []} cols={[
            { key: 'jobName', label: 'Job' },
            { key: 'cronExpression', label: 'Cron' },
            { key: 'targetUri', label: 'Target URI' },
            { key: 'exportFormat', label: 'Format' },
            { key: 'isActive', label: 'Active' },
          ]} />
        )}

        {tab === 'module-activation' && (
          <Table rows={data?.systemModules ?? []} cols={[
            { key: 'sortOrder', label: 'Order' },
            { key: 'moduleCode', label: 'Code' },
            { key: 'moduleLabel', label: 'Module' },
            { key: 'isActive', label: 'Active' },
            { key: 'licenseKey', label: 'License' },
          ]} />
        )}

        {tab === 'module-config' && (
          <Table rows={data?.systemModules ?? []} cols={[
            { key: 'moduleCode', label: 'Module' },
            { key: 'moduleLabel', label: 'Label' },
            { key: 'isActive', label: 'Active' },
          ]} />
        )}

        {tab === 'workflows' && (
          <Table rows={(data?.workflowRules ?? []).map((w) => ({
            ...w,
            approvalSequence: JSON.stringify(w.approvalSequence),
          }))} cols={[
            { key: 'workflowType', label: 'Type' },
            { key: 'ruleName', label: 'Rule' },
            { key: 'approvalSequence', label: 'Sequence' },
            { key: 'thresholdAmount', label: 'Threshold' },
          ]} />
        )}

        {tab === 'feature-perms' && (
          <Table rows={data?.featurePermissions ?? []} cols={[
            { key: 'moduleCode', label: 'Module' },
            { key: 'featureCode', label: 'Feature' },
            { key: 'roleCode', label: 'Role' },
            { key: 'accessLevel', label: 'Access' },
          ]} />
        )}

        {tab === 'module-order' && (
          <Table rows={(data?.menuStructures ?? []).map((m) => ({
            ...m,
            moduleOrder: JSON.stringify(m.moduleOrder),
          }))} cols={[
            { key: 'roleCode', label: 'Role' },
            { key: 'moduleOrder', label: 'Module Order' },
          ]} />
        )}

        {tab === 'theme' && data?.themeSettings && (
          <div className={`${am.card} space-y-1 text-sm`}>
            <p>Brand: <strong>{String(data.themeSettings.brandName)}</strong></p>
            <p>Font: <strong>{String(data.themeSettings.fontFamily)}</strong></p>
            <p>Logo: <strong>{String(data.themeSettings.logoUrl || '—')}</strong></p>
          </div>
        )}

        {tab === 'colors' && (
          <Table rows={data?.colorSchemes ?? []} cols={[
            { key: 'schemeName', label: 'Scheme' },
            { key: 'primaryColor', label: 'Primary' },
            { key: 'secondaryColor', label: 'Secondary' },
            { key: 'accentColor', label: 'Accent' },
            { key: 'isActive', label: 'Active' },
          ]} />
        )}

        {tab === 'custom-css' && (
          <div className={`${am.card}`}>
            {(data?.customCss ?? []).length ? (
              (data?.customCss ?? []).map((c) => (
                <pre key={String(c.id)} className="text-xs bg-slate-900 text-green-400 p-3 rounded-lg overflow-auto max-h-64 mb-2">{String(c.cssContent)}</pre>
              ))
            ) : (
              <p className="text-xs text-slate-500">No custom CSS. Add in Institution Setup → Modules & UI Setup.</p>
            )}
          </div>
        )}

        {tab === 'menus' && (
          <Table rows={(data?.uiMenus ?? []).map((m) => ({
            ...m,
            menuTree: JSON.stringify(m.menuTree),
          }))} cols={[
            { key: 'roleCode', label: 'Role' },
            { key: 'menuTree', label: 'Navigation Tree' },
          ]} />
        )}

        {tab === 'dashboard' && (
          <Table rows={(data?.dashboardPreferences ?? []).map((d) => ({
            ...d,
            widgets: JSON.stringify(d.widgets),
          }))} cols={[
            { key: 'roleCode', label: 'Role' },
            { key: 'widgets', label: 'Widgets' },
          ]} />
        )}

        <p className="text-xs text-slate-500 mt-4">
          Configure in <strong>Institution Setup → Data Import / Export</strong> and <strong>Modules & UI Setup</strong>.
        </p>
      </div>
    </AcademicPageShell>
  );
}
