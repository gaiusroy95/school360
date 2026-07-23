import { useCallback, useEffect, useState } from 'react';
import { Bus, Plus, RefreshCcw, Wallet } from 'lucide-react';
import {
  collectTransportFee,
  createTransportVendor,
  fetchFeeDashboardMeta,
  formatInr,
  getTransportFeeSummary,
  listTransportFeeCollections,
  listTransportVendorPayments,
  listTransportVendors,
  payTransportVendor,
  type TransportFeeCollection,
  type TransportFeeSummary,
  type TransportVendor,
  type TransportVendorPayment,
} from '../../../lib/feeFinanceServices';
import {
  AcademicLoading,
  AcademicModal,
  AcademicPageHeader,
  AcademicPageShell,
  am,
  EmptyState,
  FeeMessage,
  FeeTabs,
  StatusBadge,
} from './FeeFinanceUi';

export function TransportFeeView() {
  const [tab, setTab] = useState('Summary');
  const [summary, setSummary] = useState<TransportFeeSummary | null>(null);
  const [collections, setCollections] = useState<TransportFeeCollection[]>([]);
  const [vendors, setVendors] = useState<TransportVendor[]>([]);
  const [payments, setPayments] = useState<TransportVendorPayment[]>([]);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [collectForm, setCollectForm] = useState({
    studentName: '',
    admissionNumber: '',
    className: '',
    routeName: '',
    monthLabel: '',
    amount: '',
    paymentMode: 'CASH',
    remarks: '',
  });
  const [vendorForm, setVendorForm] = useState({
    vendorCode: '',
    vendorName: '',
    contactPerson: '',
    mobile: '',
    email: '',
    routesCovered: '',
    vehicleCount: '',
    remarks: '',
  });
  const [payForm, setPayForm] = useState({
    vendorId: '',
    amount: '',
    paymentMode: 'BANK_TRANSFER',
    periodLabel: '',
    paymentDate: '',
    remarks: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const meta = await fetchFeeDashboardMeta();
      if (meta.defaultAcademicYear) setAcademicYear((y) => y || meta.defaultAcademicYear);
      const [s, c, v, p] = await Promise.all([
        getTransportFeeSummary(academicYear),
        listTransportFeeCollections({ academicYear }),
        listTransportVendors(),
        listTransportVendorPayments(),
      ]);
      setSummary(s);
      setCollections(c);
      setVendors(v);
      setPayments(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load transport data');
    } finally {
      setLoading(false);
    }
  }, [academicYear]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCollect = async () => {
    setError('');
    try {
      await collectTransportFee({
        academicYear,
        studentName: collectForm.studentName,
        admissionNumber: collectForm.admissionNumber || undefined,
        className: collectForm.className || undefined,
        routeName: collectForm.routeName || undefined,
        monthLabel: collectForm.monthLabel || undefined,
        amount: Number(collectForm.amount),
        paymentMode: collectForm.paymentMode,
        remarks: collectForm.remarks || undefined,
      });
      setMessage('Transport fee collected');
      setShowCollectModal(false);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Collection failed');
    }
  };

  const handleVendor = async () => {
    setError('');
    try {
      await createTransportVendor({
        vendorCode: vendorForm.vendorCode,
        vendorName: vendorForm.vendorName,
        contactPerson: vendorForm.contactPerson || undefined,
        mobile: vendorForm.mobile || undefined,
        email: vendorForm.email || undefined,
        routesCovered: vendorForm.routesCovered || undefined,
        vehicleCount: vendorForm.vehicleCount ? Number(vendorForm.vehicleCount) : undefined,
        remarks: vendorForm.remarks || undefined,
        status: 'EMPANELLED',
      });
      setMessage('Vendor empanelled');
      setShowVendorModal(false);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Vendor creation failed');
    }
  };

  const handlePay = async () => {
    setError('');
    try {
      await payTransportVendor({
        vendorId: payForm.vendorId,
        amount: Number(payForm.amount),
        paymentMode: payForm.paymentMode,
        periodLabel: payForm.periodLabel || undefined,
        paymentDate: payForm.paymentDate || undefined,
        remarks: payForm.remarks || undefined,
      });
      setMessage('Vendor payment recorded');
      setShowPayModal(false);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment failed');
    }
  };

  const kpis = summary ? [
    { label: 'Total Collections', value: formatInr(summary.totalCollections), sub: `${summary.collectionCount} receipts` },
    { label: 'Vendor Payments', value: formatInr(summary.totalVendorPayments), sub: `${summary.vendorPaymentCount} payments` },
    { label: 'Empanelled Vendors', value: String(summary.vendorCount), sub: 'Active vendors' },
    { label: 'Net Balance', value: formatInr(summary.netBalance), sub: 'Collections − payments' },
  ] : [];

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Fees & Finance"
        title="Transport Fee"
        subtitle="Collect student transport fees and manage vendor payments."
        actions={
          <>
            <button type="button" onClick={() => void load()} className={am.btnSecondary}>
              <RefreshCcw size={14} /> Refresh
            </button>
            {tab === 'Collections' && (
              <button type="button" onClick={() => setShowCollectModal(true)} className={am.btnPrimary}>
                <Plus size={14} /> Collect Fee
              </button>
            )}
            {tab === 'Vendors' && (
              <button type="button" onClick={() => setShowVendorModal(true)} className={am.btnPrimary}>
                <Bus size={14} /> Empanel Vendor
              </button>
            )}
            {tab === 'Vendor Payments' && (
              <button type="button" onClick={() => setShowPayModal(true)} className={am.btnPrimary} disabled={vendors.length === 0}>
                <Wallet size={14} /> Pay Vendor
              </button>
            )}
          </>
        }
      />
      <div className={am.content}>
        <FeeTabs tabs={['Summary', 'Collections', 'Vendors', 'Vendor Payments']} active={tab} onChange={setTab} />
        <FeeMessage message={message} type="success" />
        <FeeMessage message={error} type="error" />

        {loading ? <AcademicLoading /> : tab === 'Summary' ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((k) => (
              <div key={k.label} className={`${am.card} ${am.cardPad}`}>
                <p className="text-xs text-slate-500 font-semibold uppercase">{k.label}</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{k.value}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{k.sub}</p>
              </div>
            ))}
          </div>
        ) : tab === 'Collections' ? (
          collections.length === 0 ? <EmptyState>No transport collections yet.</EmptyState> : (
            <div className={am.tableWrap}>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={am.th}>Receipt</th>
                    <th className={am.th}>Student</th>
                    <th className={am.th}>Route</th>
                    <th className={am.th}>Month</th>
                    <th className={am.th + ' text-right'}>Amount</th>
                    <th className={am.th}>Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {collections.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className={am.td + ' font-mono text-xs'}>{row.receiptNumber}</td>
                      <td className={am.td + ' font-semibold'}>{row.studentName}</td>
                      <td className={am.td}>{row.routeName || '—'}</td>
                      <td className={am.td}>{row.monthLabel || '—'}</td>
                      <td className={am.td + ' text-right font-bold'}>{formatInr(row.amount)}</td>
                      <td className={am.td}>{row.paymentMode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : tab === 'Vendors' ? (
          vendors.length === 0 ? <EmptyState>No transport vendors empanelled.</EmptyState> : (
            <div className={am.tableWrap}>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={am.th}>Code</th>
                    <th className={am.th}>Vendor</th>
                    <th className={am.th}>Contact</th>
                    <th className={am.th}>Routes</th>
                    <th className={am.th}>Vehicles</th>
                    <th className={am.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className={am.td + ' font-mono text-xs'}>{row.vendorCode}</td>
                      <td className={am.td + ' font-semibold'}>{row.vendorName}</td>
                      <td className={am.td + ' text-xs'}>{row.contactPerson}<br />{row.mobile}</td>
                      <td className={am.td}>{row.routesCovered || '—'}</td>
                      <td className={am.td}>{row.vehicleCount || '—'}</td>
                      <td className={am.td}><StatusBadge status={row.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : payments.length === 0 ? (
          <EmptyState>No vendor payments recorded.</EmptyState>
        ) : (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Payment #</th>
                  <th className={am.th}>Vendor</th>
                  <th className={am.th}>Period</th>
                  <th className={am.th}>Date</th>
                  <th className={am.th + ' text-right'}>Amount</th>
                  <th className={am.th}>Mode</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className={am.td + ' font-mono text-xs'}>{row.paymentNumber}</td>
                    <td className={am.td + ' font-semibold'}>{row.vendorName}</td>
                    <td className={am.td}>{row.periodLabel || '—'}</td>
                    <td className={am.td}>{row.paymentDate?.slice(0, 10) || '—'}</td>
                    <td className={am.td + ' text-right font-bold'}>{formatInr(row.amount)}</td>
                    <td className={am.td}>{row.paymentMode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AcademicModal open={showCollectModal} onClose={() => setShowCollectModal(false)} title="Collect Transport Fee" large>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Student Name *</label>
              <input className={am.input} value={collectForm.studentName} onChange={(e) => setCollectForm((f) => ({ ...f, studentName: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Amount *</label>
              <input type="number" className={am.input} value={collectForm.amount} onChange={(e) => setCollectForm((f) => ({ ...f, amount: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Route</label>
              <input className={am.input} value={collectForm.routeName} onChange={(e) => setCollectForm((f) => ({ ...f, routeName: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Month</label>
              <input className={am.input} value={collectForm.monthLabel} onChange={(e) => setCollectForm((f) => ({ ...f, monthLabel: e.target.value }))} placeholder="Apr 2025" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowCollectModal(false)} className={am.btnSecondary}>Cancel</button>
            <button type="button" onClick={() => void handleCollect()} className={am.btnPrimary} disabled={!collectForm.studentName || !collectForm.amount}>Collect</button>
          </div>
        </div>
      </AcademicModal>

      <AcademicModal open={showVendorModal} onClose={() => setShowVendorModal(false)} title="Empanel Transport Vendor" large>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Vendor Code *</label>
              <input className={am.input} value={vendorForm.vendorCode} onChange={(e) => setVendorForm((f) => ({ ...f, vendorCode: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Vendor Name *</label>
              <input className={am.input} value={vendorForm.vendorName} onChange={(e) => setVendorForm((f) => ({ ...f, vendorName: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Contact Person</label>
              <input className={am.input} value={vendorForm.contactPerson} onChange={(e) => setVendorForm((f) => ({ ...f, contactPerson: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Mobile</label>
              <input className={am.input} value={vendorForm.mobile} onChange={(e) => setVendorForm((f) => ({ ...f, mobile: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Routes Covered</label>
            <input className={am.input} value={vendorForm.routesCovered} onChange={(e) => setVendorForm((f) => ({ ...f, routesCovered: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowVendorModal(false)} className={am.btnSecondary}>Cancel</button>
            <button type="button" onClick={() => void handleVendor()} className={am.btnPrimary} disabled={!vendorForm.vendorCode || !vendorForm.vendorName}>Save</button>
          </div>
        </div>
      </AcademicModal>

      <AcademicModal open={showPayModal} onClose={() => setShowPayModal(false)} title="Pay Transport Vendor" large>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600">Vendor</label>
            <select className={am.select + ' w-full'} value={payForm.vendorId} onChange={(e) => setPayForm((f) => ({ ...f, vendorId: e.target.value }))}>
              <option value="">Select vendor</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.vendorName}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Amount *</label>
              <input type="number" className={am.input} value={payForm.amount} onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Period</label>
              <input className={am.input} value={payForm.periodLabel} onChange={(e) => setPayForm((f) => ({ ...f, periodLabel: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowPayModal(false)} className={am.btnSecondary}>Cancel</button>
            <button type="button" onClick={() => void handlePay()} className={am.btnPrimary} disabled={!payForm.vendorId || !payForm.amount}>Pay</button>
          </div>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
