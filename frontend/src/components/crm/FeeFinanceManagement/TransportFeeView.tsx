import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bus, Check, Eye, Plus, Printer, RefreshCcw, Send, Wallet, X } from 'lucide-react';
import {
  fetchFeeCollectionMeta,
  feeStudentOptionKey,
  type FeeStudent,
} from '../../../lib/feeCollectionServices';
import {
  approveTransportVendor,
  collectTransportFee,
  createTransportVendor,
  fetchFeeDashboardMeta,
  fetchStudentTransportCollectContext,
  formatInr,
  getTransportFeeSummary,
  listTransportFeeCollections,
  listTransportRouteOptions,
  listTransportVendorComplianceAlerts,
  listTransportVendorPayments,
  listTransportVendors,
  payTransportVendor,
  rejectTransportVendor,
  type StudentTransportCollectContext,
  type TransportFeeCollection,
  type TransportFeeSummary,
  type TransportRouteOption,
  type TransportVendor,
  type TransportVendorComplianceAlert,
  type TransportVendorDocument,
  type TransportVendorPayment,
} from '../../../lib/feeFinanceServices';
import { downloadTransportFeeReceiptPdf } from '../../../lib/transportFeeReceiptPdf';
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

const PAYMENT_MODES = ['CASH', 'ONLINE', 'BANK_TRANSFER', 'UPI', 'CHEQUE'];

const emptyVendorForm = () => ({
  vendorCode: '',
  vendorName: '',
  contactPerson: '',
  mobile: '',
  email: '',
  routesCovered: '',
  vehicleCount: '',
  ownerPan: '',
  ownerAadhaar: '',
  driver1Name: '',
  driver1Mobile: '',
  driver1DlNumber: '',
  driver1DlExpiry: '',
  driver1PoliceVerification: '',
  driver2Name: '',
  driver2Mobile: '',
  driver2DlNumber: '',
  driver2DlExpiry: '',
  driver2PoliceVerification: '',
  vehicleRegNo: '',
  vehicleChassisNo: '',
  vehicleType: '',
  pollutionCertDate: '',
  pollutionExpiryDate: '',
  insurancePolicyNo: '',
  insuranceExpiryDate: '',
  trackingGpsDeviceId: '',
  trackingPhoneAccess: '',
  remarks: '',
});

