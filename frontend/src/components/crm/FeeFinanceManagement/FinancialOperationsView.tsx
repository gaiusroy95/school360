import { useCallback, useEffect, useState } from 'react';
import {
  RefreshCw, Layers, List, Calendar, Percent, AlertTriangle,
  CreditCard, Globe, RefreshCcw, Bell, CheckCircle2,
} from 'lucide-react';
import {
  fetchFeeFinancialOperations,
  syncFeeFinancialOperations,
  type FeeFinancialOperations,
} from '../../../lib/feeFinanceServices';
import { AcademicLoading, AcademicPageHeader, AcademicPageShell, am } from '../AcademicManagement/AcademicManagementUi';

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={`${am.card} p-4 space-y-2`}>
      <div className="flex items-center gap-2 text-sm font-bold text-slate-800">{icon}{title}</div>
      <div className="text-xs text-slate-600 space-y-1">{children}</div>
    </div>
  );
}

export function FinancialOperationsView() {
  const [data, setData] = useState<FeeFinancialOperations | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [academicYear, setAcademicYear] = useState('2025-26');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchFeeFinancialOperations(academicYear));
    } finally {
      setLoading(false);
    }
  }, [academicYear]);

  useEffect(() => { void load(); }, [load]);

  const handleSync = async () => {
    const res = await syncFeeFinancialOperations(academicYear);
    setMessage(`Financial operations synced for ${res.academicYear}`);
    void load();
  };

  if (loading && !data) return <AcademicLoading label="Loading fee financial operations…" />;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Fees & Finance › Financial Operations"
        title="Fee Management & Financial Operations"
        subtitle="Fee groups, types, installments, concessions, late fees, payment methods, online settings, refunds, and reminders"
        actions={(
          <button type="button" onClick={() => void handleSync()} className={am.btnSecondary}>
            <RefreshCw size={14} /> Sync from Setup
          </button>
        )}
      />

      <div className={am.content}>
        <div className="flex items-center gap-3 mb-4">
          <label className="text-xs font-semibold text-slate-600">Academic Year</label>
          <input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className={am.input} style={{ width: 120 }} />
          <button type="button" onClick={() => void load()} className={am.btnSecondary}>Load</button>
        </div>

        {message && (
          <div className="mb-4 px-4 py-2 bg-teal-50 text-teal-800 text-sm rounded-lg border border-teal-200 flex items-center gap-2">
            <CheckCircle2 size={16} />{message}
          </div>
        )}

        <p className="text-xs text-slate-500 mb-4">
          Configure in <strong>Institution Setup → Fee Group Setup</strong> and <strong>Integration Setup → Payment Gateway</strong>, then save or sync.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <Card title="Fee Group Master" icon={<Layers size={16} className="text-blue-600" />}>
            <p><strong>{data?.feeGroups.length ?? 0}</strong> groups ({data?.schedulesCount ?? 0} class schedules)</p>
            <ul className="mt-1 max-h-24 overflow-y-auto">
              {data?.feeGroups.map((g) => <li key={g.id}>{g.groupName} ({g.groupCode})</li>)}
            </ul>
          </Card>

          <Card title="Fee Type Setup" icon={<List size={16} className="text-indigo-600" />}>
            <p><strong>{data?.feeTypes.length ?? 0}</strong> fee types with GL mapping</p>
            <ul className="mt-1 max-h-24 overflow-y-auto">
              {data?.feeTypes.slice(0, 8).map((t) => <li key={t.id}>{t.name} → {t.glAccount || '—'}</li>)}
            </ul>
          </Card>

          <Card title="Installment Setup" icon={<Calendar size={16} className="text-purple-600" />}>
            <p>Count: <strong>{data?.installment?.installmentCount ?? '—'}</strong></p>
            <p>Schedule: <strong>{data?.installment?.scheduleType ?? '—'}</strong></p>
          </Card>

          <Card title="Concession & Discount" icon={<Percent size={16} className="text-green-600" />}>
            <p>Allowed: <strong>{data?.concession?.allowConcessions ? 'Yes' : 'No'}</strong></p>
            <p>Max discount: <strong>{data?.concession?.maxDiscountPercent ?? '—'}%</strong></p>
            <p>Approval: <strong>{data?.concession?.approvalLevel ?? '—'}</strong></p>
          </Card>

          <Card title="Late Fee Configuration" icon={<AlertTriangle size={16} className="text-amber-600" />}>
            <p>Grace days: <strong>{data?.lateFee?.graceDays ?? '—'}</strong></p>
            <p>Type: <strong>{data?.lateFee?.fineType ?? '—'}</strong></p>
            <p>Amount: <strong>{data?.lateFee?.fineAmount ?? 0}</strong>{data?.lateFee?.finePercent ? ` / ${data.lateFee.finePercent}%` : ''}</p>
          </Card>

          <Card title="Fee Payment Methods" icon={<CreditCard size={16} className="text-slate-700" />}>
            <ul>
              {(data?.enabledPaymentMethods || []).map((m) => (
                <li key={m.methodCode}><strong>{m.methodName}</strong></li>
              ))}
            </ul>
          </Card>

          <Card title="Online Payment Settings" icon={<Globe size={16} className="text-cyan-600" />}>
            <p>Provider: <strong>{data?.onlinePayment?.provider ?? '—'}</strong></p>
            <p>Enabled: <strong>{data?.onlinePayment?.isEnabled ? 'Yes' : 'No'}</strong></p>
            <p>API Key: <strong>{data?.onlinePayment?.apiKeyMasked || '—'}</strong></p>
          </Card>

          <Card title="Refund & Cancellation" icon={<RefreshCcw size={16} className="text-red-600" />}>
            <p>Approval required: <strong>{data?.refund?.requireApproval ? 'Yes' : 'No'}</strong></p>
            <p>Auto ledger credit: <strong>{data?.refund?.autoCreditLedger ? 'Yes' : 'No'}</strong></p>
          </Card>

          <Card title="Payment Reminders" icon={<Bell size={16} className="text-orange-600" />}>
            <p>Active: <strong>{data?.reminders?.isActive ? 'Yes' : 'No'}</strong></p>
            <p>Cron: <strong>{data?.reminders?.cronSchedule ?? '—'}</strong></p>
            <p>Channels: <strong>{Array.isArray(data?.reminders?.channels) ? (data!.reminders!.channels as string[]).join(', ') : '—'}</strong></p>
          </Card>
        </div>
      </div>
    </AcademicPageShell>
  );
}
