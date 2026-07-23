import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Check,
  Download,
  FileText,
  Lock,
  PenLine,
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
  return new Date().toISOString().slice(0, 10);
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

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const meta = await fetchFeeDashboardMeta();
      if (meta.academicYears?.length) setYears(meta.academicYears);
      const year = academicYear || meta.defaultAcademicYear || '2025-26';
      if (!academicYear && meta.defaultAcademicYear) setAcademicYear(meta.defaultAcademicYear);

      const data = await getReconciliationDay({ date, academicYear: year });
      setRecord(data);
      setInputs({
        bankStatementTotal: String(data.bankStatementTotal || ''),
        cashCount: String(data.cashCount || ''),
        gatewaySettlement: String(data.gatewaySettlement || ''),
        cashDepositedToBank: String(data.cashDepositedToBank || ''),
        cashWithdrawnFromBank: String(data.cashWithdrawnFromBank || ''),
        cashPayments: String(data.cashPayments || ''),
        bankCharges: String(data.bankCharges || ''),
        openingPettyCash: String(data.openingPettyCash || ''),
        previousDayOutstanding: String(data.previousDayOutstanding || ''),
        principalRequired: data.principalRequired,
        remarks: data.remarks || '',
      });
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
      setMessage('Reconciliation inputs saved');
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

  const handlePdf = async () => {
    if (!record) return;
    try {
      const payload = await getReconciliationPdfPayload(record.id);
      downloadReconciliationPdf(payload);
      setMessage('PDF downloaded for accounts department');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PDF generation failed');
    }
  };

  const currentStageLabel = record ? STAGE_LABELS[record.currentStage] : '';

  if (loading && !record) {
    return <AcademicLoading label="Loading payment reconciliation…" />;
  }

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Fees & Finance › Payment Reconciliation"
        title="Payment Reconciliation"
        subtitle="Daily cash & bank reconciliation with multi-level finance approval workflow"
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
          </div>
        )}

        {/* Workflow progress */}
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

        {/* Manual verification inputs */}
        {editable && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ['bankStatementTotal', 'Bank Statement Total'],
              ['cashCount', 'Cash Count'],
              ['gatewaySettlement', 'Gateway Settlement'],
              ['cashDepositedToBank', 'Cash Deposited to Bank'],
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

        {/* Approval trail */}
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

        {/* Action bar */}
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

          {record?.status === 'DAY_CLOSING_COMPLETED' && (
            <button type="button" className={am.btnPrimary} onClick={() => void handlePdf()}>
              <FileText size={14} /> Download Signed PDF
            </button>
          )}
        </div>

        <p className="text-[11px] text-slate-400">
          Total Available Funds = Current Cash in Hand + Current Bank Balance. Workflow: Cashier →
          Accounts Executive → Accounts Manager → Finance Head → Principal/Director (optional) → Day
          Closing Completed.
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
