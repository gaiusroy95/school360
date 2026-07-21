import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchEnquiries,
  fetchEnquiryMeta,
  fetchEnquiryAnalytics,
  fetchEnquiryActivities,
  fetchFollowUpTasks,
  addEnquiry,
  updateEnquiry,
  updateEnquiryStatus,
  deleteEnquiry,
  logActivity,
  addFollowUpTask,
  importEnquiries,
  type Enquiry,
  type Activity,
  type FollowUpTask,
  type EnquiryStatus,
  type EnquiryAnalytics,
  type EnquiryMeta,
  type EnquiryInput,
} from '../../../lib/admissionServices';
import { createApplicationFromEnquiry } from '../../../lib/applicationServices';
import { downloadEnquiryTemplate, parseEnquiryWorkbook } from '../../../lib/enquiryExcel';
import { useAuth } from '../../../contexts/AuthContext';
import { viewKeyToPath } from '../../../lib/urlRoutes';
import { toViewKey } from '../../../lib/navigation';
import {
  Users,
  UserPlus,
  RefreshCw,
  CheckCircle,
  XCircle,
  Percent,
  Phone,
  Mail,
  Edit,
  Trash2,
  Plus,
  Calendar,
  Clock,
  Download,
  X,
  Search,
  Filter,
  MessageSquare,
  UploadCloud,
  PieChart as PieChartIcon,
  Target,
  AlertCircle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  AreaChart,
  Area,
} from 'recharts';

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#9333ea', '#dc2626', '#0891b2'];
const STATUS_TABS = ['All', 'New', 'In Process', 'Converted', 'Not Interested'] as const;
type StatusTab = (typeof STATUS_TABS)[number];

type QuickModal =
  | 'followUp'
  | 'logMeeting'
  | 'addNote'
  | 'sendMessage'
  | 'assign'
  | 'convert'
  | 'createApplication'
  | null;

const EMPTY_ANALYTICS: EnquiryAnalytics = {
  kpis: {
    total: 0,
    new: 0,
    inProcess: 0,
    followUp: 0,
    converted: 0,
    notInterested: 0,
    conversionRate: 0,
  },
  overview: [],
  bySource: [],
  byClass: [],
  funnel: [],
  topSources: [],
  conversionTrend: [],
};

const EMPTY_META: EnquiryMeta = { classes: [], sources: [], statuses: [], classesFromSetup: false };

/** Ensure Indian mobile numbers are stored with +91 prefix. */
function normalizeIndiaMobile(raw: string): string {
  let v = String(raw || '').trim().replace(/[\s()-]/g, '');
  if (!v) return '+91';
  if (v.startsWith('+91')) {
    const rest = v.slice(3).replace(/\D/g, '');
    return `+91${rest}`;
  }
  if (v.startsWith('91') && v.length >= 12) {
    return `+${v.replace(/\D/g, '')}`;
  }
  if (v.startsWith('0') && v.length === 11) {
    return `+91${v.slice(1).replace(/\D/g, '')}`;
  }
  const digits = v.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith('91') && digits.length >= 12) return `+${digits}`;
  return v.startsWith('+') ? v : `+91${digits || v}`;
}

