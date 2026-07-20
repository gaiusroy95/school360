import { useMemo, useState } from 'react';
import {
  UploadCloud,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Database,
  Server,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { applyExpressSetup, updateInstitutionTile } from '../../../lib/institutionApi';
import {
  downloadInstitutionSetupTemplate,
  parseInstitutionSetupWorkbook,
  type ParsedExpressSetup,
} from '../../../lib/expressSetupExcel';

export function ExpressSetupView({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'provisioning' | 'error' | 'final_steps'>('upload');
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [parsed, setParsed] = useState<ParsedExpressSetup | null>(null);
  const [fileName, setFileName] = useState('');
  const [errorList, setErrorList] = useState<string[]>([]);
  const [apiError, setApiError] = useState('');
  const [integrationForm, setIntegrationForm] = useState({
    paymentKey: '',
    paymentSecret: '',
    smsKey: '',
    ssoSecret: '',
  });

  const hardErrors = useMemo(
    () => (parsed?.errors || []).filter((e) => e.startsWith('Missing')),
    [parsed],
  );
  const softErrors = useMemo(
    () => (parsed?.errors || []).filter((e) => !e.startsWith('Missing')),
    [parsed],
  );

  const handleFile = async (file: File) => {
    setApiError('');
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const result = parseInstitutionSetupWorkbook(buffer);
      setParsed(result);

      const missing = result.errors.filter((e) => e.startsWith('Missing'));
      if (missing.length > 0) {
        setErrorList(missing);
        setStep('error');
        return;
      }

      setStep('mapping');
    } catch (e) {
      setErrorList([e instanceof Error ? e.message : 'Failed to read Excel file']);
      setStep('error');
    }
  };

  const startProvisioning = async () => {
    if (!parsed) return;
    setStep('provisioning');
    setProgress(10);
    setProgressStatus('Validating parsed sheets...');
    setApiError('');

    try {
      setProgress(40);
      setProgressStatus('Uploading institution setup to database...');
      await applyExpressSetup(parsed.tiles, {
        fileName,
        importedAt: new Date().toISOString(),
        summary: parsed.summary,
        warnings: softErrors,
      });
      setProgress(100);
      setProgressStatus('Express setup committed successfully.');
      setTimeout(() => setStep('final_steps'), 600);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : 'Provisioning failed');
      setErrorList([e instanceof Error ? e.message : 'Provisioning failed']);
      setStep('error');
    }
  };

  const finishIntegrations = async () => {
    try {
      await updateInstitutionTile('integrationSetup', {
        sections: {
          'Payment Gateway': {
            provider: 'Razorpay',
            apiKey: integrationForm.paymentKey,
            apiSecret: integrationForm.paymentSecret,
            enabled: integrationForm.paymentKey ? 'Yes' : 'No',
          },
          'SMS Gateway': {
            provider: 'Twilio',
            apiKey: integrationForm.smsKey,
            senderId: '',
          },
          'Email Gateway': { provider: 'SMTP', host: '', apiKey: '' },
          'API Integrations': { webhookUrl: '', notes: '' },
          'Single Sign-On (SSO)': {
            provider: integrationForm.ssoSecret ? 'Google' : 'Disabled',
            clientId: '',
            clientSecret: integrationForm.ssoSecret,
          },
        },
      });
      onBack();
    } catch (e) {
      setApiError(e instanceof Error ? e.message : 'Failed to save integrations');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto">
      <div className="p-6 pb-4 border-b border-slate-200 bg-white shrink-0 flex justify-between items-center">
        <div>
          <button onClick={onBack} className="text-xs text-indigo-600 hover:underline mb-1 font-medium">
            &larr; Back to Setup Modules
          </button>
          <h1 className="text-2xl font-bold text-slate-800">Express Setup Engine</h1>
          <p className="text-sm text-slate-500 mt-1">
            Set up the institute in minutes by uploading the master Excel template
          </p>
        </div>
      </div>

      <div className="flex-1 p-6 flex flex-col items-center">
        {step === 'upload' && (
          <div className="max-w-3xl w-full space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileSpreadsheet size={32} />
              </div>
              <h2 className="text-lg font-bold text-slate-800 mb-2">Master Setup Template</h2>
              <p className="text-sm text-slate-600 max-w-lg mx-auto mb-6">
                Download the multi-tab Excel. Each Institution Setup tile has a settings sheet (and a data sheet where
                master lists are needed). Fill offline, then upload here.
              </p>
              <button
                onClick={downloadInstitutionSetupTemplate}
                className="px-5 py-2.5 bg-white border-2 border-emerald-500 text-emerald-700 font-bold rounded-lg hover:bg-emerald-50 transition-colors flex items-center gap-2 mx-auto shadow-sm"
              >
                <Download size={18} /> Download Institution_Master_Setup.xlsx
              </button>
            </div>

            <div className="bg-white p-8 rounded-xl border-2 border-dashed border-indigo-300 shadow-sm text-center relative group">
              <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                }}
              />
              <div className="w-16 h-16 bg-indigo-50 group-hover:bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
                <UploadCloud size={32} />
              </div>
              <h2 className="text-lg font-bold text-slate-800 mb-2">Upload Completed Template</h2>
              <p className="text-sm text-slate-500 mb-2">Drag and drop your .xlsx file here, or click to browse.</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex gap-3 text-amber-800 text-sm">
              <AlertCircle size={20} className="shrink-0" />
              <div>
                <p className="font-bold mb-1">How it works</p>
                <p className="text-xs">
                  Express Setup writes all 18 Institution Setup tiles to the database in one step. After that, open any
                  tile and edit individual fields anytime.
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="max-w-4xl w-full bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center shrink-0">
                <XCircle size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Validation / Import Error</h2>
                <p className="text-sm text-slate-500">Please fix the Excel file and upload again.</p>
              </div>
            </div>
            <div className="space-y-3 mb-6">
              {(errorList.length ? errorList : hardErrors).map((err, i) => (
                <div key={i} className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-lg text-sm text-rose-800">
                  {err}
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setStep('upload')}
                className="px-5 py-2.5 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-900 flex items-center gap-2"
              >
                <RefreshCw size={18} /> Re-Upload Template
              </button>
            </div>
          </div>
        )}

        {step === 'mapping' && parsed && (
          <div className="max-w-4xl w-full bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2 border-b border-slate-100 pb-4">
              <Database className="text-indigo-600" /> Data Parsing Successful
            </h2>
            <p className="text-sm text-slate-600 mb-2">
              File: <span className="font-semibold">{fileName}</span>
            </p>
            <p className="text-sm text-slate-600 mb-6">
              Review the parsed summary, then confirm provisioning to save into PostgreSQL.
            </p>

            {softErrors.length > 0 && (
              <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                <p className="font-bold mb-1">Warnings ({softErrors.length})</p>
                <ul className="list-disc pl-4 space-y-0.5 max-h-28 overflow-y-auto">
                  {softErrors.slice(0, 12).map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
              {parsed.summary.map((item) => (
                <div key={item.sheet} className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">{item.sheet}</p>
                  <p className="text-sm font-bold text-slate-800">{item.fields} fields</p>
                  <p className="text-xs text-slate-500">{item.records} records</p>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
              <button
                onClick={() => setStep('upload')}
                className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void startProvisioning()}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-2"
              >
                <Server size={18} /> Confirm & Save to Database
              </button>
            </div>
          </div>
        )}

        {step === 'provisioning' && (
          <div className="max-w-2xl w-full bg-white p-10 rounded-xl border border-slate-200 shadow-sm text-center my-auto">
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <RefreshCw size={36} className="animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Executing Express Setup...</h2>
            <p className="text-sm text-slate-500 mb-8">Saving all tiles to the backend database.</p>
            <div className="w-full bg-slate-100 rounded-full h-3 mb-3 overflow-hidden">
              <div className="bg-indigo-600 h-3 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between items-center text-xs font-bold text-slate-500">
              <span>{progressStatus}</span>
              <span>{progress}%</span>
            </div>
          </div>
        )}

        {step === 'final_steps' && (
          <div className="max-w-3xl w-full bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                <ShieldCheck size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Provisioning Complete</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Institution setup data is saved. You can refine any tile from the overview.
                </p>
              </div>
            </div>

            {apiError && <p className="text-sm text-red-600 mb-4">{apiError}</p>}

            <div className="mb-6">
              <h3 className="text-sm font-bold text-slate-800 mb-2">Optional: Secure Integrations</h3>
              <p className="text-xs text-slate-600 mb-4">
                Do not put secrets in Excel. Enter gateway keys here if needed, or skip and configure later under
                Integration Setup.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="password"
                  placeholder="Payment gateway key"
                  className="w-full border border-slate-300 rounded p-2 text-sm"
                  value={integrationForm.paymentKey}
                  onChange={(e) => setIntegrationForm((p) => ({ ...p, paymentKey: e.target.value }))}
                />
                <input
                  type="password"
                  placeholder="Payment gateway secret"
                  className="w-full border border-slate-300 rounded p-2 text-sm"
                  value={integrationForm.paymentSecret}
                  onChange={(e) => setIntegrationForm((p) => ({ ...p, paymentSecret: e.target.value }))}
                />
                <input
                  type="password"
                  placeholder="SMS gateway API key"
                  className="w-full border border-slate-300 rounded p-2 text-sm"
                  value={integrationForm.smsKey}
                  onChange={(e) => setIntegrationForm((p) => ({ ...p, smsKey: e.target.value }))}
                />
                <input
                  type="password"
                  placeholder="SSO client secret"
                  className="w-full border border-slate-300 rounded p-2 text-sm"
                  value={integrationForm.ssoSecret}
                  onChange={(e) => setIntegrationForm((p) => ({ ...p, ssoSecret: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-between items-center border-t border-slate-100 pt-6">
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <CheckCircle2 size={14} className="text-emerald-500" /> All tiles available for edit under Configure
              </span>
              <div className="flex gap-2">
                <button onClick={onBack} className="px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-bold">
                  Skip
                </button>
                <button
                  onClick={() => void finishIntegrations()}
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700"
                >
                  Save & Finish
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
