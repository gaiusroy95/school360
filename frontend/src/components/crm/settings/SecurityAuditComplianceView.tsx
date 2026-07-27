import { useCallback, useEffect, useState } from 'react';
import {
  RefreshCw, Lock, Cloud, UploadCloud, Activity, Database, History,
  List, DownloadCloud, FileBarChart, CheckCircle2, AlertTriangle, Shield,
} from 'lucide-react';
import {
  executeSecurityBackup,
  fetchActionHistory,
  fetchDataChangeLogs,
  fetchExportLogs,
  fetchLoginHistory,
  fetchLoginSessions,
  fetchSecurityAuditOverview,
  fetchUserActivityLogs,
  generateAuditReport,
  syncSecurityAudit,
  type SecurityAuditOverview,
} from '../../../lib/settingsSecurityAuditServices';
import { AcademicLoading, AcademicPageHeader, AcademicPageShell, am } from '../AcademicManagement/AcademicManagementUi';

type TabKey = 'encryption' | 'backup' | 'login-activity' | 'user-activity' | 'data-changes' | 'login-history' | 'action-history' | 'export-logs' | 'reports';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'encryption', label: 'Data Encryption', icon: <Lock size={14} /> },
  { key: 'backup', label: 'Backup & Create', icon: <Cloud size={14} /> },
  { key: 'login-activity', label: 'Login Activity', icon: <Activity size={14} /> },
  { key: 'user-activity', label: 'User Activity Log', icon: <List size={14} /> },
  { key: 'data-changes', label: 'Data Change Log', icon: <Database size={14} /> },
  { key: 'login-history', label: 'Login History', icon: <History size={14} /> },
  { key: 'action-history', label: 'Action History', icon: <Shield size={14} /> },
  { key: 'export-logs', label: 'Export Logs', icon: <DownloadCloud size={14} /> },
  { key: 'reports', label: 'Audit Reports', icon: <FileBarChart size={14} /> },
];