function formatEnquiryDate(iso: string | undefined): string {
  if (!iso) return '-';
  const slice = iso.slice(0, 10);
  const date = new Date(`${slice}T00:00:00`);
  if (Number.isNaN(date.getTime())) return slice;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatIsoDate(iso: string | undefined): string {
  if (!iso) return '-';
  const slice = iso.slice(0, 10);
  const date = new Date(`${slice}T00:00:00`);
  if (Number.isNaN(date.getTime())) return slice;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatActivityTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (diffHours < 48) return 'Yesterday';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function dueDateLabel(dueDate: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(due.getTime())) return 'Upcoming';
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return 'Overdue';
  if (diffDays === 0) return 'Due Today';
  if (diffDays === 1) return 'Due Tomorrow';
  if (diffDays === 2) return 'In 2 Days';
  if (diffDays === 3) return 'In 3 Days';
  return 'Upcoming';
}

function dueDateStyle(label: string): { color: string; bg: string } {
  switch (label) {
    case 'Overdue':
    case 'Due Today':
      return { color: 'text-red-600', bg: 'bg-red-50' };
    case 'Due Tomorrow':
      return { color: 'text-amber-600', bg: 'bg-amber-50' };
    case 'In 2 Days':
      return { color: 'text-blue-600', bg: 'bg-blue-50' };
    default:
      return { color: 'text-slate-600', bg: 'bg-slate-50' };
  }
}

function tabCount(tab: StatusTab, kpis: EnquiryAnalytics['kpis']): number {
  switch (tab) {
    case 'All':
      return kpis.total;
    case 'New':
      return kpis.new;
    case 'In Process':
      return kpis.inProcess;
    case 'Converted':
      return kpis.converted;
    case 'Not Interested':
      return kpis.notInterested;
    default:
      return 0;
  }
}

function statusBadgeClass(status: EnquiryStatus | string): string {
  if (status === 'New') return 'bg-blue-50 text-blue-600 border-blue-200';
  if (status === 'In Process' || status === 'Follow Up') return 'bg-amber-50 text-amber-600 border-amber-200';
  if (status === 'Converted') return 'bg-emerald-50 text-emerald-600 border-emerald-200';
  return 'bg-red-50 text-red-600 border-red-200';
}

export function EnquiriesManagementView() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [meta, setMeta] = useState<EnquiryMeta>(EMPTY_META);
  const [analytics, setAnalytics] = useState<EnquiryAnalytics>(EMPTY_ANALYTICS);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tasks, setTasks] = useState<FollowUpTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<StatusTab>('All');
  const [filterClass, setFilterClass] = useState('All');
  const [filterSource, setFilterSource] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [quickModal, setQuickModal] = useState<QuickModal>(null);
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const performer = user?.displayName || user?.email || 'Admin';

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg(null);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg(null);
    setTimeout(() => setErrorMsg(null), 5000);
  };

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      const [enqRes, metaRes, analyticsRes, actRes, taskRes] = await Promise.all([
        fetchEnquiries(),
        fetchEnquiryMeta(),
        fetchEnquiryAnalytics(),
        fetchEnquiryActivities(50),
        fetchFollowUpTasks(),
      ]);
      setEnquiries(enqRes.enquiries);
      setMeta(metaRes);
      setAnalytics(analyticsRes);
      setActivities(actRes.activities);
      setTasks(taskRes.tasks);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to load enquiries data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, filterClass, filterSource, filterStatus, searchQuery]);

  const filteredEnquiries = useMemo(() => {
    let result = enquiries;
    if (activeTab !== 'All') {
      result = result.filter((e) => e.status === activeTab);
    }
    if (filterClass !== 'All') {
      result = result.filter((e) => e.classInterested === filterClass);
    }
    if (filterSource !== 'All') {
      result = result.filter((e) => e.source === filterSource);
    }
    if (filterStatus !== 'All') {
      result = result.filter((e) => e.status === filterStatus);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.enquirerName?.toLowerCase().includes(q) ||
          e.enquiryId?.toLowerCase().includes(q) ||
          e.mobile?.includes(q),
      );
    }
    return result;
  }, [enquiries, activeTab, filterClass, filterSource, filterStatus, searchQuery]);

  const totalPages = Math.ceil(filteredEnquiries.length / itemsPerPage) || 1;
  const currentItems = filteredEnquiries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const kpis = analytics.kpis;
  const funnelTotal = kpis.total || 1;

  const taskGroups = useMemo(() => {
    const map = new Map<string, FollowUpTask[]>();
    for (const task of tasks) {
      const key = task.dueDate?.slice(0, 10) || 'unknown';
      const list = map.get(key) || [];
      list.push(task);
      map.set(key, list);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 6)
      .map(([date, groupTasks]) => ({
        date,
        count: groupTasks.length,
        label: dueDateLabel(date),
        tasks: groupTasks,
      }));
  }, [tasks]);

  const handleDelete = async (enq: Enquiry) => {
    if (!enq.id) {
      showError('Cannot delete: missing enquiry id');
      return;
    }
    if (!window.confirm(`Delete enquiry ${enq.enquiryId}?`)) return;
    try {
      await deleteEnquiry(enq.id);
      showSuccess('Enquiry deleted');
      await refreshAll();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete enquiry');
    }
  };

  const handleCallLog = async (enq: Enquiry, channel: 'phone' | 'message') => {
    if (!enq.id) {
      showError('Cannot log activity: missing enquiry id');
      return;
    }
    try {
      await logActivity(enq.id, {
        type: 'Call',
        description: channel === 'phone' ? `Phone call to ${enq.mobile}` : `Message sent to ${enq.mobile}`,
        performedBy: performer,
      });
      showSuccess('Activity logged');
      await refreshAll();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to log activity');
    }
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const rows = parseEnquiryWorkbook(buffer);
      if (rows.length === 0) {
        showError('No valid rows found in the spreadsheet');
        return;
      }
      const replaceAll = window.confirm(
        `Import ${rows.length} enquiries?\n\nClick OK to replace all existing enquiries.\nClick Cancel to append without deleting existing records.`,
      );
      const result = await importEnquiries(rows, replaceAll);
      showSuccess(result.message || `Imported ${result.created} enquiries`);
      await refreshAll();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Import failed');
    }
  };

  const openAddModal = async () => {
    try {
      const metaRes = await fetchEnquiryMeta();
      setMeta(metaRes);
    } catch {
      /* keep existing meta */
    }
    setIsAddModalOpen(true);
  };

  const handleExport = () => {
    const data = filteredEnquiries.length > 0 ? filteredEnquiries : enquiries;
    downloadEnquiryTemplate(data);
    showSuccess(`Exported ${data.length} enquiries`);
  };

  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const mobile = normalizeIndiaMobile(String(formData.get('mobile') || ''));
    const classInterested = String(formData.get('classInterested') || '').trim();
    if (!classInterested) {
      showError('Please select a class from the configured class list.');
      setSubmitting(false);
      return;
    }
    if (!/^\+91\d{10}$/.test(mobile)) {
      showError('Mobile number must be +91 followed by 10 digits.');
      setSubmitting(false);
      return;
    }
    const payload: EnquiryInput = {
      enquirerName: String(formData.get('enquirerName') || ''),
      mobile,
      email: String(formData.get('email') || ''),
      classInterested,
      source: String(formData.get('source') || ''),
      status: 'New',
      assignedTo: String(formData.get('assignedTo') || performer),
      nextFollowUp: String(formData.get('nextFollowUp') || '') || undefined,
      notes: String(formData.get('notes') || '') || undefined,
    };
    try {
      await addEnquiry(payload);
      setIsAddModalOpen(false);
      showSuccess('Enquiry added');
      await refreshAll();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to add enquiry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedEnquiry?.id) {
      showError('Cannot update: missing enquiry id');
      return;
    }
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const mobile = normalizeIndiaMobile(String(formData.get('mobile') || ''));
    if (!/^\+91\d{10}$/.test(mobile)) {
      showError('Mobile number must be +91 followed by 10 digits.');
      setSubmitting(false);
      return;
    }
    const payload: EnquiryInput = {
      enquirerName: String(formData.get('enquirerName') || ''),
      mobile,
      email: String(formData.get('email') || ''),
      classInterested: String(formData.get('classInterested') || ''),
      source: String(formData.get('source') || ''),
      status: String(formData.get('status') || selectedEnquiry.status) as EnquiryStatus,
      assignedTo: String(formData.get('assignedTo') || ''),
      nextFollowUp: String(formData.get('nextFollowUp') || '') || undefined,
      notes: String(formData.get('notes') || '') || undefined,
    };
    try {
      await updateEnquiry(selectedEnquiry.id, payload);
      setIsEditModalOpen(false);
      setSelectedEnquiry(null);
      showSuccess('Enquiry updated');
      await refreshAll();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update enquiry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const enquiryDbId = String(formData.get('enquiryDbId') || '');
    const enq = enquiries.find((x) => x.id === enquiryDbId);
    if (!enquiryDbId || !enq) {
      showError('Please select an enquiry');
      setSubmitting(false);
      return;
    }
    try {
      switch (quickModal) {
        case 'followUp': {
          const title = String(formData.get('title') || '').trim();
          const dueDate = String(formData.get('dueDate') || '');
          const dueTime = String(formData.get('dueTime') || '').trim();
          const mode = String(formData.get('mode') || 'Phone');
          const subject = String(formData.get('subject') || '').trim();
          const discussionNotes = String(formData.get('discussionNotes') || '').trim();
          const assignedTo = String(formData.get('assignedTo') || performer).trim();
          if (!dueDate) throw new Error('Due date is required');
          if (!subject && !title) throw new Error('Subject or title is required');
          await addFollowUpTask(enquiryDbId, {
            title: title || undefined,
            dueDate,
            dueTime: dueTime || undefined,
            mode,
            subject,
            discussionNotes: discussionNotes || undefined,
            assignedTo,
          });
          showSuccess('Follow-up task scheduled');
          break;
        }
        case 'logMeeting': {
          const text = String(formData.get('text') || '');
          if (!text) throw new Error('Meeting notes are required');
          await logActivity(enquiryDbId, { type: 'Visit', description: text, performedBy: performer });
          showSuccess('Meeting logged');
          break;
        }
        case 'addNote': {
          const text = String(formData.get('text') || '');
          if (!text) throw new Error('Note is required');
          await logActivity(enquiryDbId, { type: 'System', description: text, performedBy: performer });
          showSuccess('Note added');
          break;
        }
        case 'sendMessage': {
          const channel = String(formData.get('channel') || 'Email');
          const text = String(formData.get('text') || '');
          await logActivity(enquiryDbId, {
            type: channel === 'SMS' ? 'Call' : 'Email',
            description: text || `${channel} sent to ${enq.enquirerName}`,
            performedBy: performer,
          });
          showSuccess(`${channel} activity logged`);
          break;
        }
        case 'assign': {
          const assignee = String(formData.get('assignee') || '');
          if (!assignee) throw new Error('Assignee name is required');
          await updateEnquiry(enquiryDbId, { assignedTo: assignee });
          showSuccess('Enquiry assigned');
          break;
        }
        case 'convert': {
          await updateEnquiryStatus(enquiryDbId, 'Converted', undefined, user?.id);
          showSuccess('Enquiry converted to admission');
          break;
        }
        case 'createApplication': {
          const notes = String(formData.get('notes') || '').trim();
          await createApplicationFromEnquiry(enquiryDbId, {
            notes,
            submittedBy: performer,
            studentName: String(formData.get('studentName') || enq.enquirerName),
            dateOfBirth: String(formData.get('dateOfBirth') || '') || undefined,
            fatherName: String(formData.get('fatherName') || '') || undefined,
            motherName: String(formData.get('motherName') || '') || undefined,
            placeOfBirth: String(formData.get('placeOfBirth') || '') || undefined,
            classApplied: String(formData.get('classApplied') || enq.classInterested) || undefined,
            mobile: String(formData.get('mobile') || enq.mobile) || undefined,
            email: String(formData.get('email') || enq.email) || undefined,
            address: String(formData.get('address') || '') || undefined,
          });
          showSuccess(`Application created for ${enq.enquirerName}. Opening Applications…`);
          setQuickModal(null);
          await refreshAll();
          // Navigate to Admission CRM → Applications
          const path = viewKeyToPath(toViewKey('Admission CRM', 'Applications'));
          window.history.pushState({}, '', path);
          window.dispatchEvent(new PopStateEvent('popstate'));
          return;
        }
        default:
          break;
      }
      setQuickModal(null);
      await refreshAll();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateApplication = () => {
    if (enquiries.length === 0) {
      showError('Add an enquiry first, then create an application from it.');
      return;
    }
    setQuickModal('createApplication');
  };

  const conversionTrendTotals = useMemo(() => {
    const trend = analytics.conversionTrend;
    if (trend.length === 0) {
      return { enquiries: 0, applications: 0, admissions: 0 };
    }
    const last = trend[trend.length - 1];
    return {
      enquiries: last.enquiries,
      applications: last.applications,
      admissions: last.admissions,
    };
  }, [analytics.conversionTrend]);

  const appPct =
    conversionTrendTotals.enquiries > 0
      ? ((conversionTrendTotals.applications / conversionTrendTotals.enquiries) * 100).toFixed(1)
      : '0.0';
  const admPct =
    conversionTrendTotals.enquiries > 0
      ? ((conversionTrendTotals.admissions / conversionTrendTotals.enquiries) * 100).toFixed(1)
      : '0.0';

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleImportFile}
      />

      <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full">
        {/* Banners */}
        {successMsg && (
          <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm">
            <CheckCircle size={16} />
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
            <AlertCircle size={16} />
            {errorMsg}
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Enquiries Management</h1>
            <p className="text-sm text-slate-500 mt-1">Admission CRM &gt; Enquiries</p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleImportClick}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2 shadow-sm"
            >
              <Download size={16} /> Import Enquiries
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2 shadow-sm"
            >
              <UploadCloud size={16} /> Export Report
            </button>
            <button
              type="button"
              onClick={() => void refreshAll()}
              disabled={refreshing}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              type="button"
              onClick={() => void openAddModal()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2 shadow-sm"
            >
              <Plus size={16} /> Add Enquiry
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard title="Total Enquiries" value={kpis.total} icon={<Users className="text-blue-600" size={24} />} color="blue" />
          <KpiCard title="New Enquiries" value={kpis.new} icon={<UserPlus className="text-green-600" size={24} />} color="green" />
          <KpiCard title="In Process" value={kpis.inProcess} icon={<RefreshCw className="text-amber-600" size={24} />} color="amber" />
          <KpiCard title="Converted" value={kpis.converted} icon={<CheckCircle className="text-purple-600" size={24} />} color="purple" />
          <KpiCard title="Not Interested" value={kpis.notInterested} icon={<XCircle className="text-red-600" size={24} />} color="red" />
          <KpiCard
            title="Conversion Rate"
            value={`${kpis.conversionRate.toFixed(2)}%`}
            icon={<Percent className="text-teal-600" size={24} />}
            color="teal"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <ChartCard title="Enquiries Overview">
            <div className="h-48">
              {analytics.overview.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.overview}>
                    <defs>
                      <linearGradient id="colorOverview" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorOverview)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart message="No overview data yet" />
              )}
            </div>
          </ChartCard>

          <ChartCard title="Enquiries by Source">
            <div className="flex h-48 items-center justify-between">
              {analytics.bySource.length > 0 ? (
                <>
                  <div className="w-1/2 h-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={analytics.bySource} innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value">
                          {analytics.bySource.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xl font-bold text-slate-800">{kpis.total}</span>
                      <span className="text-[10px] text-slate-500">Total</span>
                    </div>
                  </div>
                  <div className="w-1/2 flex flex-col justify-center space-y-2">
                    {analytics.bySource.slice(0, 6).map((item, index) => (
                      <div key={item.name} className="flex justify-between items-center text-[10px]">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="text-slate-600 truncate max-w-[60px]">{item.name}</span>
                        </div>
                        <span className="text-slate-800 font-medium">
                          {item.value}{' '}
                          <span className="text-slate-400">
                            ({kpis.total ? Math.round((item.value / kpis.total) * 100) : 0}%)
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyChart message="No source data yet" />
              )}
            </div>
          </ChartCard>

          <ChartCard title="Enquiries by Class">
            <div className="h-48">
              {analytics.byClass.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.byClass} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} width={60} />
                    <Tooltip contentStyle={{ fontSize: '12px' }} cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={8} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart message="No class data yet" />
              )}
            </div>
          </ChartCard>

          <ChartCard title="Enquiry Funnel">
            <div className="h-48 flex flex-col justify-center items-center px-4 space-y-1 w-full">
              {analytics.funnel.length > 0 ? (
                analytics.funnel.map((step, i) => {
                  const width = Math.max(30, 100 - i * 15);
                  const colors = ['bg-blue-600', 'bg-sky-500', 'bg-teal-500', 'bg-emerald-500', 'bg-green-600'];
                  return (
                    <div key={step.name} className="w-full flex items-center justify-between group">
                      <div className="w-[120px] flex justify-center">
                        <div
                          className={`${colors[i % colors.length]} h-7 transition-all duration-300 flex items-center justify-center shadow-sm text-white text-[10px]`}
                          style={{ width: `${width}%`, clipPath: 'polygon(5% 0, 95% 0, 100% 100%, 0 100%)' }}
                        />
                      </div>
                      <div className="flex-1 flex justify-between items-center pl-4 border-l border-slate-100 ml-2">
                        <span className="text-xs text-slate-600">{step.name}</span>
                        <span className="text-xs font-semibold text-slate-800">
                          {step.value}{' '}
                          <span className="text-slate-400 font-normal">
                            ({Math.round((step.value / funnelTotal) * 100)}%)
                          </span>
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <EmptyChart message="No funnel data yet" />
              )}
            </div>
          </ChartCard>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-slate-800">Enquiries List</h3>
                  <div className="flex gap-2 flex-wrap">
                    <select
                      className="text-xs border border-slate-300 rounded-lg px-2 py-1.5"
                      value={filterClass}
                      onChange={(ev) => setFilterClass(ev.target.value)}
                    >
                      <option value="All">Select Class</option>
                      {meta.classes.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <select
                      className="text-xs border border-slate-300 rounded-lg px-2 py-1.5"
                      value={filterSource}
                      onChange={(ev) => setFilterSource(ev.target.value)}
                    >
                      <option value="All">Select Source</option>
                      {meta.sources.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <select
                      className="text-xs border border-slate-300 rounded-lg px-2 py-1.5"
                      value={filterStatus}
                      onChange={(ev) => setFilterStatus(ev.target.value)}
                    >
                      <option value="All">Select Status</option>
                      {meta.statuses.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search enquiry..."
                        value={searchQuery}
                        onChange={(ev) => setSearchQuery(ev.target.value)}
                        className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg w-48"
                      />
                      <Search className="absolute left-2.5 top-2 text-slate-400" size={14} />
                    </div>
                    <button type="button" className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 flex items-center gap-1 hover:bg-slate-50">
                      <Filter size={14} /> Filter
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {STATUS_TABS.map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        activeTab === tab ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {tab} ({tabCount(tab, kpis)})
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="p-3 font-semibold">Enquiry ID</th>
                      <th className="p-3 font-semibold">Enquiry Date</th>
                      <th className="p-3 font-semibold">Enquirer Name</th>
                      <th className="p-3 font-semibold">Mobile</th>
                      <th className="p-3 font-semibold">Email</th>
                      <th className="p-3 font-semibold">Class Interested</th>
                      <th className="p-3 font-semibold">Source</th>
                      <th className="p-3 font-semibold">Status</th>
                      <th className="p-3 font-semibold">Assigned To</th>
                      <th className="p-3 font-semibold">Next Follow Up</th>
                      <th className="p-3 font-semibold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={11} className="p-8 text-center text-slate-500">Loading enquiries...</td>
                      </tr>
                    ) : currentItems.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="p-8 text-center text-slate-500">No enquiries found.</td>
                      </tr>
                    ) : (
                      currentItems.map((enq) => (
                        <tr key={enq.id || enq.enquiryId} className="hover:bg-slate-50">
                          <td
                            className="p-3 text-indigo-600 font-medium cursor-pointer"
                            onClick={() => { setSelectedEnquiry(enq); setIsEditModalOpen(true); }}
                          >
                            {enq.enquiryId}
                          </td>
                          <td className="p-3 text-slate-600">{formatEnquiryDate(enq.enquiryDate)}</td>
                          <td className="p-3 font-semibold text-slate-800">{enq.enquirerName}</td>
                          <td className="p-3 text-slate-600">{enq.mobile}</td>
                          <td className="p-3 text-slate-500 truncate max-w-[120px]">{enq.email || '-'}</td>
                          <td className="p-3 text-slate-600">{enq.classInterested}</td>
                          <td className="p-3 text-slate-600">{enq.source}</td>
                          <td className="p-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${statusBadgeClass(enq.status)}`}>
                              {enq.status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600">{enq.assignedTo || '-'}</td>
                          <td className="p-3 text-slate-600">{enq.nextFollowUp ? formatIsoDate(enq.nextFollowUp) : '-'}</td>
                          <td className="p-3">
                            <div className="flex justify-center gap-1 text-slate-400">
                              <button
                                type="button"
                                title="Call"
                                onClick={() => void handleCallLog(enq, 'phone')}
                                className="p-1 hover:text-green-600 hover:bg-green-50 rounded"
                              >
                                <Phone size={14} />
                              </button>
                              <button
                                type="button"
                                title="Message"
                                onClick={() => void handleCallLog(enq, 'message')}
                                className="p-1 hover:text-blue-600 hover:bg-blue-50 rounded"
                              >
                                <MessageSquare size={14} />
                              </button>
                              <button
                                type="button"
                                title="Edit"
                                onClick={() => { setSelectedEnquiry(enq); setIsEditModalOpen(true); }}
                                className="p-1 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                type="button"
                                title="Delete"
                                onClick={() => void handleDelete(enq)}
                                className="p-1 hover:text-red-600 hover:bg-red-50 rounded"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="p-4 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500 bg-white">
                <span>
                  Showing {filteredEnquiries.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to{' '}
                  {Math.min(currentPage * itemsPerPage, filteredEnquiries.length)} of {filteredEnquiries.length} entries
                </span>
                <div className="flex space-x-1">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                  >
                    &lt;
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`px-2 py-1 rounded border ${
                        currentPage === page ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={currentPage === totalPages || filteredEnquiries.length === 0}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                  >
                    &gt;
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom sections */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ChartCard title="Conversion Trend">
                <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                  <div>
                    <div className="text-[10px] text-slate-500">Total Enquiries</div>
                    <div className="font-bold text-slate-800 text-sm">{conversionTrendTotals.enquiries.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">Applications</div>
                    <div className="font-bold text-slate-800 text-sm">
                      {conversionTrendTotals.applications.toLocaleString()}{' '}
                      <span className="text-slate-400 font-normal">({appPct}%)</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">Admissions</div>
                    <div className="font-bold text-slate-800 text-sm">
                      {conversionTrendTotals.admissions.toLocaleString()}{' '}
                      <span className="text-slate-400 font-normal">({admPct}%)</span>
                    </div>
                  </div>
                </div>
                <div className="h-40">
                  {analytics.conversionTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analytics.conversionTrend} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ fontSize: '12px' }} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                        <Line type="monotone" dataKey="enquiries" name="Enquiries" stroke="#3b82f6" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="applications" name="Applications" stroke="#10b981" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="admissions" name="Admissions" stroke="#f59e0b" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyChart message="No conversion trend data yet" />
                  )}
                </div>
              </ChartCard>

              <ChartCard title="Top Performing Sources">
                <div className="space-y-4">
                  {analytics.topSources.length > 0 ? (
                    analytics.topSources.map((src) => (
                      <div key={src.name} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600 font-medium">{src.name}</span>
                          <span className="text-slate-800">
                            {src.pct}% <span className="text-slate-400">({src.val})</span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                          <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${src.pct}%` }} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyChart message="No source performance data yet" />
                  )}
                </div>
              </ChartCard>

              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-semibold text-slate-800 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-4 gap-3">
                  <QuickActionButton icon={<Plus size={20} />} label="Add Enquiry" onClick={() => void openAddModal()} />
                  <QuickActionButton icon={<Calendar size={20} />} label="Schedule Follow Up" onClick={() => setQuickModal('followUp')} />
                  <QuickActionButton icon={<Users size={20} />} label="Log Meeting" onClick={() => setQuickModal('logMeeting')} />
                  <QuickActionButton icon={<Edit size={20} />} label="Add Note" onClick={() => setQuickModal('addNote')} />
                  <QuickActionButton icon={<Mail size={20} />} label="Send Email / SMS" onClick={() => setQuickModal('sendMessage')} />
                  <QuickActionButton icon={<CheckCircle size={20} />} label="Create Application" onClick={handleCreateApplication} />
                  <QuickActionButton icon={<UserPlus size={20} />} label="Assign Enquiry" onClick={() => setQuickModal('assign')} />
                  <QuickActionButton icon={<Target size={20} />} label="Convert to Admission" onClick={() => setQuickModal('convert')} />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-slate-800">Enquiry Activities</h3>
                <button type="button" onClick={() => setShowAllActivities(true)} className="text-xs text-indigo-600 font-medium hover:underline">
                  View All
                </button>
              </div>
              <div className="space-y-4">
                {activities.length > 0 ? (
                  activities.slice(0, 5).map((act, i) => (
                    <div key={act.id || `${act.enquiryId}-${act.timestamp}-${i}`} className="flex gap-3 relative">
                      {i < Math.min(activities.length, 5) - 1 && (
                        <div className="absolute left-3 top-6 bottom-0 w-px bg-slate-200" />
                      )}
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center z-10">
                        {act.type === 'System' ? <Target size={12} className="text-indigo-500" /> :
                         act.type === 'Call' ? <Phone size={12} className="text-green-500" /> :
                         act.type === 'Status Change' ? <RefreshCw size={12} className="text-amber-500" /> :
                         <MessageSquare size={12} className="text-blue-500" />}
                      </div>
                      <div className="flex-1 pb-1 min-w-0">
                        <p className="text-xs font-medium text-slate-800 truncate">{act.description}</p>
                        <p className="text-[10px] text-slate-500">{act.performedBy}</p>
                      </div>
                      <div className="text-[10px] text-slate-400 whitespace-nowrap">{formatActivityTime(act.timestamp)}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-xs text-slate-400 py-4">No recent activities</div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-slate-800">Follow Up Tasks</h3>
                <button type="button" onClick={() => setShowAllTasks(true)} className="text-xs text-indigo-600 font-medium hover:underline">
                  View All
                </button>
              </div>
              <div className="space-y-3">
                {taskGroups.length > 0 ? (
                  taskGroups.map((group) => {
                    const style = dueDateStyle(group.label);
                    return (
                      <div
                        key={group.date}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-md ${style.bg} ${style.color}`}>
                            {group.label === 'Due Today' || group.label === 'Overdue' ? <Clock size={12} /> : <Calendar size={12} />}
                          </div>
                          <div className="text-xs font-medium text-slate-800">
                            {formatIsoDate(group.date)}{' '}
                            <span className="text-slate-400 font-normal">({group.count})</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500">{group.label}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-xs text-slate-400 py-4">No follow-up tasks</div>
                )}
              </div>
            </div>

            <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-4">
              <h3 className="font-semibold text-indigo-900 mb-3 text-sm">Why Manage Enquiries Effectively?</h3>
              <ul className="space-y-2">
                {[
                  'Capture every potential student opportunity',
                  'Track and follow up at the right time',
                  'Improve conversion rate and admissions',
                  'Better communication and engagement',
                  'Data-driven decisions for marketing & growth',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs text-indigo-800/80">
                    <CheckCircle size={12} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Footer benefits */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 grid grid-cols-2 md:grid-cols-5 gap-4 divide-x divide-slate-100">
          <BenefitItem icon={<RefreshCw size={18} />} title="360° Enquiry Tracking" desc="Track enquiries from multiple sources" />
          <BenefitItem icon={<Clock size={18} />} title="Timely Follow Ups" desc="Automated reminders & follow ups" />
          <BenefitItem icon={<Target size={18} />} title="Better Conversion" desc="Increase admissions & revenue" />
          <BenefitItem icon={<Users size={18} />} title="Team Collaboration" desc="Assign & collaborate with team" />
          <BenefitItem icon={<PieChartIcon size={18} />} title="Detailed Reports" desc="Data insights & performance reports" />
        </div>
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <Modal title="Add New Enquiry" icon={<UserPlus size={20} className="text-indigo-600" />} onClose={() => setIsAddModalOpen(false)}>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <EnquiryFormFields meta={meta} performer={performer} />
            <ModalActions onCancel={() => setIsAddModalOpen(false)} submitting={submitting} submitLabel="Save Enquiry" />
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && selectedEnquiry && (
        <Modal title="Edit Enquiry" icon={<Edit size={20} className="text-indigo-600" />} onClose={() => { setIsEditModalOpen(false); setSelectedEnquiry(null); }}>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <EnquiryFormFields meta={meta} performer={performer} enquiry={selectedEnquiry} isEdit />
            <ModalActions onCancel={() => { setIsEditModalOpen(false); setSelectedEnquiry(null); }} submitting={submitting} submitLabel="Update Enquiry" />
          </form>
        </Modal>
      )}

      {/* Quick Action Modal */}
      {quickModal && (
        <Modal
          title={quickModalTitle(quickModal)}
          icon={<Target size={20} className="text-indigo-600" />}
          onClose={() => setQuickModal(null)}
        >
          <form onSubmit={handleQuickSubmit} className="space-y-4">
            <EnquirySelect
              enquiries={enquiries}
              defaultEnquiryId={quickModal === 'createApplication' ? selectedEnquiry?.id : undefined}
            />
            {quickModal === 'followUp' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Counseling Mode</label>
                  <select name="mode" defaultValue="Phone" className="w-full p-2 border border-slate-300 rounded-lg text-sm">
                    <option value="Phone">Phone</option>
                    <option value="Campus Visit">Campus Visit</option>
                    <option value="Video Call">Video Call</option>
                    <option value="Email">Email</option>
                    <option value="In-person Counselling">In-person Counselling</option>
                  </select>
                </div>
                <Field label="Subject *" name="subject" required placeholder="Fee structure, campus tour..." />
                <Field label="Task Title (optional)" name="title" placeholder="Auto-generated if empty" />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Due Date *" name="dueDate" type="date" required />
                  <Field label="Time" name="dueTime" type="time" />
                </div>
                <Field label="Assign Counselor" name="assignedTo" defaultValue={performer} />
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Discussion Notes</label>
                  <textarea name="discussionNotes" rows={2} className="w-full p-2 border border-slate-300 rounded-lg text-sm" placeholder="Notes from conversation..." />
                </div>
              </>
            )}
            {(quickModal === 'logMeeting' || quickModal === 'addNote') && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {quickModal === 'logMeeting' ? 'Meeting Notes *' : 'Note *'}
                </label>
                <textarea name="text" required rows={4} className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Enter details..." />
              </div>
            )}
            {quickModal === 'sendMessage' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Channel</label>
                  <select name="channel" className="w-full p-2 border border-slate-300 rounded-lg text-sm">
                    <option value="Email">Email</option>
                    <option value="SMS">SMS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Message (optional)</label>
                  <textarea name="text" rows={3} className="w-full p-2 border border-slate-300 rounded-lg text-sm" placeholder="Message content..." />
                </div>
              </>
            )}
            {quickModal === 'assign' && (
              <Field label="Assign To *" name="assignee" required placeholder="Counselor name" defaultValue={performer} />
            )}
            {quickModal === 'convert' && (
              <p className="text-sm text-slate-600">This will mark the selected enquiry as <strong>Converted</strong>.</p>
            )}
            {quickModal === 'createApplication' && (
              <>
                <p className="text-sm text-slate-600">
                  Complete the application form. Fields are pre-filled from the enquiry where possible.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Student Name *" name="studentName" required defaultValue={selectedEnquiry?.enquirerName} />
                  <Field label="Date of Birth" name="dateOfBirth" type="date" />
                  <Field label="Father's Name" name="fatherName" />
                  <Field label="Mother's Name" name="motherName" />
                  <Field label="Place of Birth" name="placeOfBirth" />
                  <Field label="Class Applied" name="classApplied" defaultValue={selectedEnquiry?.classInterested} />
                  <Field label="Mobile" name="mobile" defaultValue={selectedEnquiry?.mobile} />
                  <Field label="Email" name="email" type="email" defaultValue={selectedEnquiry?.email} />
                </div>
                <div className="mt-3">
                  <Field label="Address" name="address" />
                </div>
                <div className="mt-3">
                  <Field label="Application Notes" name="notes" placeholder="Optional notes for the application" />
                </div>
              </>
            )}
            <ModalActions onCancel={() => setQuickModal(null)} submitting={submitting} submitLabel="Confirm" />
          </form>
        </Modal>
      )}

      {/* All Activities Modal */}
      {showAllActivities && (
        <Modal title="All Enquiry Activities" icon={<RefreshCw size={20} className="text-indigo-600" />} onClose={() => setShowAllActivities(false)} wide>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {activities.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No activities recorded.</p>
            ) : (
              activities.map((act, i) => (
                <div key={act.id || `${act.enquiryId}-${i}`} className="flex gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                    {act.type === 'Call' ? <Phone size={14} className="text-green-500" /> : <MessageSquare size={14} className="text-blue-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{act.description}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {act.enquiryName || act.enquiryId} · {act.performedBy} · {act.type}
                    </p>
                  </div>
                  <div className="text-xs text-slate-400 whitespace-nowrap">{formatActivityTime(act.timestamp)}</div>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}

      {/* All Tasks Modal */}
      {showAllTasks && (
        <Modal title="All Follow Up Tasks" icon={<Calendar size={20} className="text-indigo-600" />} onClose={() => setShowAllTasks(false)} wide>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {tasks.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No follow-up tasks.</p>
            ) : (
              tasks.map((task, i) => (
                <div key={task.id || `${task.enquiryId}-${i}`} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{task.title}</p>
                    <p className="text-xs text-slate-500">{task.enquiryName || task.enquiryId} · {task.assignedTo}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-slate-700">{formatIsoDate(task.dueDate)}</p>
                    <p className="text-[10px] text-slate-400">{task.status}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function quickModalTitle(modal: NonNullable<QuickModal>): string {
  switch (modal) {
    case 'followUp': return 'Schedule Follow Up';
    case 'logMeeting': return 'Log Meeting';
    case 'addNote': return 'Add Note';
    case 'sendMessage': return 'Send Email / SMS';
    case 'assign': return 'Assign Enquiry';
    case 'convert': return 'Convert to Admission';
    case 'createApplication': return 'Create Application';
    default: return 'Quick Action';
  }
}

interface KpiCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'amber' | 'purple' | 'red' | 'teal';
}

function KpiCard({ title, value, icon, color }: KpiCardProps) {
  const colorMap: Record<KpiCardProps['color'], string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    teal: 'bg-teal-50 text-teal-600 border-teal-100',
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between h-28 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>{icon}</div>
        <div className="text-right">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">{value}</h3>
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-slate-800">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-full flex items-center justify-center text-xs text-slate-400">{message}</div>
  );
}

function QuickActionButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center p-3 gap-2 bg-slate-50 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 transition-colors border border-transparent hover:border-indigo-100 group text-center"
    >
      <div className="p-2 bg-white rounded-full shadow-sm group-hover:bg-indigo-100">{icon}</div>
      <span className="text-[10px] font-medium leading-tight">{label}</span>
    </button>
  );
}

function BenefitItem({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 px-2">
      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">{icon}</div>
      <div>
        <h4 className="text-xs font-bold text-slate-800">{title}</h4>
        <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function Modal({
  title,
  icon,
  onClose,
  children,
  wide,
}: {
  title: string;
  icon: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-xl shadow-xl w-full ${wide ? 'max-w-3xl' : 'max-w-2xl'} overflow-hidden flex flex-col max-h-[90vh]`}>
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            {icon}
            {title}
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:bg-slate-200 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function ModalActions({
  onCancel,
  submitting,
  submitLabel,
}: {
  onCancel: () => void;
  submitting: boolean;
  submitLabel: string;
}) {
  return (
    <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 mt-6">
      <button type="button" onClick={onCancel} className="px-5 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
        Cancel
      </button>
      <button
        type="submit"
        disabled={submitting}
        className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm disabled:opacity-50"
      >
        {submitting ? 'Saving...' : submitLabel}
      </button>
    </div>
  );
}

function EnquirySelect({ enquiries, defaultEnquiryId }: { enquiries: Enquiry[]; defaultEnquiryId?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">Select Enquiry *</label>
      <select
        name="enquiryDbId"
        required
        defaultValue={defaultEnquiryId || ''}
        className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      >
        <option value="">Choose enquiry...</option>
        {enquiries.map((e) => (
          <option key={e.id || e.enquiryId} value={e.id || ''}>
            {e.enquiryId} — {e.enquirerName}
          </option>
        ))}
      </select>
    </div>
  );
}

function Field({
  label,
  name,
  type = 'text',
  required,
  placeholder,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      />
    </div>
  );
}

function MobileNumberField({ defaultValue }: { defaultValue?: string }) {
  const initial = defaultValue?.trim()
    ? normalizeIndiaMobile(defaultValue)
    : '+91';
  const [value, setValue] = useState(initial);

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number *</label>
      <div className="flex rounded-lg border border-slate-300 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500">
        <span className="px-3 py-2 bg-slate-50 text-sm font-semibold text-slate-600 border-r border-slate-300 select-none">
          +91
        </span>
        <input
          type="tel"
          inputMode="numeric"
          required
          placeholder="9876543210"
          value={value.startsWith('+91') ? value.slice(3) : value.replace(/^\+?91/, '')}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
            setValue(`+91${digits}`);
          }}
          className="flex-1 p-2 text-sm focus:outline-none"
        />
      </div>
      <input type="hidden" name="mobile" value={value} />
      <p className="text-[10px] text-slate-400 mt-1">Defaults to +91 (India). Enter 10-digit mobile number.</p>
    </div>
  );
}

function EnquiryFormFields({
  meta,
  performer,
  enquiry,
  isEdit,
}: {
  meta: EnquiryMeta;
  performer: string;
  enquiry?: Enquiry;
  isEdit?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Enquirer Name *" name="enquirerName" required placeholder="e.g. Rahul Sharma" defaultValue={enquiry?.enquirerName} />
      <MobileNumberField defaultValue={enquiry?.mobile} />
      <Field label="Email Address" name="email" type="email" placeholder="email@example.com" defaultValue={enquiry?.email} />
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Class Interested *</label>
        <select
          name="classInterested"
          required
          defaultValue={enquiry?.classInterested || ''}
          className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">Select Class</option>
          {meta.classes.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {meta.classes.length === 0 ? (
          <p className="text-[10px] text-amber-600 mt-1">
            No classes configured. Add them in Institution Setup → Classes &amp; Sections (Records / Master List), then reopen this form.
          </p>
        ) : (
          <p className="text-[10px] text-slate-400 mt-1">
            Classes loaded from Institution Setup configuration.
          </p>
        )}
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Source *</label>
        <select
          name="source"
          required
          defaultValue={enquiry?.source || meta.sources[0] || 'Website'}
          className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          {meta.sources.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      {isEdit && (
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
          <select
            name="status"
            defaultValue={enquiry?.status}
            className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {meta.statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}
      <Field label="Assigned To" name="assignedTo" defaultValue={enquiry?.assignedTo || performer} />
      <Field
        label="Next Follow Up Date"
        name="nextFollowUp"
        type="date"
        defaultValue={enquiry?.nextFollowUp?.slice(0, 10)}
      />
      <div className="md:col-span-2">
        <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={enquiry?.notes}
          className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Additional notes..."
        />
      </div>
    </div>
  );
}
