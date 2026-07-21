import { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { sendTestNotification } from '../../../lib/institutionApi';
import type { SetupField } from '../../../lib/institutionSetupSchema';
import { DEFAULT_RECIPIENT_ROLES } from '../../../lib/notificationTriggerEvents';
import { SetupFieldInput } from './SetupFieldInput';

type Props = {
  fields: SetupField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
};

export function NotificationPreferencesView({ fields, values, onChange }: Props) {
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const configFields = fields.filter((f) => f.key !== 'testRecipient' && f.key !== 'testMedium');
  const testRecipient = values.testRecipient || '';
  const testMedium = values.testMedium || 'SMS';

  const handleTest = async () => {
    if (!testRecipient.trim()) {
      setTestError('Enter a phone number or email address to test.');
      setTestMsg(null);
      return;
    }
    setTesting(true);
    setTestError(null);
    setTestMsg(null);
    try {
      const res = await sendTestNotification({
        recipient: testRecipient.trim(),
        medium: testMedium,
      });
      setTestMsg(res.message);
    } catch (err) {
      setTestError(err instanceof Error ? err.message : 'Test message failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
        <h2 className="text-base font-bold text-slate-800 mb-1">Notification Preferences</h2>
        <p className="text-xs text-slate-500 mb-4">
          Default recipient roles are pre-selected. Save configuration after making changes.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {configFields.map((field) => {
            const value =
              values[field.key] ||
              (field.key === 'recipientRoles' ? DEFAULT_RECIPIENT_ROLES : field.defaultValue || '');
            return (
              <div
                key={field.key}
                className={
                  field.type === 'textarea' ||
                  field.type === 'multiselect' ||
                  field.type === 'eventMultiselect'
                    ? 'md:col-span-2 space-y-1.5'
                    : 'space-y-1.5'
                }
              >
                <label className="block text-xs font-bold text-slate-700">
                  {field.label}
                  {field.required ? <span className="text-red-500"> *</span> : null}
                </label>
                <SetupFieldInput
                  field={field}
                  value={value}
                  onChange={(v) => onChange(field.key, v)}
                />
                {field.help && <p className="text-[10px] text-slate-400">{field.help}</p>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white border border-purple-200 rounded-xl shadow-sm p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-1">Test Notification</h3>
        <p className="text-xs text-slate-500 mb-4">
          Send a test message to verify your notification setup. Enter a mobile number or email below.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Test Recipient (Phone / Email)
            </label>
            <input
              type="text"
              value={testRecipient}
              onChange={(e) => onChange('testRecipient', e.target.value)}
              placeholder="+91 9876543210 or parent@email.com"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">Test Medium</label>
            <select
              value={testMedium}
              onChange={(e) => onChange('testMedium', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
            >
              {['WhatsApp', 'SMS', 'Email', 'Push', 'Voice'].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void handleTest()}
            disabled={testing}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white rounded-lg text-sm font-semibold flex items-center gap-2"
          >
            {testing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {testing ? 'Sending…' : 'Send Test Message'}
          </button>
          <p className="text-[10px] text-slate-400">
            Test uses saved templates when available, or a default sample message.
          </p>
        </div>
        {testMsg && (
          <p className="mt-3 text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
            {testMsg}
          </p>
        )}
        {testError && (
          <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {testError}
          </p>
        )}
      </div>
    </div>
  );
}
