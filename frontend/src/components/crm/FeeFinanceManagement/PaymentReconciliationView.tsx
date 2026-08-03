import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Check,
  Download,
  FileText,
  Lock,
  PenLine,
  Printer,
  RefreshCcw,
  RotateCcw,
  Send,
  X,
} from 'lucide-react';
import { downloadReconciliationPdf } from '../../../lib/reconciliationPdf';
import {
  fetchFeeDashboardMeta,
  formatInr,
  getReconciliationDay,
  getReconciliationPdfPayload,
  listReconciliations,
  processReconciliationAction,
  submitReconciliationForApproval,
  updateReconciliationInputs,
  type PaymentReconciliationRecord,
  type PaymentReconciliationStage,
} from '../../../lib/feeFinanceServices';
import {
  AcademicLoading,
  AcademicModal,
  AcademicPageHeader,
  AcademicPageShell,
  am,
  FeeMessage,
  StatusBadge,
} from './FeeFinanceUi';

const STAGE_LABELS: Record<PaymentReconciliationStage, string> = {
  CASHIER: 'Cashier',
  ACCOUNTS_EXECUTIVE: 'Accounts Executive',
  ACCOUNTS_MANAGER: 'Accounts Manager',
  FINANCE_HEAD: 'Finance Head',
  PRINCIPAL_DIRECTOR: 'Principal / Director',
  COMPLETED: 'Day Closing Completed',
};