function LogTable({ rows, columns }: { rows: Array<Record<string, unknown>>; columns: { key: string; label: string }[] }) {
  if (!rows.length) return <p className="text-xs text-slate-500">No records found.</p>;
  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50">
            {columns.map((c) => <th key={c.key} className="text-left px-3 py-2 font-bold text-slate-600">{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-slate-100">
              {columns.map((c) => (
                <td key={c.key} className="px-3 py-2 text-slate-700 max-w-[200px] truncate">
                  {String(row[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SecurityAuditComplianceView({ initialTab = 'encryption' }: { initialTab?: TabKey }) {
  const [data, setData] = useState<SecurityAuditOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [detailRows, setDetailRows] = useState<Array<Record<string, unknown>>>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reportFrom, setReportFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [reportTo, setReportTo] = useState(() => new Date().toISOString().slice(0, 10));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchSecurityAuditOverview());
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTabData = useCallback(async (activeTab: TabKey) => {
    setDetailLoading(true);
    try {
      switch (activeTab) {
        case 'login-activity':
          setDetailRows((await fetchLoginSessions()).sessions);
          break;
        case 'user-activity':
          setDetailRows((await fetchUserActivityLogs()).logs);
          break;
        case 'data-changes':
          setDetailRows((await fetchDataChangeLogs()).logs);
          break;
        case 'login-history':
          setDetailRows((await fetchLoginHistory()).logs);
          break;
        case 'action-history':
          setDetailRows((await fetchActionHistory()).logs);
          break;
        case 'export-logs':
          setDetailRows((await fetchExportLogs()).logs);
          break;
        default:
          setDetailRows([]);
      }
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadTabData(tab); }, [tab, loadTabData]);

  const handleSync = async () => {
    const res = await syncSecurityAudit();
    setMessage(res.message);
    void load();
  };

  const handleBackup = async () => {
    const res = await executeSecurityBackup();
    setMessage(res.message);
    void load();
  };

  const handleReport = async () => {
    const res = await generateAuditReport({
      dateFrom: new Date(reportFrom).toISOString(),
      dateTo: new Date(`${reportTo}T23:59:59`).toISOString(),
    });
    setMessage(res.message);
    void load();
  };

  if (loading && !data) return <AcademicLoading label="Loading security & compliance…" />;

  const piiCount = Array.isArray(data?.encryption?.piiFields) ? data!.encryption!.piiFields.length : 0;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Settings Management › Security & Compliance"
        title="Security, Audit & Compliance"
        subtitle="Data encryption, backup destinations, login monitoring, audit trails, export logs, and compliance reports"
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

        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2 mb-4">
          {[
            { label: 'Active Sessions', value: data?.stats.activeSessions ?? 0 },
            { label: 'Suspicious', value: data?.stats.suspiciousSessions ?? 0, warn: true },
            { label: 'User Activity', value: data?.stats.userActivityCount ?? 0 },
            { label: 'Data Changes', value: data?.stats.dataChangeCount ?? 0 },
            { label: 'Login History', value: data?.stats.loginHistoryCount ?? 0 },
            { label: 'High-Privilege', value: data?.stats.actionHistoryCount ?? 0 },
            { label: 'Exports', value: data?.stats.exportLogCount ?? 0 },
          ].map((s) => (
            <div key={s.label} className={`${am.card} p-3 text-center`}>
              <p className="text-[10px] text-slate-500 font-semibold">{s.label}</p>
              <p className={`text-lg font-bold ${s.warn && Number(s.value) > 0 ? 'text-amber-600' : 'text-slate-800'}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-1 mb-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                tab === t.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {tab === 'encryption' && (
          <div className={`${am.card} space-y-2`}>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Lock size={16} className="text-red-600" />Data Encryption Policy</h3>
            <p>Algorithm: <strong>{data?.encryption?.algorithm ?? '—'}</strong></p>
            <p>Vault: <strong>{data?.encryption?.vaultProvider ?? '—'}</strong> (Key: <code className="text-[10px]">{data?.encryption?.vaultKeyId?.slice(0, 16) ?? '—'}…</code>)</p>
            <p>At rest: <strong>{data?.encryption?.encryptAtRest ? 'Yes' : 'No'}</strong> · In transit: <strong>{data?.encryption?.encryptInTransit ? 'Yes' : 'No'}</strong></p>
            <p>PII fields protected: <strong>{piiCount}</strong></p>
            <p className="text-xs text-slate-500">Configure in Institution Setup → Security Settings → Data Encryption, then Sync from Setup.</p>
          </div>
        )}

        {tab === 'backup' && (
          <div className="space-y-4">
            <div className={`${am.card} space-y-2`}>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Cloud size={16} className="text-blue-600" />Backup Locations</h3>
              {data?.destinations.map((d) => (
                <div key={d.id} className="text-xs border border-slate-100 rounded p-2">
                  <strong>{d.label}</strong> ({d.destinationType}) — {d.uri}
                  <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${d.validationStatus === 'VALIDATED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {d.validationStatus}
                  </span>
                </div>
              ))}
              <button type="button" onClick={() => void handleBackup()} className={am.btnPrimary}>
                <UploadCloud size={14} /> Execute Backup Now
              </button>
            </div>
            <div className={`${am.card}`}>
              <h3 className="text-sm font-bold text-slate-800 mb-2">Recent Backups</h3>
              <LogTable
                rows={(data?.recentBackups ?? []) as Array<Record<string, unknown>>}
                columns={[
                  { key: 'status', label: 'Status' },
                  { key: 'tablesCount', label: 'Tables' },
                  { key: 'checksum', label: 'Checksum' },
                  { key: 'triggeredBy', label: 'By' },
                  { key: 'startedAt', label: 'Started' },
                ]}
              />
            </div>
          </div>
        )}

        {tab === 'reports' && (
          <div className={`${am.card} space-y-3 max-w-lg`}>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><FileBarChart size={16} />Audit Log Reports</h3>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-semibold text-slate-600">From<input type="date" className={am.input} value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} /></label>
              <label className="text-xs font-semibold text-slate-600">To<input type="date" className={am.input} value={reportTo} onChange={(e) => setReportTo(e.target.value)} /></label>
            </div>
            <button type="button" onClick={() => void handleReport()} className={am.btnPrimary}>Compile Compliance Report</button>
            {data?.recentReports?.length ? (
              <div className="mt-2">
                <p className="text-xs font-semibold text-slate-600 mb-1">Recent Reports</p>
                {data.recentReports.map((r) => (
                  <div key={r.id} className="text-xs border border-slate-100 rounded p-2 mb-1">
                    {r.reportType} — {r.status} — checksum <code>{r.checksum.slice(0, 12)}…</code>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {['login-activity', 'user-activity', 'data-changes', 'login-history', 'action-history', 'export-logs'].includes(tab) && (
          <div className={`${am.card}`}>
            {detailLoading ? (
              <p className="text-xs text-slate-500">Loading…</p>
            ) : (
              <LogTable
                rows={detailRows}
                columns={
                  tab === 'login-activity'
                    ? [
                        { key: 'userEmail', label: 'User' },
                        { key: 'ipAddress', label: 'IP' },
                        { key: 'geoLocation', label: 'Geo' },
                        { key: 'status', label: 'Status' },
                        { key: 'isSuspicious', label: 'Suspicious' },
                        { key: 'loginAt', label: 'Login At' },
                      ]
                    : tab === 'user-activity'
                      ? [
                          { key: 'userEmail', label: 'User' },
                          { key: 'action', label: 'Action' },
                          { key: 'module', label: 'Module' },
                          { key: 'ipAddress', label: 'IP' },
                          { key: 'createdAt', label: 'Time' },
                        ]
                      : tab === 'data-changes'
                        ? [
                            { key: 'tableName', label: 'Table' },
                            { key: 'operation', label: 'Op' },
                            { key: 'userEmail', label: 'User' },
                            { key: 'entityId', label: 'Entity' },
                            { key: 'createdAt', label: 'Time' },
                          ]
                        : tab === 'login-history'
                          ? [
                              { key: 'userEmail', label: 'User' },
                              { key: 'eventType', label: 'Event' },
                              { key: 'ipAddress', label: 'IP' },
                              { key: 'failureReason', label: 'Reason' },
                              { key: 'createdAt', label: 'Time' },
                            ]
                          : tab === 'action-history'
                            ? [
                                { key: 'actionCategory', label: 'Category' },
                                { key: 'action', label: 'Action' },
                                { key: 'severity', label: 'Severity' },
                                { key: 'userEmail', label: 'User' },
                                { key: 'createdAt', label: 'Time' },
                              ]
                            : [
                                { key: 'userEmail', label: 'User' },
                                { key: 'exportFormat', label: 'Format' },
                                { key: 'fileName', label: 'File' },
                                { key: 'rowsExported', label: 'Rows' },
                                { key: 'createdAt', label: 'Time' },
                              ]
                }
              />
            )}
            {tab === 'login-activity' && (data?.stats.suspiciousSessions ?? 0) > 0 && (
              <p className="mt-2 text-xs text-amber-700 flex items-center gap-1"><AlertTriangle size={12} /> Suspicious brute-force patterns detected.</p>
            )}
          </div>
        )}

        <p className="text-xs text-slate-500 mt-4">
          Configure policies in <strong>Institution Setup → Security Settings</strong> and <strong>Backup & Recovery</strong>, then save or use Sync from Setup.
        </p>
      </div>
    </AcademicPageShell>
  );
}
