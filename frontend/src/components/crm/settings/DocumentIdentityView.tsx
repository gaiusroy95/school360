import { useCallback, useEffect, useState } from 'react';
import {
  RefreshCw, Folder, FileText, FileStack, ClipboardList, CheckSquare, Hash,
  CreditCard, ListOrdered, UserPlus, Briefcase, Braces, Settings, CheckCircle2,
} from 'lucide-react';
import {
  fetchDocumentIdentityOverview,
  syncDocumentIdentity,
  testDocumentNumber,
  type DocumentIdentityOverview,
} from '../../../lib/settingsDocumentIdentityServices';
import { AcademicLoading, AcademicPageHeader, AcademicPageShell, am } from '../AcademicManagement/AcademicManagementUi';

type TabKey =
  | 'categories' | 'types' | 'templates' | 'app-docs' | 'required' | 'numbering'
  | 'id-cards' | 'roll' | 'admission' | 'employee' | 'emp-fields' | 'parent-fields'
  | 'admission-fields' | 'field-types';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'categories', label: 'Document Categories', icon: <Folder size={14} /> },
  { key: 'types', label: 'Document Types', icon: <FileText size={14} /> },
  { key: 'templates', label: 'Document Templates', icon: <FileStack size={14} /> },
  { key: 'app-docs', label: 'Application Form Docs', icon: <ClipboardList size={14} /> },
  { key: 'required', label: 'Required Documents', icon: <CheckSquare size={14} /> },
  { key: 'numbering', label: 'Document Numbering', icon: <Hash size={14} /> },
  { key: 'id-cards', label: 'ID Card Templates', icon: <CreditCard size={14} /> },
  { key: 'roll', label: 'Roll Number Format', icon: <ListOrdered size={14} /> },
  { key: 'admission', label: 'Admission Number', icon: <UserPlus size={14} /> },
  { key: 'employee', label: 'Employee Code', icon: <Briefcase size={14} /> },
  { key: 'emp-fields', label: 'Employee Custom Fields', icon: <Braces size={14} /> },
  { key: 'parent-fields', label: 'Parent Custom Fields', icon: <Braces size={14} /> },
  { key: 'admission-fields', label: 'Admission Custom Fields', icon: <Braces size={14} /> },
  { key: 'field-types', label: 'Custom Field Types', icon: <Settings size={14} /> },
];

