import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search, RefreshCw, Plus, IndianRupee, FileText, AlertTriangle,
  Percent, QrCode, Shield, Users, Route, CheckCircle2, Wallet,
} from 'lucide-react';
import {
  applyTransportLatePenalties, approveTransportFeeRefund, assignTransportStudentFee,
  autoAssignTransportFees, collectTransportFeePayment, createTransportFeeStructure,
  fetchTransportFeeManagement, formatInr, generateTransportFeeInvoices,
  requestTransportFeeRefund, reviseTransportFeeStructure, waiveTransportFeePenalty,
  type TransportFeeManagement,
} from '../../../lib/transportServices';
import {
  am, AcademicLoading, AcademicModal, AcademicPageHeader, AcademicPageShell,
  FeeTabs, StatusBadge,
} from '../FeeFinanceManagement/FeeFinanceUi';

const TABS = [
  'Dashboard', 'Fee Structures', 'Student Mapping', 'Invoices', 'Collections',
  'Concessions', 'Penalties & Refunds', 'Revisions', 'Reports', 'Mobile Sync', 'Audit', 'Settings',
] as const;
type TabId = (typeof TABS)[number];

type Structure = {
  id: string; structureCode: string; structureName: string; pricingType: string;
  billingCycle: string; routeCode: string; routeName: string; baseAmount: number;
  computedAmount: number; depositAmount: number; status: string; assignmentCount: number;
};

type Invoice = {
  id: string; invoiceNumber: string; studentName: string; className: string;
  routeName: string; periodLabel: string; netAmount: number; paidAmount: number;
  balanceAmount: number; concessionAmount: number; penaltyAmount: number;
  status: string; dueDate: string; isProforma: boolean;
};