function monthInputToLabel(value: string): string {
  if (!value) return '';
  const [y, m] = value.split('-').map(Number);
  if (!y || !m) return value;
  const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-IN', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  });
  return label.replace(' ', ' ');
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function downloadVendorDocument(doc: TransportVendorDocument) {
  const link = document.createElement('a');
  link.href = `data:${doc.mimeType};base64,${doc.fileData}`;
  link.download = doc.name;
  link.click();
}

function previewVendorDocument(doc: TransportVendorDocument) {
  const url = `data:${doc.mimeType};base64,${doc.fileData}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function TransportFeeView() {
  const [tab, setTab] = useState('Summary');
  const [summary, setSummary] = useState<TransportFeeSummary | null>(null);
  const [collections, setCollections] = useState<TransportFeeCollection[]>([]);
  const [vendors, setVendors] = useState<TransportVendor[]>([]);
  const [payments, setPayments] = useState<TransportVendorPayment[]>([]);
  const [alerts, setAlerts] = useState<TransportVendorComplianceAlert[]>([]);
  const [routes, setRoutes] = useState<TransportRouteOption[]>([]);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showVendorDetail, setShowVendorDetail] = useState<TransportVendor | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [students, setStudents] = useState<FeeStudent[]>([]);
  const [className, setClassName] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [studentKey, setStudentKey] = useState('');
  const [contextLoading, setContextLoading] = useState(false);
  const [studentContext, setStudentContext] = useState<StudentTransportCollectContext | null>(null);
  const [collectForm, setCollectForm] = useState({
    routeName: '',
    monthValue: '',
    amount: '',
    paymentMode: 'CASH',
  });

  const [vendorForm, setVendorForm] = useState(emptyVendorForm);
  const [vendorDocuments, setVendorDocuments] = useState<TransportVendorDocument[]>([]);
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
      const [s, c, v, p, a, r] = await Promise.all([
        getTransportFeeSummary(academicYear),
        listTransportFeeCollections({ academicYear }),
        listTransportVendors(),
        listTransportVendorPayments(),
        listTransportVendorComplianceAlerts({ status: 'OPEN' }),
        listTransportRouteOptions({ academicYear }),
      ]);
      setSummary(s);
      setCollections(c);
      setVendors(v);
      setPayments(p);
      setAlerts(a);
      setRoutes(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load transport data');
    } finally {
      setLoading(false);
    }
  }, [academicYear]);

  useEffect(() => {
    void load();
  }, [load]);

  const classOptions = useMemo(() => {
    const set = new Set(students.map((s) => s.className).filter(Boolean));
    return [...set].sort();
  }, [students]);

  const sectionOptions = useMemo(() => {
    const set = new Set(
      students
        .filter((s) => !className || s.className === className)
        .map((s) => s.sectionName)
        .filter(Boolean),
    );
    return [...set].sort();
  }, [students, className]);

  const studentOptions = useMemo(
    () =>
      students.filter(
        (s) =>
          (!className || s.className === className) &&
          (!sectionName || s.sectionName === sectionName),
      ),
    [students, className, sectionName],
  );

  const selectedStudent = useMemo(
    () => studentOptions.find((s) => feeStudentOptionKey(s) === studentKey) || null,
    [studentOptions, studentKey],
  );

  const openCollectModal = async () => {
    setCollectForm({
      routeName: '',
      monthValue: '',
      amount: '',
      paymentMode: 'CASH',
    });
    setClassName('');
    setSectionName('');
    setStudentKey('');
    setStudentContext(null);
    setShowCollectModal(true);
    try {
      const [meta, routeList] = await Promise.all([
        fetchFeeCollectionMeta(),
        listTransportRouteOptions({ academicYear }),
      ]);
      setStudents(meta.students || []);
      setRoutes(routeList);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load students');
    }
  };

  useEffect(() => {
    if (!showCollectModal || !selectedStudent) {
      setStudentContext(null);
      return;
    }
    let cancelled = false;
    setContextLoading(true);
    void fetchStudentTransportCollectContext({
      academicYear,
      studentId: selectedStudent.studentId || undefined,
      admissionNumber: selectedStudent.admissionNumber || undefined,
    })
      .then((data) => {
        if (cancelled) return;
        setStudentContext(data);
        setCollectForm((f) => ({
          ...f,
          routeName: f.routeName || data.suggestedRouteName || '',
          amount:
            f.amount ||
            (data.suggestedMonthlyAmount > 0
              ? String(data.suggestedMonthlyAmount)
              : data.totalDueFees > 0
                ? String(data.totalDueFees)
                : f.amount),
        }));
      })
      .catch((e) => {
        if (!cancelled) {
          setStudentContext(null);
          setError(e instanceof Error ? e.message : 'Failed to load student dues');
        }
      })
      .finally(() => {
        if (!cancelled) setContextLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showCollectModal, selectedStudent, academicYear]);

  const handleCollect = async () => {
    setError('');
    if (!selectedStudent) {
      setError('Select class, section and student');
      return;
    }
    if (!collectForm.amount || Number(collectForm.amount) <= 0) {
      setError('Enter amount deposited');
      return;
    }
    if (!collectForm.paymentMode) {
      setError('Select payment mode');
      return;
    }
    setSaving(true);
    try {
      const record = await collectTransportFee({
        academicYear,
        studentId: selectedStudent.studentId || undefined,
        studentName: selectedStudent.studentName,
        admissionNumber: selectedStudent.admissionNumber,
        className: selectedStudent.className,
        sectionName: selectedStudent.sectionName,
        routeName: collectForm.routeName || undefined,
        monthLabel: monthInputToLabel(collectForm.monthValue) || undefined,
        amount: Number(collectForm.amount),
        totalDueFees: studentContext?.totalDueFees ?? 0,
        paymentMode: collectForm.paymentMode,
      });
      downloadTransportFeeReceiptPdf(record);
      setMessage(`Transport fee deposited — receipt ${record.receiptNumber} generated`);
      setShowCollectModal(false);
      setTab('Collections');
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Collection failed');
    } finally {
      setSaving(false);
    }
  };

  const openVendorModal = () => {
    setVendorForm(emptyVendorForm());
    setVendorDocuments([]);
    setShowVendorModal(true);
  };

  const handleVendorDocs = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      const next: TransportVendorDocument[] = [];
      for (const file of Array.from(files)) {
        const fileData = await readFileAsBase64(file);
        next.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          type: file.type.startsWith('image/') ? 'IMAGE' : 'DOCUMENT',
          mimeType: file.type || 'application/octet-stream',
          fileData,
          uploadedAt: new Date().toISOString(),
        });
      }
      setVendorDocuments((docs) => [...docs, ...next]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Document upload failed');
    }
  };

  const handleVendor = async () => {
    setError('');
    if (!vendorForm.vendorCode.trim() || !vendorForm.vendorName.trim()) {
      setError('Vendor code and name are required');
      return;
    }
    setSaving(true);
    try {
      await createTransportVendor({
        vendorCode: vendorForm.vendorCode.trim(),
        vendorName: vendorForm.vendorName.trim(),
        contactPerson: vendorForm.contactPerson || undefined,
        mobile: vendorForm.mobile || undefined,
        email: vendorForm.email || undefined,
        routesCovered: vendorForm.routesCovered || undefined,
        vehicleCount: vendorForm.vehicleCount ? Number(vendorForm.vehicleCount) : undefined,
        ownerPan: vendorForm.ownerPan || undefined,
        ownerAadhaar: vendorForm.ownerAadhaar || undefined,
        driver1Name: vendorForm.driver1Name || undefined,
        driver1Mobile: vendorForm.driver1Mobile || undefined,
        driver1DlNumber: vendorForm.driver1DlNumber || undefined,
        driver1DlExpiry: vendorForm.driver1DlExpiry || null,
        driver1PoliceVerification: vendorForm.driver1PoliceVerification || undefined,
        driver2Name: vendorForm.driver2Name || undefined,
        driver2Mobile: vendorForm.driver2Mobile || undefined,
        driver2DlNumber: vendorForm.driver2DlNumber || undefined,
        driver2DlExpiry: vendorForm.driver2DlExpiry || null,
        driver2PoliceVerification: vendorForm.driver2PoliceVerification || undefined,
        vehicleRegNo: vendorForm.vehicleRegNo || undefined,
        vehicleChassisNo: vendorForm.vehicleChassisNo || undefined,
        vehicleType: vendorForm.vehicleType || undefined,
        pollutionCertDate: vendorForm.pollutionCertDate || null,
        pollutionExpiryDate: vendorForm.pollutionExpiryDate || null,
        insurancePolicyNo: vendorForm.insurancePolicyNo || undefined,
        insuranceExpiryDate: vendorForm.insuranceExpiryDate || null,
        trackingGpsDeviceId: vendorForm.trackingGpsDeviceId || undefined,
        trackingPhoneAccess: vendorForm.trackingPhoneAccess || undefined,
        documents: vendorDocuments,
        remarks: vendorForm.remarks || undefined,
        sendForApproval: true,
      });
      setMessage('Vendor details sent for Principal approval');
      setShowVendorModal(false);
      setTab('Vendors');
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Vendor creation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleVendorAction = async (action: 'approve' | 'reject', id: string) => {
    setError('');
    try {
      if (action === 'approve') await approveTransportVendor(id);
      else {
        if (!rejectReason.trim()) {
          setError('Rejection reason required');
          return;
        }
        await rejectTransportVendor(id, rejectReason);
        setRejectId(null);
        setRejectReason('');
      }
      setMessage(action === 'approve' ? 'Vendor approved / empanelled' : 'Vendor rejected');
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
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

  const activeVendors = vendors.filter(
    (v) => v.status === 'EMPANELLED' || v.status === 'ACTIVE' || v.status === 'RED_CATEGORY',
  );

  const kpis = summary
    ? [
        {
          label: 'Total Collections',
          value: formatInr(summary.totalCollections),
          sub: `${summary.collectionCount} receipts`,
        },
        {
          label: 'Vendor Payments',
          value: formatInr(summary.totalVendorPayments),
          sub: `${summary.vendorPaymentCount} payments`,
        },
        {
          label: 'Empanelled Vendors',
          value: String(summary.vendorCount),
          sub: 'Active vendors',
        },
        {
          label: 'Net Balance',
          value: formatInr(summary.netBalance),
          sub: 'Collections − payments',
        },
      ]
    : [];

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Fees & Finance"
        title="Transport Fee"
        subtitle="Collect transport fees with receipts, and empanel vendors with Principal approval & compliance tracking."
        actions={
          <>
            <button type="button" onClick={() => void load()} className={am.btnSecondary}>
              <RefreshCcw size={14} /> Refresh
            </button>
            {tab === 'Collections' && (
              <button type="button" onClick={() => void openCollectModal()} className={am.btnPrimary}>
                <Plus size={14} /> Collect Fee
              </button>
            )}
            {tab === 'Vendors' && (
              <button type="button" onClick={openVendorModal} className={am.btnPrimary}>
                <Bus size={14} /> Empanel Vendor
              </button>
            )}
            {tab === 'Vendor Payments' && (
              <button
                type="button"
                onClick={() => setShowPayModal(true)}
                className={am.btnPrimary}
                disabled={activeVendors.length === 0}
              >
                <Wallet size={14} /> Pay Vendor
              </button>
            )}
          </>
        }
      />
      <div className={am.content}>
        <FeeTabs
          tabs={['Summary', 'Collections', 'Vendors', 'Vendor Payments', 'Compliance Alerts']}
          active={tab}
          onChange={setTab}
        />
        <FeeMessage message={message} type="success" />
        <FeeMessage message={error} type="error" />

        {loading ? (
          <AcademicLoading />
        ) : tab === 'Summary' ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {kpis.map((k) => (
              <div key={k.label} className={`${am.card} ${am.cardPad}`}>
                <p className="text-xs font-semibold uppercase text-slate-500">{k.label}</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{k.value}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">{k.sub}</p>
              </div>
            ))}
          </div>
        ) : tab === 'Collections' ? (
          collections.length === 0 ? (
            <EmptyState>No transport collections yet.</EmptyState>
          ) : (
            <div className={am.tableWrap}>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={am.th}>Receipt</th>
                    <th className={am.th}>Student</th>
                    <th className={am.th}>Route</th>
                    <th className={am.th}>Month</th>
                    <th className={`${am.th} text-right`}>Amount</th>
                    <th className={am.th}>Mode</th>
                    <th className={am.th}>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {collections.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className={`${am.td} font-mono text-xs`}>{row.receiptNumber}</td>
                      <td className={`${am.td} font-semibold`}>
                        {row.studentName}
                        <p className="text-xs font-normal text-slate-500">
                          {[row.className, row.sectionName].filter(Boolean).join(' · ')}
                        </p>
                      </td>
                      <td className={am.td}>{row.routeName || '—'}</td>
                      <td className={am.td}>{row.monthLabel || '—'}</td>
                      <td className={`${am.td} text-right font-bold`}>{formatInr(row.amount)}</td>
                      <td className={am.td}>{row.paymentMode}</td>
                      <td className={am.td}>
                        <button
                          type="button"
                          className={`${am.btnSecondary} px-2 py-1 text-[10px]`}
                          onClick={() => downloadTransportFeeReceiptPdf(row)}
                        >
                          <Printer size={10} /> Print
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : tab === 'Vendors' ? (
          vendors.length === 0 ? (
            <EmptyState>No transport vendors empanelled.</EmptyState>
          ) : (
            <div className={am.tableWrap}>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={am.th}>Code</th>
                    <th className={am.th}>Vendor</th>
                    <th className={am.th}>Vehicle</th>
                    <th className={am.th}>Compliance</th>
                    <th className={am.th}>Approver</th>
                    <th className={am.th}>Status</th>
                    <th className={am.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((row) => (
                    <tr
                      key={row.id}
                      className={
                        row.complianceCategory === 'RED' || row.status === 'RED_CATEGORY'
                          ? 'bg-red-50/70 hover:bg-red-50'
                          : 'hover:bg-slate-50/80'
                      }
                    >
                      <td className={`${am.td} font-mono text-xs`}>{row.vendorCode}</td>
                      <td className={`${am.td} font-semibold`}>
                        {row.vendorName}
                        <p className="text-xs font-normal text-slate-500">
                          {row.contactPerson || '—'} · {row.mobile || '—'}
                        </p>
                      </td>
                      <td className={am.td}>
                        <p className="text-xs">{row.vehicleRegNo || '—'}</p>
                        <p className="text-[11px] text-slate-500">{row.vehicleType || ''}</p>
                      </td>
                      <td className={am.td}>
                        <span
                          className={
                            row.complianceCategory === 'RED'
                              ? 'text-xs font-bold text-red-700'
                              : 'text-xs text-green-700'
                          }
                        >
                          {row.complianceCategory === 'RED' ? 'RED CATEGORY' : 'NORMAL'}
                        </span>
                      </td>
                      <td className={am.td}>
                        {row.status === 'PENDING_APPROVAL' ? (
                          <div className="text-xs text-slate-600">
                            <p className="font-semibold">{row.pendingApproverRole || 'Principal'}</p>
                            {row.pendingApproverName ? <p>{row.pendingApproverName}</p> : null}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className={am.td}>
                        <StatusBadge status={row.status} />
                      </td>
                      <td className={am.td}>
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            className={`${am.btnSecondary} px-2 py-1 text-[10px]`}
                            onClick={() => setShowVendorDetail(row)}
                          >
                            <Eye size={10} /> View
                          </button>
                          {row.status === 'PENDING_APPROVAL' && (
                            <>
                              <button
                                type="button"
                                className={`${am.btnSecondary} px-2 py-1 text-[10px] text-green-700`}
                                onClick={() => void handleVendorAction('approve', row.id)}
                              >
                                <Check size={10} /> Approve
                              </button>
                              <button
                                type="button"
                                className={`${am.btnSecondary} px-2 py-1 text-[10px] text-red-700`}
                                onClick={() => setRejectId(row.id)}
                              >
                                <X size={10} /> Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : tab === 'Vendor Payments' ? (
          payments.length === 0 ? (
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
                    <th className={`${am.th} text-right`}>Amount</th>
                    <th className={am.th}>Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className={`${am.td} font-mono text-xs`}>{row.paymentNumber}</td>
                      <td className={`${am.td} font-semibold`}>{row.vendorName}</td>
                      <td className={am.td}>{row.periodLabel || '—'}</td>
                      <td className={am.td}>{row.paymentDate?.slice(0, 10) || '—'}</td>
                      <td className={`${am.td} text-right font-bold`}>{formatInr(row.amount)}</td>
                      <td className={am.td}>{row.paymentMode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : alerts.length === 0 ? (
          <EmptyState>No open Principal compliance alerts.</EmptyState>
        ) : (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Alert</th>
                  <th className={am.th}>Vendor</th>
                  <th className={am.th}>Recipient</th>
                  <th className={am.th}>Created</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((row) => (
                  <tr key={row.id} className="bg-red-50/40 hover:bg-red-50/70">
                    <td className={am.td}>
                      <p className="font-semibold text-red-800">{row.title}</p>
                      <p className="text-xs text-slate-600">{row.message}</p>
                    </td>
                    <td className={am.td}>
                      {row.vendorName}
                      <p className="text-xs text-slate-500">{row.vendorCode}</p>
                    </td>
                    <td className={am.td}>
                      <p className="text-xs font-semibold">{row.recipientRole}</p>
                      <p className="text-xs text-slate-500">{row.recipientName || row.recipientEmail || '—'}</p>
                    </td>
                    <td className={am.td}>{new Date(row.createdAt).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Collect Transport Fee */}
      <AcademicModal
        open={showCollectModal}
        onClose={() => setShowCollectModal(false)}
        title="Collect Transport Fee"
        large
      >
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Class *</label>
              <select
                className={`${am.select} w-full`}
                value={className}
                onChange={(e) => {
                  setClassName(e.target.value);
                  setSectionName('');
                  setStudentKey('');
                }}
              >
                <option value="">Select class</option>
                {classOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Section *</label>
              <select
                className={`${am.select} w-full`}
                value={sectionName}
                onChange={(e) => {
                  setSectionName(e.target.value);
                  setStudentKey('');
                }}
                disabled={!className}
              >
                <option value="">Select section</option>
                {sectionOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Student Name *</label>
              <select
                className={`${am.select} w-full`}
                value={studentKey}
                onChange={(e) => setStudentKey(e.target.value)}
                disabled={!className || !sectionName}
              >
                <option value="">Select student</option>
                {studentOptions.map((s) => (
                  <option key={feeStudentOptionKey(s)} value={feeStudentOptionKey(s)}>
                    {s.studentName}
                    {s.admissionNumber ? ` (${s.admissionNumber})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="text-sm text-slate-700">
            Total Due Fees:{' '}
            <span className="font-bold text-indigo-700 underline decoration-indigo-300">
              {contextLoading
                ? 'Loading…'
                : selectedStudent
                  ? formatInr(studentContext?.totalDueFees ?? 0)
                  : 'Select a student'}
            </span>
            <span className="ml-2 text-[11px] text-slate-400">Auto populated from accounts</span>
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Route</label>
              <select
                className={`${am.select} w-full`}
                value={collectForm.routeName}
                onChange={(e) => setCollectForm((f) => ({ ...f, routeName: e.target.value }))}
              >
                <option value="">Route map dropdown</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.routeName}>
                    {r.routeName} ({r.routeCode})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Month</label>
              <input
                type="month"
                className={am.input}
                value={collectForm.monthValue}
                onChange={(e) => setCollectForm((f) => ({ ...f, monthValue: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Amount Deposited *</label>
              <input
                type="number"
                min={0}
                className={am.input}
                value={collectForm.amount}
                onChange={(e) => setCollectForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Payment Mode *</label>
              <select
                className={`${am.select} w-full`}
                value={collectForm.paymentMode}
                onChange={(e) => setCollectForm((f) => ({ ...f, paymentMode: e.target.value }))}
              >
                {PAYMENT_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleCollect()}
            className={`${am.btnPrimary} w-full justify-center`}
            disabled={saving || !studentKey || !collectForm.amount}
          >
            Deposit and Generate Receipt
          </button>
        </div>
      </AcademicModal>

      {/* Empanel Transport Vendor */}
      <AcademicModal
        open={showVendorModal}
        onClose={() => setShowVendorModal(false)}
        title="Empanel Transport Vendor"
        large
      >
        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <section className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Basic Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">Vendor Code *</label>
                <input
                  className={am.input}
                  value={vendorForm.vendorCode}
                  onChange={(e) => setVendorForm((f) => ({ ...f, vendorCode: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Vendor Name *</label>
                <input
                  className={am.input}
                  value={vendorForm.vendorName}
                  onChange={(e) => setVendorForm((f) => ({ ...f, vendorName: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Contact Person</label>
                <input
                  className={am.input}
                  value={vendorForm.contactPerson}
                  onChange={(e) => setVendorForm((f) => ({ ...f, contactPerson: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Mobile</label>
                <input
                  className={am.input}
                  value={vendorForm.mobile}
                  onChange={(e) => setVendorForm((f) => ({ ...f, mobile: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Routes Covered</label>
              <input
                className={am.input}
                value={vendorForm.routesCovered}
                onChange={(e) => setVendorForm((f) => ({ ...f, routesCovered: e.target.value }))}
              />
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              1. Owner Demographic Details
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">PAN</label>
                <input
                  className={am.input}
                  value={vendorForm.ownerPan}
                  onChange={(e) => setVendorForm((f) => ({ ...f, ownerPan: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Aadhaar</label>
                <input
                  className={am.input}
                  value={vendorForm.ownerAadhaar}
                  onChange={(e) => setVendorForm((f) => ({ ...f, ownerAadhaar: e.target.value }))}
                />
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              2–3. Driver Details & Police Verification
            </p>
            {([1, 2] as const).map((n) => {
              const nameKey = n === 1 ? 'driver1Name' : 'driver2Name';
              const mobileKey = n === 1 ? 'driver1Mobile' : 'driver2Mobile';
              const dlKey = n === 1 ? 'driver1DlNumber' : 'driver2DlNumber';
              const dlExpiryKey = n === 1 ? 'driver1DlExpiry' : 'driver2DlExpiry';
              const policeKey =
                n === 1 ? 'driver1PoliceVerification' : 'driver2PoliceVerification';
              return (
              <div key={n} className="rounded-md border border-slate-200 p-3">
                <p className="mb-2 text-xs font-semibold text-slate-700">Driver-{n}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Name</label>
                    <input
                      className={am.input}
                      value={vendorForm[nameKey]}
                      onChange={(e) =>
                        setVendorForm((f) => ({ ...f, [nameKey]: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Mobile</label>
                    <input
                      className={am.input}
                      value={vendorForm[mobileKey]}
                      onChange={(e) =>
                        setVendorForm((f) => ({ ...f, [mobileKey]: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">DL Number</label>
                    <input
                      className={am.input}
                      value={vendorForm[dlKey]}
                      onChange={(e) =>
                        setVendorForm((f) => ({ ...f, [dlKey]: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">DL Expiry</label>
                    <input
                      type="date"
                      className={am.input}
                      value={vendorForm[dlExpiryKey]}
                      onChange={(e) =>
                        setVendorForm((f) => ({ ...f, [dlExpiryKey]: e.target.value }))
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-slate-600">Police Verification</label>
                    <input
                      className={am.input}
                      value={vendorForm[policeKey]}
                      onChange={(e) =>
                        setVendorForm((f) => ({
                          ...f,
                          [policeKey]: e.target.value,
                        }))
                      }
                      placeholder="Status / certificate reference"
                    />
                  </div>
                </div>
              </div>
              );
            })}
          </section>

          <section className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">4. Vehicle Details</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">Registration No</label>
                <input
                  className={am.input}
                  value={vendorForm.vehicleRegNo}
                  onChange={(e) => setVendorForm((f) => ({ ...f, vehicleRegNo: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Chassis No</label>
                <input
                  className={am.input}
                  value={vendorForm.vehicleChassisNo}
                  onChange={(e) =>
                    setVendorForm((f) => ({ ...f, vehicleChassisNo: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Vehicle Type</label>
                <input
                  className={am.input}
                  value={vendorForm.vehicleType}
                  onChange={(e) => setVendorForm((f) => ({ ...f, vehicleType: e.target.value }))}
                  placeholder="Bus / Van / etc."
                />
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              5–6. Pollution & Insurance (auto-reminder / red category on expiry)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">Pollution Cert Date</label>
                <input
                  type="date"
                  className={am.input}
                  value={vendorForm.pollutionCertDate}
                  onChange={(e) =>
                    setVendorForm((f) => ({ ...f, pollutionCertDate: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Pollution Expiry</label>
                <input
                  type="date"
                  className={am.input}
                  value={vendorForm.pollutionExpiryDate}
                  onChange={(e) =>
                    setVendorForm((f) => ({ ...f, pollutionExpiryDate: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Insurance Policy No</label>
                <input
                  className={am.input}
                  value={vendorForm.insurancePolicyNo}
                  onChange={(e) =>
                    setVendorForm((f) => ({ ...f, insurancePolicyNo: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Insurance Expiry</label>
                <input
                  type="date"
                  className={am.input}
                  value={vendorForm.insuranceExpiryDate}
                  onChange={(e) =>
                    setVendorForm((f) => ({ ...f, insuranceExpiryDate: e.target.value }))
                  }
                />
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">7. Tracking Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">GPS Device ID</label>
                <input
                  className={am.input}
                  value={vendorForm.trackingGpsDeviceId}
                  onChange={(e) =>
                    setVendorForm((f) => ({ ...f, trackingGpsDeviceId: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Phone / App Access</label>
                <input
                  className={am.input}
                  value={vendorForm.trackingPhoneAccess}
                  onChange={(e) =>
                    setVendorForm((f) => ({ ...f, trackingPhoneAccess: e.target.value }))
                  }
                  placeholder="Mobile number or app ID for school-hours tracking"
                />
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              8. Document Uploads (preview / download for approver)
            </p>
            <input
              type="file"
              multiple
              className="block w-full text-xs"
              onChange={(e) => void handleVendorDocs(e.target.files)}
            />
            {vendorDocuments.length > 0 && (
              <ul className="space-y-1 text-xs text-slate-600">
                {vendorDocuments.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-2 rounded bg-slate-50 px-2 py-1">
                    <span>{doc.name}</span>
                    <span className="flex gap-1">
                      <button
                        type="button"
                        className={`${am.btnSecondary} px-2 py-0.5 text-[10px]`}
                        onClick={() => previewVendorDocument(doc)}
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        className={`${am.btnSecondary} px-2 py-0.5 text-[10px]`}
                        onClick={() => downloadVendorDocument(doc)}
                      >
                        Download
                      </button>
                      <button
                        type="button"
                        className={`${am.btnSecondary} px-2 py-0.5 text-[10px] text-red-700`}
                        onClick={() =>
                          setVendorDocuments((docs) => docs.filter((d) => d.id !== doc.id))
                        }
                      >
                        Remove
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <button
            type="button"
            onClick={() => void handleVendor()}
            className={`${am.btnPrimary} w-full justify-center`}
            disabled={saving || !vendorForm.vendorCode || !vendorForm.vendorName}
          >
            <Send size={14} /> Send for approval
          </button>
        </div>
      </AcademicModal>

      {/* Vendor detail for approver */}
      <AcademicModal
        open={!!showVendorDetail}
        onClose={() => setShowVendorDetail(null)}
        title={showVendorDetail ? `Vendor — ${showVendorDetail.vendorName}` : 'Vendor'}
        large
      >
        {showVendorDetail && (
          <div className="max-h-[70vh] space-y-3 overflow-y-auto text-sm">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <p>
                <span className="font-semibold">Code:</span> {showVendorDetail.vendorCode}
              </p>
              <p>
                <span className="font-semibold">Status:</span> {showVendorDetail.status}
              </p>
              <p>
                <span className="font-semibold">Owner PAN:</span> {showVendorDetail.ownerPan || '—'}
              </p>
              <p>
                <span className="font-semibold">Owner Aadhaar:</span>{' '}
                {showVendorDetail.ownerAadhaar || '—'}
              </p>
              <p>
                <span className="font-semibold">Vehicle:</span>{' '}
                {showVendorDetail.vehicleRegNo || '—'} / {showVendorDetail.vehicleType || '—'}
              </p>
              <p>
                <span className="font-semibold">Compliance:</span>{' '}
                <span
                  className={
                    showVendorDetail.complianceCategory === 'RED'
                      ? 'font-bold text-red-700'
                      : 'text-green-700'
                  }
                >
                  {showVendorDetail.complianceCategory}
                </span>
              </p>
              <p>
                <span className="font-semibold">Pollution expiry:</span>{' '}
                {showVendorDetail.pollutionExpiryDate || '—'}
              </p>
              <p>
                <span className="font-semibold">Insurance expiry:</span>{' '}
                {showVendorDetail.insuranceExpiryDate || '—'}
              </p>
              <p>
                <span className="font-semibold">Driver-1:</span> {showVendorDetail.driver1Name || '—'}{' '}
                (DL {showVendorDetail.driver1DlNumber || '—'})
              </p>
              <p>
                <span className="font-semibold">Driver-2:</span> {showVendorDetail.driver2Name || '—'}{' '}
                (DL {showVendorDetail.driver2DlNumber || '—'})
              </p>
              <p className="col-span-2">
                <span className="font-semibold">Tracking:</span>{' '}
                {showVendorDetail.trackingGpsDeviceId || '—'} /{' '}
                {showVendorDetail.trackingPhoneAccess || '—'}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs font-bold uppercase text-slate-500">Documents</p>
              {showVendorDetail.documents?.length ? (
                <ul className="space-y-1">
                  {showVendorDetail.documents.map((doc) => (
                    <li
                      key={doc.id}
                      className="flex items-center justify-between rounded bg-slate-50 px-2 py-1 text-xs"
                    >
                      <span>{doc.name}</span>
                      <span className="flex gap-1">
                        <button
                          type="button"
                          className={`${am.btnSecondary} px-2 py-0.5 text-[10px]`}
                          onClick={() => previewVendorDocument(doc)}
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          className={`${am.btnSecondary} px-2 py-0.5 text-[10px]`}
                          onClick={() => downloadVendorDocument(doc)}
                        >
                          Download
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400">No documents uploaded.</p>
              )}
            </div>
          </div>
        )}
      </AcademicModal>

      <AcademicModal open={showPayModal} onClose={() => setShowPayModal(false)} title="Pay Transport Vendor" large>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600">Vendor</label>
            <select
              className={`${am.select} w-full`}
              value={payForm.vendorId}
              onChange={(e) => setPayForm((f) => ({ ...f, vendorId: e.target.value }))}
            >
              <option value="">Select vendor</option>
              {activeVendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vendorName}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Amount *</label>
              <input
                type="number"
                className={am.input}
                value={payForm.amount}
                onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Period</label>
              <input
                className={am.input}
                value={payForm.periodLabel}
                onChange={(e) => setPayForm((f) => ({ ...f, periodLabel: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowPayModal(false)} className={am.btnSecondary}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handlePay()}
              className={am.btnPrimary}
              disabled={!payForm.vendorId || !payForm.amount}
            >
              Pay
            </button>
          </div>
        </div>
      </AcademicModal>

      <AcademicModal open={!!rejectId} onClose={() => setRejectId(null)} title="Reject Vendor">
        <div className="space-y-3">
          <textarea
            className={am.input}
            rows={3}
            placeholder="Rejection reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setRejectId(null)} className={am.btnSecondary}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (rejectId) void handleVendorAction('reject', rejectId);
              }}
              className={am.btnPrimary}
            >
              Reject
            </button>
          </div>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
