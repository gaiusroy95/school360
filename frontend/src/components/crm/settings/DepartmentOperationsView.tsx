import { useCallback, useEffect, useState } from 'react';
import {
  RefreshCw, Building2, UserCog, Users, MapPin, Wallet, CalendarDays, Palmtree,
  LayoutGrid, GraduationCap, PartyPopper, ClipboardList, Sun, Sparkles, CheckCircle2, Download,
} from 'lucide-react';
import {
  fetchDepartmentOpsOverview,
  holidayCalendarExportUrl,
  syncDepartmentOps,
  type DepartmentOpsOverview,
} from '../../../lib/settingsDepartmentOperationsServices';
import { AcademicLoading, AcademicPageHeader, AcademicPageShell, am } from '../AcademicManagement/AcademicManagementUi';

type TabKey =
  | 'departments' | 'heads' | 'staff' | 'locations' | 'budgets'
  | 'important-dates' | 'holidays' | 'comprehensive' | 'academic' | 'events' | 'exams' | 'holiday-cal' | 'custom';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'departments', label: 'Department List', icon: <Building2 size={14} /> },
  { key: 'heads', label: 'HOD / Incharge', icon: <UserCog size={14} /> },
  { key: 'staff', label: 'Department Staff', icon: <Users size={14} /> },
  { key: 'locations', label: 'Department Location', icon: <MapPin size={14} /> },
  { key: 'budgets', label: 'Department Budget', icon: <Wallet size={14} /> },
  { key: 'important-dates', label: 'Important Dates', icon: <CalendarDays size={14} /> },
  { key: 'holidays', label: 'Holidays', icon: <Palmtree size={14} /> },
  { key: 'comprehensive', label: 'Comprehensive View', icon: <LayoutGrid size={14} /> },
  { key: 'academic', label: 'Academic Calendar', icon: <GraduationCap size={14} /> },
  { key: 'events', label: 'Event Calendar', icon: <PartyPopper size={14} /> },
  { key: 'exams', label: 'Exam Calendar', icon: <ClipboardList size={14} /> },
  { key: 'holiday-cal', label: 'Holiday Calendar', icon: <Sun size={14} /> },
  { key: 'custom', label: 'Custom Events', icon: <Sparkles size={14} /> },
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