function Table({ rows, cols }: { rows: Array<Record<string, unknown>>; cols: { key: string; label: string }[] }) {
  if (!rows.length) return <p className="text-xs text-slate-500">No records. Sync from Institution Setup.</p>;
  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg">
      <table className="w-full text-xs">
        <thead><tr className="bg-slate-50">{cols.map((c) => <th key={c.key} className="text-left px-3 py-2 font-bold">{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-slate-100">
              {cols.map((c) => <td key={c.key} className="px-3 py-2">{String(row[c.key] ?? '—')}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DocumentIdentityView() {
  const [data, setData] = useState<DocumentIdentityOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState<TabKey>('categories');

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await fetchDocumentIdentityOverview()); } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleSync = async () => {
    const res = await syncDocumentIdentity();
    setMessage(res.message);
    void load();
  };

  if (loading && !data) return <AcademicLoading label="Loading document & identity…" />;

  const customByEntity = (entity: string) => data?.customFields.filter((f) => f.entityType === entity) ?? [];

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Settings Management › Document, Identity & Custom Fields"
        title="Document, Identity & Custom Field"
        subtitle="Document categories, types, templates, numbering, ID cards, roll/admission/employee codes, and custom profile fields"
        actions={(
          <button type="button" onClick={() => void handleSync()} className={am.btnSecondary}>
            <RefreshCw size={14} /> Sync from Setup
          </button>
        )}
      />

      <div className={am.content}>
        {message && (
          <div className="mb-4 px-4 py-2 bg-teal-50 text-teal-800 text-sm rounded-lg border border-teal-200 flex items-center gap-2">
            <CheckCircle2 size={16} />{message}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2 mb-4">
          {Object.entries(data?.stats ?? {}).map(([k, v]) => (
            <div key={k} className={`${am.card} p-2 text-center`}>
              <p className="text-[10px] text-slate-500 font-semibold capitalize">{k.replace(/([A-Z])/g, ' $1')}</p>
              <p className="text-base font-bold text-slate-800">{v}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-1 mb-4">
          {TABS.map((t) => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className={`flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium rounded-lg border ${tab === t.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {tab === 'categories' && <Table rows={data?.categories ?? []} cols={[{ key: 'categoryLabel', label: 'Category' }, { key: 'privacyLevel', label: 'Privacy' }, { key: 'encryptAtRest', label: 'Encrypted' }]} />}
        {tab === 'types' && <Table rows={data?.documentTypes ?? []} cols={[{ key: 'typeLabel', label: 'Type' }, { key: 'expiryDays', label: 'Expiry Days' }]} />}
        {tab === 'templates' && <Table rows={data?.templates ?? []} cols={[{ key: 'templateName', label: 'Template' }, { key: 'templateCode', label: 'Code' }]} />}
        {tab === 'app-docs' && <Table rows={data?.applicationDocs ?? []} cols={[{ key: 'documentName', label: 'Document' }, { key: 'mandatory', label: 'Mandatory' }, { key: 'acceptedFormats', label: 'Formats' }]} />}
        {tab === 'required' && <Table rows={data?.requiredDocs ?? []} cols={[{ key: 'documentName', label: 'Document' }, { key: 'profileType', label: 'Profile' }, { key: 'mandatory', label: 'Mandatory' }]} />}
        {tab === 'numbering' && data?.numbering && (
          <div className={`${am.card} space-y-2`}>
            <p>Prefix: <strong>{String(data.numbering.prefix)}</strong> · Next: <strong>{String(data.numbering.nextNumber)}</strong></p>
            <button type="button" className={am.btnPrimary} onClick={() => void testDocumentNumber().then((r) => setMessage(`Test number: ${r.documentNumber}`))}>Test Sequence</button>
          </div>
        )}
        {tab === 'id-cards' && <Table rows={data?.idCards ?? []} cols={[{ key: 'templateName', label: 'Template' }, { key: 'audience', label: 'Audience' }, { key: 'qrEnabled', label: 'QR' }]} />}
        {tab === 'roll' && data?.rollRule && (
          <div className={`${am.card}`}><p>Format: <strong>{String(data.rollRule.formatFormula)}</strong></p><p>Sort: <strong>{String(data.rollRule.sortLogic)}</strong></p></div>
        )}
        {tab === 'admission' && data?.admissionSeq && (
          <div className={`${am.card}`}><p>Prefix: <strong>{String(data.admissionSeq.prefix)}</strong> · Next: <strong>{String(data.admissionSeq.nextNumber)}</strong> · Locked: <strong>{data.admissionSeq.isLocked ? 'Yes' : 'No'}</strong></p></div>
        )}
        {tab === 'employee' && data?.employeeRule && (
          <div className={`${am.card}`}><p>Formula: <strong>{String(data.employeeRule.formatFormula)}</strong> · Next: <strong>{String(data.employeeRule.nextNumber)}</strong></p></div>
        )}
        {tab === 'emp-fields' && <Table rows={customByEntity('EMPLOYEE')} cols={[{ key: 'fieldLabel', label: 'Label' }, { key: 'fieldType', label: 'Type' }]} />}
        {tab === 'parent-fields' && <Table rows={customByEntity('PARENT')} cols={[{ key: 'fieldLabel', label: 'Label' }, { key: 'fieldType', label: 'Type' }]} />}
        {tab === 'admission-fields' && <Table rows={customByEntity('ADMISSION')} cols={[{ key: 'fieldLabel', label: 'Label' }, { key: 'fieldType', label: 'Type' }]} />}
        {tab === 'field-types' && <Table rows={data?.fieldTypes ?? []} cols={[{ key: 'typeCode', label: 'Code' }, { key: 'typeLabel', label: 'Label' }]} />}

        <p className="text-xs text-slate-500 mt-4">
          Configure in <strong>Institution Setup → Document Setup</strong>, <strong>ID Card & Numbering</strong>, and <strong>Custom Fields Setup</strong>.
        </p>
      </div>
    </AcademicPageShell>
  );
}