function todayIso() {
  // Local calendar date (avoid UTC shift from toISOString)
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function AmountCell({ value, bold }: { value: number; bold?: boolean }) {
  return (
    <span className={bold ? 'font-bold' : ''}>{formatInr(value)}</span>
  );
}

function SectionTable({
  title,
  headerClass,
  headers,
  rows,
  footer,
}: {
  title: string;
  headerClass: string;
  headers: string[];
  rows: Array<{ cells: (string | number | ReactNode)[]; bold?: boolean }>;
  footer?: { cells: (string | number | ReactNode)[] };
}) {
  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white">
      <div className={`px-3 py-2 text-xs font-bold uppercase tracking-wide ${headerClass}`}>
        {title}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[240px] text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {headers.map((h) => (
                <th
                  key={h}
                  className={`px-2 py-1.5 font-semibold text-slate-600 ${h === headers[0] ? 'text-left' : 'text-right'}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/60">
                {row.cells.map((cell, j) => (
                  <td
                    key={j}
                    className={`px-2 py-1.5 ${j === 0 ? 'text-left text-slate-700' : 'text-right text-slate-900'} ${row.bold ? 'font-bold' : ''}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            {footer && (
              <tr className="bg-slate-100 font-bold">
                {footer.cells.map((cell, j) => (
                  <td
                    key={j}
                    className={`px-2 py-1.5 ${j === 0 ? 'text-left' : 'text-right'}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PaymentReconciliationView() {
  const [record, setRecord] = useState<PaymentReconciliationRecord | null>(null);
  const [approvedList, setApprovedList] = useState<PaymentReconciliationRecord[]>([]);
  const [date, setDate] = useState(todayIso());
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [years, setYears] = useState<string[]>(['2025-26']);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [inputs, setInputs] = useState({
    bankStatementTotal: '',
    cashCount: '',
    gatewaySettlement: '',
    cashDepositedToBank: '',
    cashWithdrawnFromBank: '',
    cashPayments: '',
    bankCharges: '',
    openingPettyCash: '',
    previousDayOutstanding: '',
    principalRequired: false,
    remarks: '',
  });

  const [workflowModal, setWorkflowModal] = useState<{
    mode: 'submit' | 'approve' | 'reject' | 'return' | 'freeze' | 'sign';
    forwardToPrincipal?: boolean;
  } | null>(null);
  const [workflowRemarks, setWorkflowRemarks] = useState('');
  const [digitalSignature, setDigitalSignature] = useState('');

  const applyRecordToInputs = (data: PaymentReconciliationRecord) => {
    const sync = data.report?.syncSources;
    setInputs({
      bankStatementTotal: String(data.bankStatementTotal || ''),
      cashCount: String(data.cashCount || ''),
      gatewaySettlement: String(
        data.gatewaySettlement || sync?.systemOnlineGateway || '',
      ),
      cashDepositedToBank: String(
        data.cashDepositedToBank || sync?.systemCashDeposited || '',
      ),
      cashWithdrawnFromBank: String(data.cashWithdrawnFromBank || ''),
      cashPayments: String(data.cashPayments || ''),
      bankCharges: String(data.bankCharges || ''),
      openingPettyCash: String(data.openingPettyCash || ''),
      previousDayOutstanding: String(data.previousDayOutstanding || ''),
      principalRequired: data.principalRequired,
      remarks: data.remarks || '',
    });
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const meta = await fetchFeeDashboardMeta();
      if (meta.academicYears?.length) setYears(meta.academicYears);
      const year = academicYear || meta.defaultAcademicYear || '2025-26';
      if (!academicYear && meta.defaultAcademicYear) setAcademicYear(meta.defaultAcademicYear);

      const [data, list] = await Promise.all([
        getReconciliationDay({ date, academicYear: year }),
        listReconciliations({ academicYear: year, limit: '20' }),
      ]);
      setRecord(data);
      applyRecordToInputs(data);
      setApprovedList(
        list.filter(
          (r) =>
            r.status === 'DAY_CLOSING_COMPLETED' || r.status === 'FROZEN',
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reconciliation');
    } finally {
      setLoading(false);
    }
  }, [date, academicYear]);

  useEffect(() => {
    void load();
  }, [load]);

  const editable = useMemo(
    () => record?.status === 'DRAFT' || record?.status === 'RETURNED',
    [record?.status],
  );

  const isApprovedPrintable = useMemo(
    () =>
      record?.status === 'DAY_CLOSING_COMPLETED' || record?.status === 'FROZEN',
    [record?.status],
  );

  const report = record?.report;

  const collectionTotals = useMemo(() => {
    if (!report) return null;
    const t = { cash: 0, online: 0, cheque: 0, bankTransfer: 0, upi: 0, pos: 0, total: 0 };
    for (const r of report.collectionSummary) {
      t.cash += r.cash;
      t.online += r.online;
      t.cheque += r.cheque;
      t.bankTransfer += r.bankTransfer;
      t.upi += r.upi;
      t.pos += r.pos;
      t.total += r.total;
    }
    return t;
  }, [report]);

  const saveInputs = async () => {
    if (!record) return;
    setSaving(true);
    setError('');
    try {
      const num = (v: string) => Number(v) || 0;
      const updated = await updateReconciliationInputs(record.id, {
        bankStatementTotal: num(inputs.bankStatementTotal),
        cashCount: num(inputs.cashCount),
        gatewaySettlement: num(inputs.gatewaySettlement),
        cashDepositedToBank: num(inputs.cashDepositedToBank),
        cashWithdrawnFromBank: num(inputs.cashWithdrawnFromBank),
        cashPayments: num(inputs.cashPayments),
        bankCharges: num(inputs.bankCharges),
        openingPettyCash: num(inputs.openingPettyCash),
        previousDayOutstanding: num(inputs.previousDayOutstanding),
        principalRequired: inputs.principalRequired,
        remarks: inputs.remarks,
      });
      setRecord(updated);
      applyRecordToInputs(updated);
      setMessage('Reconciliation inputs saved — collections & bank deposits re-synced');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleWorkflow = async () => {
    if (!record || !workflowModal) return;
    setSaving(true);
    setError('');
    try {
      if (workflowModal.mode === 'submit') {
        await saveInputs();
        const updated = await submitReconciliationForApproval(record.id, {
          remarks: workflowRemarks,
          digitalSignature,
        });
        setRecord(updated);
        setMessage('Sent for approval — day closing frozen for review');
      } else {
        const actionMap = {
          approve: 'APPROVE' as const,
          reject: 'REJECT' as const,
          return: 'RETURN_FOR_CORRECTION' as const,
          freeze: 'FREEZE' as const,
          sign: 'SIGN' as const,
        };
        const updated = await processReconciliationAction(record.id, {
          action: actionMap[workflowModal.mode],
          remarks: workflowRemarks,
          digitalSignature,
          forwardToPrincipal: workflowModal.forwardToPrincipal,
        });
        setRecord(updated);
        setMessage(`Action recorded: ${workflowModal.mode}`);
        if (updated.status === 'DAY_CLOSING_COMPLETED' || updated.status === 'FROZEN') {
          void load();
        }
      }
      setWorkflowModal(null);
      setWorkflowRemarks('');
      setDigitalSignature('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Workflow action failed');
    } finally {
      setSaving(false);
    }
  };

  const handlePdf = async (id?: string, opts?: { requireApproved?: boolean }) => {
    const targetId = id || record?.id;
    if (!targetId) return;
    try {
      const payload = await getReconciliationPdfPayload(targetId);
      if (opts?.requireApproved && !payload.approved) {
        setError('Only approved / frozen day closings can be printed as the official accounts printout');
        return;
      }
      downloadReconciliationPdf(payload);
      setMessage(
        payload.approved
          ? 'Approved reconciliation printout downloaded'
          : 'Draft reconciliation PDF downloaded',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PDF generation failed');
    }
  };

  const currentStageLabel = record ? STAGE_LABELS[record.currentStage] : '';
  const sync = report?.syncSources;

  if (loading && !record) {
    return <AcademicLoading label="Loading payment reconciliation…" />;
  }

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Fees & Finance › Payment Reconciliation"
        title="Payment Reconciliation"
        subtitle="All collections & expenses sync here — after approval they post to Accounts & Ledger (refunds never bypass)"
        actions={
          <>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className={am.select}
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <input
              type="date"
              className={am.select}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <button type="button" onClick={() => void load()} className={am.btnSecondary}>
              <RefreshCcw size={14} /> Refresh
            </button>
            {editable && (
              <button type="button" onClick={() => void saveInputs()} className={am.btnSecondary} disabled={saving}>
                Save Inputs
              </button>
            )}
            <button type="button" onClick={() => void handlePdf()} className={am.btnSecondary}>
              <Download size={14} /> Download PDF
            </button>
            {isApprovedPrintable && (
              <button
                type="button"
                onClick={() => void handlePdf(undefined, { requireApproved: true })}
                className={am.btnPrimary}
              >
                <Printer size={14} /> Print Approved
              </button>
            )}
          </>
        }
      />

      <div className={am.content}>
        {message && <FeeMessage message={message} type="success" />}
        {error && <FeeMessage message={error} type="error" />}

        {record && (
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <StatusBadge status={record.status} />
            <span className="text-slate-500">
              Current stage: <strong className="text-slate-800">{currentStageLabel}</strong>
            </span>
            {record.frozenAt && (
              <span className="text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded">
                Frozen {new Date(record.frozenAt).toLocaleString('en-IN')}
              </span>
            )}
            {report && (
              <div className="ml-auto bg-orange-500 text-white rounded-xl px-4 py-2 shadow-sm text-right">
                <p className="text-[9px] font-bold uppercase tracking-wide opacity-90">Total Amount</p>
                <p className="text-xl font-bold tabular-nums">{formatInr(report.totals.erpTotalCollection)}</p>
              </div>
            )}
          </div>
        )}

        {sync && (
          <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
            Synced for this day:{' '}
            <strong>{sync.feeReceipts}</strong> fee receipts ·{' '}
            <strong>{sync.invoicePayments}</strong> invoice payments ·{' '}
            <strong>{sync.transportCollections + sync.hostelCollections}</strong> transport/hostel ·{' '}
            <strong>{sync.onlinePaymentOrders ?? 0}</strong> online gateway orders ·{' '}
            <strong>{sync.expensePayments ?? 0}</strong> expenses ·{' '}
            <strong>{sync.paidFines ?? 0}</strong> paid fines ·{' '}
            <strong>{sync.cashBankDeposits}</strong> cash bank deposits (
            {formatInr(sync.systemCashDeposited)}) ·{' '}
            <strong>{sync.chequeBankDeposits}</strong> cheque slips · online/UPI/POS{' '}
            {formatInr(sync.systemOnlineGateway)}. After final approval, these figures post to Accounts
            &amp; Ledger (refunds included only via this panel).
          </div>
        )}

        {record && (
          <div className="bg-white border border-slate-200 rounded-xl p-3 overflow-x-auto">
            <p className="text-[10px] font-bold uppercase text-slate-500 mb-2">Finance Head Approval Workflow</p>
            <div className="flex items-center gap-1 min-w-max text-[10px]">
              {record.workflow.map((stage, i) => {
                const done = record.approvals.some(
                  (a) => a.stage === stage.key && (a.action === 'APPROVE' || a.action === 'SUBMIT'),
                );
                const active = record.currentStage === stage.key;
                return (
                  <div key={stage.key} className="flex items-center gap-1">
                    <div
                      className={`px-2 py-1 rounded font-semibold ${
                        done
                          ? 'bg-green-100 text-green-800'
                          : active
                            ? 'bg-indigo-100 text-indigo-800 ring-2 ring-indigo-300'
                            : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {stage.label}
                    </div>
                    {i < record.workflow.length - 1 && <span className="text-slate-300">▼</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {editable && (
          <div className="bg-slate-50 border border-blue-200 rounded-xl p-3 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ['bankStatementTotal', 'Bank Statement Total'],
              ['cashCount', 'Cash Count'],
              ['gatewaySettlement', 'Gateway Settlement (auto from online)'],
              ['cashDepositedToBank', 'Cash Deposited to Bank (auto from Bank Book)'],
              ['cashWithdrawnFromBank', 'Cash Withdrawn from Bank'],
              ['cashPayments', 'Cash Payments'],
              ['bankCharges', 'Bank Charges'],
              ['openingPettyCash', 'Opening Petty Cash'],
              ['previousDayOutstanding', 'Previous Day Outstanding'],
            ].map(([key, label]) => (
              <div key={key}>
                <label className="text-[10px] font-semibold text-slate-500">{label}</label>
                <input
                  type="number"
                  className={`${am.input} w-full`}
                  value={inputs[key as keyof typeof inputs] as string}
                  onChange={(e) => setInputs((f) => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={inputs.principalRequired}
                  onChange={(e) => setInputs((f) => ({ ...f, principalRequired: e.target.checked }))}
                />
                Require Principal / Director approval
              </label>
            </div>
            <div className="col-span-full">
              <label className="text-[10px] font-semibold text-slate-500">Remarks</label>
              <input
                className={`${am.input} w-full`}
                value={inputs.remarks}
                onChange={(e) => setInputs((f) => ({ ...f, remarks: e.target.value }))}
              />
            </div>
          </div>
        )}

        {loading ? (
          <AcademicLoading />
        ) : report ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <SectionTable
              title="Openings"
              headerClass="bg-slate-500 text-white"
              headers={['Particular', 'Amount']}
              rows={report.openings.map((r) => ({
                cells: [r.label, <AmountCell key={r.label} value={r.amount} />],
              }))}
            />

            <SectionTable
              title="Cash Movement"
              headerClass="bg-amber-400 text-slate-900"
              headers={['Particular', 'Amount']}
              rows={report.cashMovement
                .filter((r) => r.rowType === 'item')
                .map((r) => ({
                  cells: [r.label, <AmountCell key={r.label} value={r.amount} />],
                }))}
              footer={{
                cells: [
                  report.cashMovement.find((r) => r.rowType === 'total')?.label || '= Closing Cash in Hand',
                  <AmountCell
                    key="cc"
                    value={report.totals.closingCashInHand}
                    bold
                  />,
                ],
              }}
            />

            <SectionTable
              title="Bank Movement"
              headerClass="bg-green-600 text-white"
              headers={['Particular', 'Amount']}
              rows={report.bankMovement
                .filter((r) => r.rowType === 'item')
                .map((r) => ({
                  cells: [r.label, <AmountCell key={r.label} value={r.amount} />],
                }))}
              footer={{
                cells: [
                  report.bankMovement.find((r) => r.rowType === 'total')?.label || '= Closing Bank Balance',
                  <AmountCell
                    key="cb"
                    value={report.totals.closingBankBalance}
                    bold
                  />,
                ],
              }}
            />

            <SectionTable
              title="Collection Summary"
              headerClass="bg-orange-200 text-slate-900"
              headers={['Collection Head', 'Cash', 'Online', 'Cheque', 'Bank Transfer', 'UPI', 'POS', 'Total']}
              rows={report.collectionSummary.map((r) => ({
                cells: [
                  r.label,
                  <AmountCell key={`${r.category}-c`} value={r.cash} />,
                  <AmountCell key={`${r.category}-o`} value={r.online} />,
                  <AmountCell key={`${r.category}-ch`} value={r.cheque} />,
                  <AmountCell key={`${r.category}-b`} value={r.bankTransfer} />,
                  <AmountCell key={`${r.category}-u`} value={r.upi} />,
                  <AmountCell key={`${r.category}-p`} value={r.pos} />,
                  <AmountCell key={`${r.category}-t`} value={r.total} bold />,
                ],
              }))}
              footer={
                collectionTotals
                  ? {
                      cells: [
                        'Total',
                        <AmountCell key="tc" value={collectionTotals.cash} bold />,
                        <AmountCell key="to" value={collectionTotals.online} bold />,
                        <AmountCell key="tch" value={collectionTotals.cheque} bold />,
                        <AmountCell key="tb" value={collectionTotals.bankTransfer} bold />,
                        <AmountCell key="tu" value={collectionTotals.upi} bold />,
                        <AmountCell key="tp" value={collectionTotals.pos} bold />,
                        <AmountCell key="tt" value={collectionTotals.total} bold />,
                      ],
                    }
                  : undefined
              }
            />

            <SectionTable
              title="Reconciliation Summary"
              headerClass="bg-blue-600 text-white"
              headers={['Description', 'Amount']}
              rows={report.reconciliationSummary
                .filter((r) => !r.highlight)
                .map((r) => ({
                  cells: [r.label, <AmountCell key={r.label} value={r.amount} />],
                }))}
              footer={{
                cells: [
                  'Total Available Funds (= Cash in Hand + Bank Balance)',
                  <AmountCell key="taf" value={report.totalAvailableFunds} bold />,
                ],
              }}
            />

            <SectionTable
              title="System Verification"
              headerClass="bg-orange-700 text-white"
              headers={['Particular', 'Amount']}
              rows={report.systemVerification
                .filter((r) => !r.highlight)
                .map((r) => ({
                  cells: [r.label, <AmountCell key={r.label} value={r.amount} />],
                }))}
              footer={{
                cells: [
                  'Difference',
                  <AmountCell
                    key="diff"
                    value={report.totals.difference}
                    bold
                  />,
                ],
              }}
            />
          </div>
        ) : null}

        {approvedList.length > 0 && (
          <div className={am.tableWrap}>
            <p className="text-xs font-bold text-slate-600 px-2 py-2 border-b border-slate-100 flex items-center gap-2">
              <Printer size={14} /> Approved reconciliations — print / download for accounts
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50">
                  <th className={`${am.th} text-left`}>Date</th>
                  <th className={`${am.th} text-left`}>Status</th>
                  <th className={`${am.th} text-right`}>ERP Collection</th>
                  <th className={`${am.th} text-right`}>Available Funds</th>
                  <th className={`${am.th} text-left`}>Completed</th>
                  <th className={`${am.th} text-right`}>Print</th>
                </tr>
              </thead>
              <tbody>
                {approvedList.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className={am.td}>
                      <button
                        type="button"
                        className="font-semibold text-indigo-700 underline"
                        onClick={() => setDate(row.reconciliationDate)}
                      >
                        {row.reconciliationDate}
                      </button>
                    </td>
                    <td className={am.td}>
                      <StatusBadge status={row.status} />
                    </td>
                    <td className={`${am.td} text-right`}>
                      {formatInr(row.report?.totals?.erpTotalCollection || 0)}
                    </td>
                    <td className={`${am.td} text-right`}>
                      {formatInr(row.report?.totalAvailableFunds || 0)}
                    </td>
                    <td className={am.td}>
                      {row.completedAt
                        ? new Date(row.completedAt).toLocaleString('en-IN')
                        : row.frozenAt
                          ? new Date(row.frozenAt).toLocaleString('en-IN')
                          : '—'}
                    </td>
                    <td className={`${am.td} text-right`}>
                      <button
                        type="button"
                        className={am.btnSecondary}
                        onClick={() => void handlePdf(row.id, { requireApproved: true })}
                      >
                        <Printer size={12} /> Print
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {record && record.approvals.length > 0 && (
          <div className={am.tableWrap}>
            <p className="text-xs font-bold text-slate-600 px-2 py-2 border-b border-slate-100">
              Approval Trail & Digital Signatures
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50">
                  <th className={`${am.th} text-left`}>Stage</th>
                  <th className={`${am.th} text-left`}>Action</th>
                  <th className={`${am.th} text-left`}>By</th>
                  <th className={`${am.th} text-left`}>Remarks</th>
                  <th className={`${am.th} text-left`}>Digital Signature</th>
                  <th className={`${am.th} text-left`}>Date</th>
                </tr>
              </thead>
              <tbody>
                {record.approvals.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className={am.td}>{STAGE_LABELS[a.stage]}</td>
                    <td className={am.td}>{a.action.replace(/_/g, ' ')}</td>
                    <td className={am.td}>{a.actorName}</td>
                    <td className={am.td}>{a.remarks}</td>
                    <td className={`${am.td} font-mono text-[10px]`}>{a.digitalSignature}</td>
                    <td className={am.td}>{new Date(a.signedAt).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          {editable && (
            <button
              type="button"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow flex items-center gap-2"
              onClick={() => setWorkflowModal({ mode: 'submit' })}
            >
              <Send size={16} /> Send for Approval
            </button>
          )}

          {record?.status === 'PENDING_APPROVAL' && (
            <>
              <button
                type="button"
                className={am.btnSecondary}
                onClick={() => setWorkflowModal({ mode: 'sign' })}
              >
                <PenLine size={14} /> Sign
              </button>
              <button
                type="button"
                className={am.btnSecondary}
                onClick={() => setWorkflowModal({ mode: 'freeze' })}
              >
                <Lock size={14} /> Freeze Day Closing
              </button>
              <button
                type="button"
                className={am.btnSecondary}
                onClick={() => setWorkflowModal({ mode: 'return' })}
              >
                <RotateCcw size={14} /> Return for Correction
              </button>
              <button
                type="button"
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1"
                onClick={() => setWorkflowModal({ mode: 'reject' })}
              >
                <X size={14} /> Reject
              </button>
              {record.currentStage === 'FINANCE_HEAD' && (
                <>
                  <button
                    type="button"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1"
                    onClick={() => setWorkflowModal({ mode: 'approve', forwardToPrincipal: true })}
                  >
                    <Check size={14} /> Approve → Principal
                  </button>
                  <button
                    type="button"
                    className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1"
                    onClick={() => setWorkflowModal({ mode: 'approve', forwardToPrincipal: false })}
                  >
                    <Check size={14} /> Approve & Complete
                  </button>
                </>
              )}
              {record.currentStage !== 'FINANCE_HEAD' && (
                <button
                  type="button"
                  className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1"
                  onClick={() => setWorkflowModal({ mode: 'approve' })}
                >
                  <Check size={14} /> Approve
                </button>
              )}
            </>
          )}

          {isApprovedPrintable && (
            <button
              type="button"
              className={am.btnPrimary}
              onClick={() => void handlePdf(undefined, { requireApproved: true })}
            >
              <FileText size={14} /> Print Approved Reconciliation
            </button>
          )}
        </div>

        <p className="text-[11px] text-slate-400">
          Collection Summary syncs all Fee Collection sources against collection headers (Student /
          Hostel / Transport / Admission / Exam / Library / Fine / Other): fee receipts by fee head,
          invoice settlements (without linked receipt), transport &amp; hostel collections, paid fines,
          and Bank &amp; Cash Book deposits. Total Available Funds = Current Cash in Hand + Current Bank
          Balance. Workflow: Cashier → Accounts Executive → Accounts Manager → Finance Head →
          Principal/Director (optional) → Day Closing Completed.
        </p>
      </div>

      <AcademicModal
        open={!!workflowModal}
        onClose={() => setWorkflowModal(null)}
        title={
          workflowModal?.mode === 'submit'
            ? 'Send for Approval'
            : workflowModal?.mode === 'approve'
              ? 'Approve Reconciliation'
              : workflowModal?.mode === 'reject'
                ? 'Reject Reconciliation'
                : workflowModal?.mode === 'return'
                  ? 'Return for Correction'
                  : workflowModal?.mode === 'freeze'
                    ? 'Freeze Day Closing'
                    : 'Digital Sign'
        }
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600">Remarks</label>
            <textarea
              className={`${am.input} w-full min-h-[72px]`}
              value={workflowRemarks}
              onChange={(e) => setWorkflowRemarks(e.target.value)}
              placeholder="Add remarks for this action…"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Digital Signature</label>
            <input
              className={am.input}
              value={digitalSignature}
              onChange={(e) => setDigitalSignature(e.target.value)}
              placeholder="Type your name to sign digitally"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setWorkflowModal(null)} className={am.btnSecondary}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleWorkflow()}
              className={am.btnPrimary}
              disabled={saving}
            >
              Confirm
            </button>
          </div>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