export function DepartmentOperationsView() {
  const [data, setData] = useState<DepartmentOpsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState<TabKey>('departments');

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await fetchDepartmentOpsOverview()); } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleSync = async () => {
    const res = await syncDepartmentOps();
    setMessage(res.message);
    void load();
  };

  if (loading && !data) return <AcademicLoading label="Loading department & operations…" />;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Settings Management › Department & Operations Management"
        title="Department & Operations Management"
        subtitle="Departments, HOD appointments, staff mapping, locations, budgets, calendars, holidays, and custom events"
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

        {tab === 'departments' && (
          <Table rows={data?.departments ?? []} cols={[
            { key: 'departmentCode', label: 'Code' },
            { key: 'departmentName', label: 'Name' },
            { key: 'hrLinked', label: 'HR Linked' },
            { key: 'isActive', label: 'Active' },
          ]} />
        )}
        {tab === 'heads' && (
          <Table rows={data?.heads ?? []} cols={[
            { key: 'department', label: 'Department' },
            { key: 'staffName', label: 'HOD / Incharge' },
            { key: 'tenureStart', label: 'Tenure Start' },
            { key: 'tenureEnd', label: 'Tenure End' },
          ]} />
        )}
        {tab === 'staff' && (
          <Table rows={data?.staff ?? []} cols={[
            { key: 'department', label: 'Department' },
            { key: 'staffName', label: 'Staff' },
            { key: 'mappingType', label: 'Mapping' },
          ]} />
        )}
        {tab === 'locations' && (
          <Table rows={data?.locations ?? []} cols={[
            { key: 'department', label: 'Department' },
            { key: 'building', label: 'Building' },
            { key: 'floor', label: 'Floor' },
            { key: 'campus', label: 'Campus' },
          ]} />
        )}
        {tab === 'budgets' && (
          <Table rows={data?.budgets ?? []} cols={[
            { key: 'department', label: 'Department' },
            { key: 'fiscalYear', label: 'Fiscal Year' },
            { key: 'allocated', label: 'Allocated' },
            { key: 'spent', label: 'Spent' },
            { key: 'remaining', label: 'Remaining' },
          ]} />
        )}
        {tab === 'important-dates' && (
          <Table rows={data?.importantDates ?? []} cols={[
            { key: 'title', label: 'Title' },
            { key: 'eventDate', label: 'Date' },
            { key: 'priority', label: 'Priority' },
            { key: 'category', label: 'Category' },
          ]} />
        )}
        {tab === 'holidays' && (
          <Table rows={data?.holidays ?? []} cols={[
            { key: 'name', label: 'Holiday' },
            { key: 'date', label: 'Date' },
            { key: 'type', label: 'Type' },
            { key: 'applicableTo', label: 'Scope' },
          ]} />
        )}
        {tab === 'comprehensive' && (
          <Table rows={(data?.comprehensiveCalendar ?? []).map((e) => ({
            title: e.title,
            category: e.category,
            date: e.date,
            endDate: e.endDate ?? '—',
            source: e.fromHolidayMaster ? 'Holiday Master' : 'Calendar Setup',
          }))} cols={[
            { key: 'date', label: 'Date' },
            { key: 'title', label: 'Event' },
            { key: 'category', label: 'Layer' },
            { key: 'source', label: 'Source' },
          ]} />
        )}
        {tab === 'academic' && (
          <Table rows={data?.academicCalendar ?? []} cols={[
            { key: 'title', label: 'Title' },
            { key: 'startDate', label: 'Start' },
            { key: 'endDate', label: 'End' },
            { key: 'academicYear', label: 'Year' },
          ]} />
        )}
        {tab === 'events' && (
          <Table rows={data?.eventCalendar ?? []} cols={[
            { key: 'title', label: 'Event' },
            { key: 'startDate', label: 'Start' },
            { key: 'audience', label: 'Audience' },
            { key: 'location', label: 'Location' },
          ]} />
        )}
        {tab === 'exams' && (
          <Table rows={data?.examSchedules ?? []} cols={[
            { key: 'name', label: 'Exam' },
            { key: 'startDate', label: 'Start' },
            { key: 'endDate', label: 'End' },
            { key: 'classRange', label: 'Classes' },
          ]} />
        )}
        {tab === 'holiday-cal' && (
          <div className={`${am.card} space-y-3`}>
            <p className="text-sm text-slate-600">Export official holiday schedules for staff and student groups (iCal format for Outlook, Apple Calendar, etc.).</p>
            <div className="flex flex-wrap gap-2">
              {['ALL', 'STAFF', 'STUDENTS'].map((aud) => (
                <a key={aud} href={holidayCalendarExportUrl(aud)} className={am.btnSecondary}>
                  <Download size={14} /> Export {aud === 'ALL' ? 'All' : aud} Holidays (.ics)
                </a>
              ))}
            </div>
            <Table rows={data?.holidays ?? []} cols={[
              { key: 'date', label: 'Date' },
              { key: 'name', label: 'Holiday' },
              { key: 'applicableTo', label: 'Scope' },
            ]} />
          </div>
        )}
        {tab === 'custom' && (
          <Table rows={data?.customEvents ?? []} cols={[
            { key: 'title', label: 'Event' },
            { key: 'startDate', label: 'Start' },
            { key: 'departmentCode', label: 'Department' },
            { key: 'invitees', label: 'Invitees' },
          ]} />
        )}

        <p className="text-xs text-slate-500 mt-4">
          Configure in <strong>Institution Setup → Departments Setup</strong>, <strong>Session & Term Setup</strong>, and <strong>Calendar Setup</strong>.
        </p>
      </div>
    </AcademicPageShell>
  );
}