function Kpi({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className={`${am.card} p-3`}>
      <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
      <p className={`text-xl font-black mt-1 ${color ?? 'text-slate-900'}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

export function TransportFeesView() {
  const [data, setData] = useState<TransportFeeManagement | null>(null);
  const [tab, setTab] = useState<TabId>('Dashboard');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [message, setMessage] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showStructure, setShowStructure] = useState(false);
  const [showCollect, setShowCollect] = useState(false);
  const [structureForm, setStructureForm] = useState({
    structureName: '', pricingType: 'ROUTE', billingCycle: 'MONTHLY',
    baseAmount: '', routeId: '', distanceKm: '', perKmRate: '',
  });
  const [collectForm, setCollectForm] = useState({ amount: '', paymentMode: 'UPI', gatewayRef: '' });

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try { setData(await fetchTransportFeeManagement(seed, academicYear)); }
    finally { setLoading(false); }
  }, [academicYear]);

  useEffect(() => { void load(); }, [load]);

  const structures = useMemo(() => (data?.structures ?? []) as Structure[], [data]);
  const invoices = useMemo(() => (data?.invoices ?? []) as Invoice[], [data]);
  const q = search.toLowerCase();
  const filteredInvoices = useMemo(() => invoices.filter((i) => {
    const matchQ = !q || i.studentName.toLowerCase().includes(q) || i.invoiceNumber.toLowerCase().includes(q)
      || i.routeName.toLowerCase().includes(q);
    const matchS = statusFilter === 'ALL' || i.status === statusFilter;
    return matchQ && matchS;
  }), [invoices, q, statusFilter]);

  const act = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true); setMessage('');
    try {
      setData(await fn() as TransportFeeManagement);
      setMessage(msg);
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Action failed'); }
    finally { setBusy(false); }
  };

  const roleMatrix = (data?.settings as { roleMatrix?: { role: string; permissions: string }[] })?.roleMatrix ?? [];
  const mobileSync = (data?.settings as { mobileSyncRules?: Record<string, string[]> })?.mobileSyncRules ?? {};

  if (loading && !data) return <AcademicLoading />;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Transport Management › Transport Fees"
        title="Transport Fee Management"
        subtitle="Route-wise pricing, concessions, invoices, online collections, penalties, refunds & accounting integration"
        actions={(
          <div className="flex gap-2 flex-wrap">
            <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className={`${am.input} text-xs`}>
              {(data?.academicYears ?? ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button type="button" onClick={() => void load()} disabled={busy} className={am.btnSecondary}>
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <button type="button" disabled={busy} onClick={() => void act(() => generateTransportFeeInvoices(academicYear), 'Invoices generated')}
              className={am.btnSecondary}>
              <FileText className="w-3.5 h-3.5" /> Generate Invoices
            </button>
            <button type="button" onClick={() => setShowStructure(true)} className={am.btnPrimary}>
              <Plus className="w-3.5 h-3.5" /> Fee Structure
            </button>
          </div>
        )}
      />

      {message && (
        <div className={`mb-3 p-2 rounded-lg text-xs font-medium ${message.includes('fail') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {message}
        </div>
      )}

      <FeeTabs tabs={[...TABS]} active={tab} onChange={(t) => setTab(t as TabId)} />

      {tab === 'Dashboard' && (
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-2">
            <Kpi label="Total Billed" value={formatInr(data?.kpis.totalBilled ?? 0)} />
            <Kpi label="Collected" value={formatInr(data?.kpis.totalCollected ?? 0)} color="text-emerald-600" />
            <Kpi label="Outstanding" value={formatInr(data?.kpis.totalOutstanding ?? 0)} color="text-amber-600" />
            <Kpi label="Concessions" value={formatInr(data?.kpis.totalConcessions ?? 0)} color="text-blue-600" />
            <Kpi label="Refunds" value={formatInr(data?.kpis.totalRefunds ?? 0)} />
            <Kpi label="Overdue" value={data?.kpis.overdueAccounts ?? 0} color="text-red-600" />
            <Kpi label="Collection %" value={`${data?.kpis.collectionRate ?? 0}%`} />
            <Kpi label="Invoices" value={data?.kpis.invoiceCount ?? 0} />
            <Kpi label="Structures" value={data?.kpis.structureCount ?? 0} />
            <Kpi label="Assigned" value={data?.kpis.assignedStudents ?? 0} />
          </div>

          <div className={`${am.card} p-3`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Fee Workflow</p>
            <div className="flex flex-wrap gap-1">
              {(data?.workflow ?? []).map((w, i) => (
                <span key={w} className="flex items-center gap-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-semibold">{w}</span>
                  {i < (data?.workflow.length ?? 0) - 1 && <span className="text-slate-300">→</span>}
                </span>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className={`${am.card} p-4`}>
              <h3 className="text-sm font-bold mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" disabled={busy} onClick={() => void act(() => autoAssignTransportFees(academicYear), 'Fees auto-assigned')}
                  className={`${am.btnSecondary} text-xs justify-center`}><Users className="w-3.5 h-3.5" /> Auto-Assign Fees</button>
                <button type="button" disabled={busy} onClick={() => void act(() => applyTransportLatePenalties(), 'Late penalties applied')}
                  className={`${am.btnSecondary} text-xs justify-center`}><AlertTriangle className="w-3.5 h-3.5" /> Apply Late Fees</button>
              </div>
            </div>
            <div className={`${am.card} p-4`}>
              <h3 className="text-sm font-bold mb-2">Recent Payments</h3>
              {(data?.payments ?? []).slice(0, 4).map((p) => (
                <div key={String(p.id)} className="flex justify-between text-xs py-1 border-b border-slate-100">
                  <span>{String(p.studentName)} · {String(p.receiptNumber)}</span>
                  <span className="font-bold text-emerald-600">{formatInr(Number(p.amount))}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'Fee Structures' && (
        <div className={`${am.card} overflow-hidden mt-4`}>
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b">
              <tr>
                {['Code', 'Name', 'Type', 'Cycle', 'Route', 'Amount', 'Deposit', 'Assigned', 'Status', 'Actions'].map((h) => (
                  <th key={h} className={am.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {structures.map((s) => (
                <tr key={s.id} className="border-b hover:bg-slate-50/50">
                  <td className={am.td}><span className="font-mono font-bold">{s.structureCode}</span></td>
                  <td className={am.td}>{s.structureName}</td>
                  <td className={am.td}><StatusBadge status={s.pricingType} /></td>
                  <td className={am.td}>{s.billingCycle}</td>
                  <td className={am.td}>{s.routeCode || '—'}</td>
                  <td className={am.td}><span className="font-bold">{formatInr(s.computedAmount)}</span></td>
                  <td className={am.td}>{formatInr(s.depositAmount)}</td>
                  <td className={am.td}>{s.assignmentCount}</td>
                  <td className={am.td}><StatusBadge status={s.status} /></td>
                  <td className={am.td}>
                    <button type="button" disabled={busy} className="text-[10px] text-blue-600 font-bold"
                      onClick={() => void act(() => reviseTransportFeeStructure(s.id, { newAmount: s.computedAmount + 100, reason: 'Revision' }), 'Revised')}>
                      Revise
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Student Mapping' && (
        <div className={`${am.card} overflow-hidden mt-4`}>
          <div className="p-3 border-b flex justify-between items-center">
            <p className="text-xs font-bold text-slate-600">{data?.assignments.length ?? 0} students mapped</p>
            <button type="button" disabled={busy} onClick={() => void act(() => autoAssignTransportFees(academicYear), 'Auto-assigned')}
              className={am.btnSecondary}><Route className="w-3.5 h-3.5" /> Auto-Assign from Routes</button>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b">
              <tr>
                {['Student', 'Class', 'Route', 'Structure', 'Gross', 'Concession', 'Net', 'Deposit', 'Status'].map((h) => (
                  <th key={h} className={am.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.assignments ?? []).map((a) => (
                <tr key={String(a.id)} className="border-b">
                  <td className={am.td}><span className="font-semibold">{String(a.studentName)}</span></td>
                  <td className={am.td}>{String(a.className)}</td>
                  <td className={am.td}>{String(a.routeName)}</td>
                  <td className={am.td}>{String(a.structureName)}</td>
                  <td className={am.td}>{formatInr(Number(a.assignedAmount))}</td>
                  <td className={am.td}>{formatInr(Number(a.concessionAmount))}</td>
                  <td className={am.td}><span className="font-bold">{formatInr(Number(a.netAmount))}</span></td>
                  <td className={am.td}>{formatInr(Number(a.depositPaid))}</td>
                  <td className={am.td}><StatusBadge status={String(a.status)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(tab === 'Invoices') && (
        <div className="space-y-3 mt-4">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student, invoice…" className={`${am.input} pl-8 text-xs w-full`} />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${am.input} text-xs`}>
              <option value="ALL">All</option>
              {(data?.invoiceStatuses ?? []).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className={`${am.card} overflow-hidden`}>
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b">
                <tr>
                  {['Invoice #', 'Student', 'Route', 'Period', 'Net', 'Paid', 'Balance', 'Due', 'Status', 'Actions'].map((h) => (
                    <th key={h} className={am.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="border-b hover:bg-slate-50/50">
                    <td className={am.td}><span className="font-mono font-bold">{inv.invoiceNumber}</span></td>
                    <td className={am.td}>{inv.studentName}<br /><span className="text-slate-400">{inv.className}</span></td>
                    <td className={am.td}>{inv.routeName}</td>
                    <td className={am.td}>{inv.periodLabel}</td>
                    <td className={am.td}>{formatInr(inv.netAmount)}</td>
                    <td className={`${am.td} text-emerald-600`}>{formatInr(inv.paidAmount)}</td>
                    <td className={`${am.td} font-bold`}>{formatInr(inv.balanceAmount)}</td>
                    <td className={am.td}>{inv.dueDate}</td>
                    <td className={am.td}><StatusBadge status={inv.status} /></td>
                    <td className={am.td}>
                      {inv.balanceAmount > 0 && (
                        <button type="button" className="text-[10px] text-emerald-600 font-bold"
                          onClick={() => { setSelectedInvoice(inv); setCollectForm({ amount: String(inv.balanceAmount), paymentMode: 'UPI', gatewayRef: '' }); setShowCollect(true); }}>
                          Collect
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'Collections' && (
        <div className={`${am.card} overflow-hidden mt-4`}>
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b">
              <tr>{['Receipt', 'Invoice', 'Student', 'Amount', 'Mode', 'When'].map((h) => <th key={h} className={am.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {(data?.payments ?? []).map((p) => (
                <tr key={String(p.id)} className="border-b">
                  <td className={am.td}><span className="font-mono">{String(p.receiptNumber)}</span></td>
                  <td className={am.td}>{String(p.invoiceNumber)}</td>
                  <td className={am.td}>{String(p.studentName)}</td>
                  <td className={am.td}><span className="font-bold text-emerald-600">{formatInr(Number(p.amount))}</span></td>
                  <td className={am.td}>
                    <span className="flex items-center gap-1">
                      {String(p.paymentMode) === 'QR' && <QrCode className="w-3 h-3" />}
                      {String(p.paymentMode)}
                    </span>
                  </td>
                  <td className={am.td}>{String(p.relativeTime)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Concessions' && (
        <div className="mt-4 grid md:grid-cols-3 gap-3">
          <div className={`${am.card} p-4`}>
            <Percent className="w-8 h-8 text-blue-500 mb-2" />
            <h4 className="font-bold">Sibling Discount</h4>
            <p className="text-2xl font-black text-blue-600 mt-1">{(data?.settings as { siblingDiscountPct?: number })?.siblingDiscountPct ?? 10}%</p>
            <p className="text-xs text-slate-500 mt-1">Auto-applied when sibling group detected</p>
          </div>
          <div className={`${am.card} p-4`}>
            <Users className="w-8 h-8 text-violet-500 mb-2" />
            <h4 className="font-bold">Staff Child Discount</h4>
            <p className="text-2xl font-black text-violet-600 mt-1">{(data?.settings as { staffChildDiscountPct?: number })?.staffChildDiscountPct ?? 25}%</p>
            <p className="text-xs text-slate-500 mt-1">Employee children concession</p>
          </div>
          <div className={`${am.card} p-4`}>
            <IndianRupee className="w-8 h-8 text-emerald-500 mb-2" />
            <h4 className="font-bold">Total Concessions</h4>
            <p className="text-2xl font-black text-emerald-600 mt-1">{formatInr(data?.kpis.totalConcessions ?? 0)}</p>
            <p className="text-xs text-slate-500 mt-1">Including scholarship waivers</p>
          </div>
        </div>
      )}

      {tab === 'Penalties & Refunds' && (
        <div className="mt-4 grid lg:grid-cols-2 gap-4">
          <div className={`${am.card} overflow-hidden`}>
            <h3 className="text-sm font-bold p-3 border-b">Penalties</h3>
            <table className="w-full text-xs">
              <thead className="bg-slate-50"><tr>{['Invoice', 'Student', 'Type', 'Amount', ''].map((h) => <th key={h} className={am.th}>{h}</th>)}</tr></thead>
              <tbody>
                {(data?.penalties ?? []).map((p) => (
                  <tr key={String(p.id)} className="border-b">
                    <td className={am.td}>{String(p.invoiceNumber)}</td>
                    <td className={am.td}>{String(p.studentName)}</td>
                    <td className={am.td}>{String(p.penaltyType)}</td>
                    <td className={am.td}>{formatInr(Number(p.amount))}</td>
                    <td className={am.td}>
                      {!p.waived && (
                        <button type="button" disabled={busy} className="text-[10px] text-blue-600 font-bold"
                          onClick={() => void act(() => waiveTransportFeePenalty(String(p.id), 'Approved waiver'), 'Penalty waived')}>Waive</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={`${am.card} overflow-hidden`}>
            <h3 className="text-sm font-bold p-3 border-b">Refunds</h3>
            <table className="w-full text-xs">
              <thead className="bg-slate-50"><tr>{['Refund #', 'Student', 'Amount', 'Status', ''].map((h) => <th key={h} className={am.th}>{h}</th>)}</tr></thead>
              <tbody>
                {(data?.refunds ?? []).map((r) => (
                  <tr key={String(r.id)} className="border-b">
                    <td className={am.td}>{String(r.refundNumber)}</td>
                    <td className={am.td}>{String(r.studentName)}</td>
                    <td className={am.td}>{formatInr(Number(r.amount))}</td>
                    <td className={am.td}><StatusBadge status={String(r.status)} /></td>
                    <td className={am.td}>
                      {r.status === 'PENDING' && (
                        <button type="button" disabled={busy} className="text-[10px] text-emerald-600 font-bold"
                          onClick={() => void act(() => approveTransportFeeRefund(String(r.id)), 'Refund approved')}>Approve</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'Revisions' && (
        <div className={`${am.card} overflow-hidden mt-4`}>
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b">
              <tr>{['Previous', 'New', 'Reason', 'By', 'When'].map((h) => <th key={h} className={am.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {(data?.revisions ?? []).map((r) => (
                <tr key={String(r.id)} className="border-b">
                  <td className={am.td}>{formatInr(Number(r.previousAmount))}</td>
                  <td className={am.td}><span className="font-bold">{formatInr(Number(r.newAmount))}</span></td>
                  <td className={am.td}>{String(r.reason)}</td>
                  <td className={am.td}>{String(r.revisedBy)}</td>
                  <td className={am.td}>{String(r.relativeTime)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Reports' && (
        <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {(data?.reports ?? []).map((r) => (
            <div key={r} className={`${am.card} p-3 flex items-center gap-2 hover:bg-slate-50 cursor-pointer`}>
              <FileText className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-xs font-semibold text-slate-700">{r}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'Mobile Sync' && (
        <div className="mt-4 grid lg:grid-cols-2 gap-4">
          {Object.entries(mobileSync).map(([app, features]) => (
            <div key={app} className={`${am.card} p-4`}>
              <h3 className="text-sm font-bold mb-2 capitalize">{app.replace(/([A-Z])/g, ' $1')}</h3>
              <ul className="space-y-1">
                {(features ?? []).map((f) => (
                  <li key={f} className="text-xs text-slate-600 flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {tab === 'Audit' && (
        <div className={`${am.card} overflow-hidden mt-4`}>
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b">
              <tr>{['Time', 'Entity', 'Action', 'Details', 'By'].map((h) => <th key={h} className={am.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {(data?.auditLogs ?? []).map((a) => (
                <tr key={String(a.id)} className="border-b">
                  <td className={am.td}>{String(a.relativeTime)}</td>
                  <td className={am.td}>{String(a.entityType)}</td>
                  <td className={am.td}><StatusBadge status={String(a.action)} /></td>
                  <td className={am.td}>{String(a.details)}</td>
                  <td className={am.td}>{String(a.performedBy)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Settings' && (
        <div className={`${am.card} p-4 mt-4`}>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><Shield className="w-4 h-4" /> Role Access & Billing Rules</h3>
          <table className="w-full text-xs mb-4">
            <thead><tr><th className={am.th}>Role</th><th className={am.th}>Permissions</th></tr></thead>
            <tbody>
              {roleMatrix.map((r) => (
                <tr key={r.role} className="border-b"><td className={am.td}><strong>{r.role}</strong></td><td className={am.td}>{r.permissions}</td></tr>
              ))}
            </tbody>
          </table>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div><span className="text-slate-400">Grace Period</span><p className="font-bold">{(data?.settings as { gracePeriodDays?: number })?.gracePeriodDays ?? 7} days</p></div>
            <div><span className="text-slate-400">Late Fee/Day</span><p className="font-bold">{formatInr((data?.settings as { lateFeePerDay?: number })?.lateFeePerDay ?? 50)}</p></div>
            <div><span className="text-slate-400">Late Fee Cap</span><p className="font-bold">{formatInr((data?.settings as { lateFeeCap?: number })?.lateFeeCap ?? 500)}</p></div>
            <div><span className="text-slate-400">Auto-Suspend</span><p className="font-bold">{(data?.settings as { autoSuspendDays?: number })?.autoSuspendDays ?? 60} days overdue</p></div>
          </div>
        </div>
      )}

      <AcademicModal open={showStructure} onClose={() => setShowStructure(false)} title="Create Fee Structure">
        <div className="space-y-3">
          <input className={`${am.input} text-xs w-full`} placeholder="Structure Name" value={structureForm.structureName}
            onChange={(e) => setStructureForm({ ...structureForm, structureName: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <select className={`${am.input} text-xs`} value={structureForm.pricingType} onChange={(e) => setStructureForm({ ...structureForm, pricingType: e.target.value })}>
              {(data?.pricingTypes ?? []).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className={`${am.input} text-xs`} value={structureForm.billingCycle} onChange={(e) => setStructureForm({ ...structureForm, billingCycle: e.target.value })}>
              {(data?.billingCycles ?? []).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <input className={`${am.input} text-xs w-full`} placeholder="Base Amount" value={structureForm.baseAmount}
            onChange={(e) => setStructureForm({ ...structureForm, baseAmount: e.target.value })} />
          {structureForm.pricingType === 'DISTANCE' && (
            <div className="grid grid-cols-2 gap-2">
              <input className={`${am.input} text-xs`} placeholder="Distance (km)" value={structureForm.distanceKm}
                onChange={(e) => setStructureForm({ ...structureForm, distanceKm: e.target.value })} />
              <input className={`${am.input} text-xs`} placeholder="Per km rate" value={structureForm.perKmRate}
                onChange={(e) => setStructureForm({ ...structureForm, perKmRate: e.target.value })} />
            </div>
          )}
          <button type="button" disabled={busy || !structureForm.structureName} className={am.btnPrimary}
            onClick={() => void act(() => createTransportFeeStructure({
              ...structureForm, academicYear,
              baseAmount: Number(structureForm.baseAmount),
              distanceKm: Number(structureForm.distanceKm || 0),
              perKmRate: Number(structureForm.perKmRate || 0),
            }), 'Structure created').then(() => setShowStructure(false))}>
            Create Structure
          </button>
        </div>
      </AcademicModal>

      <AcademicModal open={showCollect} onClose={() => setShowCollect(false)} title={`Collect Payment — ${selectedInvoice?.invoiceNumber ?? ''}`}>
        <div className="space-y-3">
          <p className="text-xs text-slate-600">Student: <strong>{selectedInvoice?.studentName}</strong> · Balance: <strong>{formatInr(selectedInvoice?.balanceAmount ?? 0)}</strong></p>
          <input className={`${am.input} text-xs w-full`} placeholder="Amount" value={collectForm.amount}
            onChange={(e) => setCollectForm({ ...collectForm, amount: e.target.value })} />
          <select className={`${am.input} text-xs w-full`} value={collectForm.paymentMode} onChange={(e) => setCollectForm({ ...collectForm, paymentMode: e.target.value })}>
            {(data?.paymentModes ?? []).map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <button type="button" disabled={busy || !selectedInvoice} className={am.btnPrimary}
            onClick={() => void act(() => collectTransportFeePayment(selectedInvoice!.id, {
              amount: Number(collectForm.amount), paymentMode: collectForm.paymentMode,
              gatewayRef: collectForm.gatewayRef,
            }), 'Payment collected').then(() => setShowCollect(false))}>
            <Wallet className="w-3.5 h-3.5" /> Collect & Generate Receipt
          </button>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
