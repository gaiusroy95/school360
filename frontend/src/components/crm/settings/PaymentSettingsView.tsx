import { useCallback, useEffect, useState } from 'react';
import { CreditCard, Globe, Wallet, RefreshCw, CheckCircle2, ExternalLink } from 'lucide-react';
import {
  fetchFeeFinancialOperations,
  syncFeeFinancialOperations,
  type FeeFinancialOperations,
} from '../../../lib/feeFinanceServices';
import { toViewKey } from '../../../lib/navigation';
import { AcademicLoading } from '../FeeFinanceManagement/FeeFinanceUi';

export function PaymentSettingsView({ onNavigate }: { onNavigate?: (view: string) => void }) {
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
    await syncFeeFinancialOperations(academicYear);
    setMessage(`Financial operations synced for ${academicYear}`);
    void load();
    setTimeout(() => setMessage(''), 5000);
  };

  const jump = (module: string, page: string) => onNavigate?.(toViewKey(module, page));

  if (loading && !data) return <AcademicLoading label="Loading payment settings…" />;

  const online = data?.onlinePayment;
  const methods = data?.paymentMethods ?? [];

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Payment Settings</h2>
          <p className="text-xs text-slate-500 mt-0.5">Payment gateways, online collection, methods and reminders</p>
        </div>
        <div className="flex items-center gap-2">
          <input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="text-xs border rounded px-2 py-1.5 w-24" />
          <button type="button" onClick={() => void load()} className="p-1.5 border border-slate-200 rounded hover:bg-slate-50">
            <RefreshCw size={14} />
          </button>
          <button type="button" onClick={() => void handleSync()} className="flex items-center gap-1 px-3 py-1.5 text-xs border rounded-lg hover:bg-slate-50">
            <RefreshCw size={12} /> Sync from Setup
          </button>
        </div>
      </div>

      {message && (
        <div className="px-4 py-2 bg-teal-50 text-teal-800 text-sm rounded-lg border border-teal-200 flex items-center gap-2">
          <CheckCircle2 size={16} />{message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <CreditCard size={16} className="text-blue-600" />
            Payment Gateway
          </div>
          <p className="text-xs text-slate-600">Provider: <strong>{online?.provider ?? 'Not configured'}</strong></p>
          <p className="text-xs text-slate-600">
            Status:{' '}
            <span className={`font-bold ${online?.isEnabled ? 'text-green-600' : 'text-amber-600'}`}>
              {online?.isEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </p>
          <p className="text-xs text-slate-600">API Key: <strong>{online?.apiKeyMasked || '—'}</strong></p>
          <p className="text-xs text-slate-600">Webhook: <strong className="truncate">{online?.webhookUrl || '—'}</strong></p>
          <button
            type="button"
            onClick={() => jump('Settings Management', 'Integrations, APIs & Notifications')}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
          >
            Configure in Integrations <ExternalLink size={10} />
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <Globe size={16} className="text-cyan-600" />
            Online Payment Settings
          </div>
          <p className="text-xs text-slate-500">
            Online fee collection uses the gateway above. Configure Razorpay keys in Integrations or Institution Setup → Integration Setup.
          </p>
          <button
            type="button"
            onClick={() => jump('Fees & Finance', 'Financial Operations')}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
          >
            Open Financial Operations <ExternalLink size={10} />
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <Wallet size={16} className="text-green-600" />
            Fee Payment Methods
          </div>
          {methods.length === 0 ? (
            <p className="text-xs text-slate-500">No payment methods synced yet.</p>
          ) : (
            <ul className="text-xs text-slate-600 space-y-1 max-h-32 overflow-y-auto">
              {methods.map((m) => (
                <li key={m.methodCode} className="flex justify-between">
                  <span>{m.methodName}</span>
                  <span className={m.isEnabled ? 'text-green-600 font-bold' : 'text-slate-400'}>{m.isEnabled ? 'On' : 'Off'}</span>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => jump('Fees & Finance', 'Fee Collection')}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
          >
            Manage Fee Collection <ExternalLink size={10} />
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-2">
          <p className="text-sm font-bold text-slate-800">Invoice Settings</p>
          <p className="text-xs text-slate-500">Invoice templates and numbering are managed in Fees & Finance.</p>
          <button type="button" onClick={() => jump('Fees & Finance', 'Invoices')} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
            Open Invoices <ExternalLink size={10} />
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-2">
          <p className="text-sm font-bold text-slate-800">Refund & Cancellation</p>
          <p className="text-xs text-slate-500">Process refunds and fee reversals from the finance module.</p>
          <button type="button" onClick={() => jump('Fees & Finance', 'Refunds')} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
            Open Refunds <ExternalLink size={10} />
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-2">
          <p className="text-sm font-bold text-slate-800">Payment Reminders</p>
          <p className="text-xs text-slate-500">
            Reminder automation:{' '}
            <strong>{data?.reminders?.isActive ? 'Active' : 'Inactive'}</strong>
            {data?.reminders?.cronSchedule ? ` (${data.reminders.cronSchedule})` : ''}
          </p>
          <button type="button" onClick={() => jump('Fees & Finance', 'Fee Collection')} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
            Configure Reminders <ExternalLink size={10} />
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-[10px] text-blue-900">
        <p className="font-bold mb-1">Configuration path</p>
        <p>Primary setup: Institution Setup → Fee Group Setup & Integration Setup. Use &quot;Sync from Setup&quot; here to pull the latest payment configuration into the live fee engine.</p>
      </div>
    </div>
  );
}
