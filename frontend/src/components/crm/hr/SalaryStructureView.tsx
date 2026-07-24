import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calculator,
  Copy,
  Eye,
  FileSpreadsheet,
  IndianRupee,
  Layers,
  Loader2,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Trash2,
  Upload,
  UserPlus,
} from 'lucide-react';
import {
  assignSalaryStructure,
  cloneSalaryStructureTemplate,
  createSalaryStructureTemplate,
  fetchSalaryStructureDetail,
  fetchSalaryStructures,
  formatInr,
  previewSalaryStructureTemplate,
  updateSalaryStructureTemplate,
  type HrSalaryStructureAssignment,
  type HrSalaryStructureTemplate,
  type SalaryStructureComponent,
  type SalaryStructureEmployeeOption,
  type SalaryStructurePreview,
} from '../../../lib/hrServices';
import {
  am,
  AcademicLoading,
  AcademicModal,
  AcademicPageHeader,
  AcademicPageShell,
  FeeTabs,
  StatusBadge,
} from '../FeeFinanceManagement/FeeFinanceUi';

const COMPONENT_TABS = ['Earnings', 'Deductions', 'Employer Contributions'] as const;
type ComponentTab = (typeof COMPONENT_TABS)[number];

const PAY_FREQUENCIES = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'DAILY', label: 'Daily' },
];

const PAY_FREQUENCIES_ASSIGN = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Bi-Weekly' },
  { value: 'DAILY', label: 'Daily' },
];

const STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'INACTIVE', label: 'Inactive' },
];

type DetailForm = {
  structureCode: string;
  name: string;
  description: string;
  payGrade: string;
  payFrequency: string;
  effectiveFrom: string;
  effectiveTo: string;
  currency: string;
  status: string;
};

const emptyComponent = (order: number): SalaryStructureComponent => ({
  id: `cmp-${Date.now()}-${order}`,
  componentName: '',
  formula: '',
  percentage: 0,
  fixedAmount: 0,
  pfApplicable: false,
  esiApplicable: false,
  gratuity: false,
  taxable: true,
  displayOrder: order,
  status: 'ACTIVE',
});

const emptyForm = (): DetailForm => ({
  structureCode: '',
  name: '',
  description: '',
  payGrade: '',
  payFrequency: 'MONTHLY',
  effectiveFrom: new Date().toISOString().slice(0, 10),
  effectiveTo: '',
  currency: 'INR',
  status: 'DRAFT',
});

function formFromTemplate(t: HrSalaryStructureTemplate): DetailForm {
  return {
    structureCode: t.structureCode,
    name: t.name,
    description: t.description,
    payGrade: t.payGrade,
    payFrequency: t.payFrequency,
    effectiveFrom: t.effectiveFrom,
    effectiveTo: t.effectiveTo ?? '',
    currency: t.currency,
    status: t.status,
  };
}

function SummaryCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-3">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-bold mt-1 tabular-nums ${accent ?? 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

export function SalaryStructureView() {
  const [templates, setTemplates] = useState<HrSalaryStructureTemplate[]>([]);
  const [assignments, setAssignments] = useState<HrSalaryStructureAssignment[]>([]);
  const [employees, setEmployees] = useState<SalaryStructureEmployeeOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [listQ, setListQ] = useState('');

  const [form, setForm] = useState<DetailForm>(emptyForm());
  const [earnings, setEarnings] = useState<SalaryStructureComponent[]>([]);
  const [deductions, setDeductions] = useState<SalaryStructureComponent[]>([]);
  const [employerContributions, setEmployerContributions] = useState<SalaryStructureComponent[]>([]);
  const [componentTab, setComponentTab] = useState<ComponentTab>('Earnings');
  const [dirty, setDirty] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<SalaryStructurePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [assignEmployeeId, setAssignEmployeeId] = useState('');
  const [assignEffectiveDate, setAssignEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [assignAnnualCtc, setAssignAnnualCtc] = useState('');
  const [assignMonthlySalary, setAssignMonthlySalary] = useState('');
  const [assignPayFrequency, setAssignPayFrequency] = useState('MONTHLY');
  const [assigning, setAssigning] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');

  const selected = useMemo(
    () => templates.find((t) => t.id === selectedId) ?? null,
    [templates, selectedId],
  );

  const filteredTemplates = useMemo(() => {
    const q = listQ.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.structureCode.toLowerCase().includes(q) ||
        t.payGrade.toLowerCase().includes(q),
    );
  }, [templates, listQ]);

  const templateAssignments = useMemo(
    () => assignments.filter((a) => a.templateId === selectedId),
    [assignments, selectedId],
  );

  const liveSummary = useMemo(() => {
    const sum = (items: SalaryStructureComponent[]) =>
      items
        .filter((c) => c.status !== 'INACTIVE')
        .reduce((s, c) => s + (c.fixedAmount > 0 ? c.fixedAmount : 0), 0);
    const totalEarnings = sum(earnings);
    const totalDeductions = sum(deductions);
    const employerContribution = sum(employerContributions);
    const ctc = totalEarnings + employerContribution;
    const netSalary = totalEarnings - totalDeductions;
    return { totalEarnings, totalDeductions, employerContribution, ctc, netSalary };
  }, [earnings, deductions, employerContributions]);

  const currentComponents = useMemo(() => {
    if (componentTab === 'Earnings') return earnings;
    if (componentTab === 'Deductions') return deductions;
    return employerContributions;
  }, [componentTab, earnings, deductions, employerContributions]);

  const setCurrentComponents = useCallback(
    (items: SalaryStructureComponent[]) => {
      setDirty(true);
      if (componentTab === 'Earnings') setEarnings(items);
      else if (componentTab === 'Deductions') setDeductions(items);
      else setEmployerContributions(items);
    },
    [componentTab],
  );

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchSalaryStructures({ seed });
      setTemplates(data.templates);
      setAssignments(data.assignments);
      setEmployees(data.employees);
      if (!selectedId && data.templates.length > 0) {
        setSelectedId(data.templates[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load salary structures');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  const loadDetail = useCallback(async (id: string) => {
    try {
      const data = await fetchSalaryStructureDetail(id);
      const t = data.template;
      setForm(formFromTemplate(t));
      setEarnings(t.earnings);
      setDeductions(t.deductions);
      setEmployerContributions(t.employerContributions);
      setAssignments((prev) => {
        const rest = prev.filter((a) => a.templateId !== id);
        return [...rest, ...data.assignments];
      });
      setAssignAnnualCtc(String(Math.round(t.ctc * 12)));
      setAssignMonthlySalary(String(t.netSalary));
      setAssignPayFrequency(t.payFrequency);
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load template');
    }
  }, []);

  useEffect(() => {
    void load(true);
  }, []);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
    else {
      setForm(emptyForm());
      setEarnings([]);
      setDeductions([]);
      setEmployerContributions([]);
      setDirty(false);
    }
  }, [selectedId, loadDetail]);

  const handleNew = () => {
    setSelectedId(null);
    setForm(emptyForm());
    setEarnings([emptyComponent(1)]);
    setDeductions([]);
    setEmployerContributions([]);
    setDirty(true);
    setMessage('');
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Structure name is required');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    const body = {
      ...form,
      effectiveTo: form.effectiveTo || null,
      earnings,
      deductions,
      employerContributions,
    };
    try {
      if (selectedId) {
        const res = await updateSalaryStructureTemplate(selectedId, body);
        setTemplates((prev) => prev.map((t) => (t.id === selectedId ? res.template : t)));
        setForm(formFromTemplate(res.template));
        setEarnings(res.template.earnings);
        setDeductions(res.template.deductions);
        setEmployerContributions(res.template.employerContributions);
        setMessage('Salary structure saved');
      } else {
        const res = await createSalaryStructureTemplate(body);
        setTemplates((prev) => [res.template, ...prev]);
        setSelectedId(res.template.id);
        setMessage('Salary structure created');
      }
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleClone = async () => {
    if (!selectedId) return;
    setSaving(true);
    setError('');
    try {
      const res = await cloneSalaryStructureTemplate(selectedId);
      setTemplates((prev) => [res.template, ...prev]);
      setSelectedId(res.template.id);
      setMessage('Structure cloned successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Clone failed');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    setPreviewLoading(true);
    setPreviewOpen(true);
    try {
      const res = await previewSalaryStructureTemplate({ earnings, deductions, employerContributions });
      setPreview(res.preview);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed');
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleAddComponent = () => {
    const order = currentComponents.length + 1;
    setCurrentComponents([...currentComponents, emptyComponent(order)]);
  };

  const handleUpdateComponent = (index: number, patch: Partial<SalaryStructureComponent>) => {
    const next = currentComponents.map((c, i) => (i === index ? { ...c, ...patch } : c));
    setCurrentComponents(next);
  };

  const handleRemoveComponent = (index: number) => {
    setCurrentComponents(currentComponents.filter((_, i) => i !== index));
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(importText) as SalaryStructureComponent[];
      if (!Array.isArray(parsed)) throw new Error('Expected JSON array');
      const normalized = parsed.map((c, i) => ({
        ...emptyComponent(i + 1),
        ...c,
        id: c.id || `cmp-import-${i}`,
        displayOrder: c.displayOrder || i + 1,
      }));
      setCurrentComponents([...currentComponents, ...normalized]);
      setImportOpen(false);
      setImportText('');
      setMessage(`Imported ${normalized.length} component(s)`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON');
    }
  };

  const handleAssign = async () => {
    if (!selectedId || !assignEmployeeId) {
      setError('Select an employee to assign');
      return;
    }
    setAssigning(true);
    setError('');
    try {
      const res = await assignSalaryStructure({
        templateId: selectedId,
        employeeId: assignEmployeeId,
        effectiveDate: assignEffectiveDate,
        annualCtc: Number(assignAnnualCtc) || undefined,
        monthlySalary: Number(assignMonthlySalary) || undefined,
        payFrequency: assignPayFrequency,
        syncPayrollStructure: true,
      });
      setAssignments((prev) => [res.assignment, ...prev.filter((a) => a.id !== res.assignment.id)]);
      setMessage(`Assigned to ${res.assignment.employeeName}`);
      setAssignEmployeeId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assignment failed');
    } finally {
      setAssigning(false);
    }
  };

  if (loading && templates.length === 0) {
    return (
      <AcademicPageShell>
        <AcademicLoading label="Loading salary structures…" />
      </AcademicPageShell>
    );
  }

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="HR & Payroll Management › Salary Structure"
        title="Salary Structure"
        subtitle="Create reusable salary templates with earnings, deductions, and employer contributions"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void load()} className={am.btnSecondary}>
              <RefreshCcw className="w-3.5 h-3.5" />
              Refresh
            </button>
            <button type="button" onClick={handleNew} className={am.btnSecondary}>
              <Plus className="w-3.5 h-3.5" />
              New Structure
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || (!dirty && Boolean(selectedId))}
              className={am.btnPrimary}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save
            </button>
          </div>
        }
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}
      {message && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-4">
        {/* Template list */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                value={listQ}
                onChange={(e) => setListQ(e.target.value)}
                placeholder="Search structures…"
                className={`${am.input} pl-8 text-xs`}
              />
            </div>
          </div>
          <div className="max-h-[calc(100vh-220px)] overflow-y-auto divide-y divide-slate-50">
            {filteredTemplates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedId(t.id)}
                className={`w-full text-left px-3 py-3 hover:bg-slate-50 transition-colors ${
                  selectedId === t.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{t.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{t.structureCode}</p>
                    <p className="text-[10px] text-slate-400">{t.payGrade || '—'}</p>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
                <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500">
                  <span>CTC {formatInr(t.ctc)}/mo</span>
                  <span>{t.assignmentCount} assigned</span>
                </div>
              </button>
            ))}
            {filteredTemplates.length === 0 && (
              <p className="p-4 text-xs text-slate-400 text-center">No structures found</p>
            )}
          </div>
        </div>

        {/* Main detail */}
        <div className="space-y-4">
          {/* Structure details */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              Salary Structure Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-600">Structure Code</span>
                <input
                  value={form.structureCode}
                  onChange={(e) => {
                    setForm({ ...form, structureCode: e.target.value });
                    setDirty(true);
                  }}
                  placeholder="Auto-generated if empty"
                  className={am.input}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-600">Structure Name *</span>
                <input
                  value={form.name}
                  onChange={(e) => {
                    setForm({ ...form, name: e.target.value });
                    setDirty(true);
                  }}
                  className={am.input}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-600">Pay Grade</span>
                <input
                  value={form.payGrade}
                  onChange={(e) => {
                    setForm({ ...form, payGrade: e.target.value });
                    setDirty(true);
                  }}
                  placeholder="e.g. Grade T1"
                  className={am.input}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-600">Monthly / Daily</span>
                <select
                  value={form.payFrequency}
                  onChange={(e) => {
                    setForm({ ...form, payFrequency: e.target.value });
                    setDirty(true);
                  }}
                  className={am.input}
                >
                  {PAY_FREQUENCIES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-600">Effective From</span>
                <input
                  type="date"
                  value={form.effectiveFrom}
                  onChange={(e) => {
                    setForm({ ...form, effectiveFrom: e.target.value });
                    setDirty(true);
                  }}
                  className={am.input}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-600">Effective To</span>
                <input
                  type="date"
                  value={form.effectiveTo}
                  onChange={(e) => {
                    setForm({ ...form, effectiveTo: e.target.value });
                    setDirty(true);
                  }}
                  className={am.input}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-600">Currency</span>
                <input
                  value={form.currency}
                  onChange={(e) => {
                    setForm({ ...form, currency: e.target.value });
                    setDirty(true);
                  }}
                  className={am.input}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-600">Status</span>
                <select
                  value={form.status}
                  onChange={(e) => {
                    setForm({ ...form, status: e.target.value });
                    setDirty(true);
                  }}
                  className={am.input}
                >
                  {STATUSES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={`block space-y-1 sm:col-span-2 lg:col-span-3`}>
                <span className="text-xs font-semibold text-slate-600">Description</span>
                <textarea
                  value={form.description}
                  onChange={(e) => {
                    setForm({ ...form, description: e.target.value });
                    setDirty(true);
                  }}
                  rows={2}
                  className={am.input}
                />
              </label>
            </div>
          </div>

          {/* Components */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 pt-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Components</h3>
              <div className="flex flex-wrap gap-2 pb-2">
                <button type="button" onClick={handleAddComponent} className={am.btnSecondary}>
                  <Plus className="w-3.5 h-3.5" />
                  Add Component
                </button>
                <button type="button" onClick={() => setImportOpen(true)} className={am.btnSecondary}>
                  <Upload className="w-3.5 h-3.5" />
                  Import Components
                </button>
                <button type="button" onClick={() => void handleClone()} disabled={!selectedId || saving} className={am.btnSecondary}>
                  <Copy className="w-3.5 h-3.5" />
                  Clone
                </button>
                <button type="button" onClick={() => void handlePreview()} className={am.btnSecondary}>
                  <Eye className="w-3.5 h-3.5" />
                  Preview Salary
                </button>
              </div>
            </div>
            <div className="px-4 pt-2">
              <FeeTabs tabs={[...COMPONENT_TABS]} active={componentTab} onChange={(t) => setComponentTab(t as ComponentTab)} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase text-[10px]">
                    <th className="text-left px-3 py-2 font-bold">Component Name</th>
                    <th className="text-left px-3 py-2 font-bold">Formula</th>
                    <th className="text-right px-3 py-2 font-bold">%</th>
                    <th className="text-right px-3 py-2 font-bold">Fixed Amt</th>
                    <th className="text-center px-2 py-2 font-bold">PF</th>
                    <th className="text-center px-2 py-2 font-bold">ESI</th>
                    <th className="text-center px-2 py-2 font-bold">Gratuity</th>
                    <th className="text-center px-2 py-2 font-bold">Taxable</th>
                    <th className="text-center px-2 py-2 font-bold">Order</th>
                    <th className="text-left px-2 py-2 font-bold">Status</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {currentComponents.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="px-2 py-1.5">
                        <input
                          value={row.componentName}
                          onChange={(e) => handleUpdateComponent(idx, { componentName: e.target.value })}
                          className={`${am.input} min-w-[120px]`}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          value={row.formula}
                          onChange={(e) => handleUpdateComponent(idx, { formula: e.target.value })}
                          placeholder="% of Basic"
                          className={`${am.input} min-w-[100px]`}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          value={row.percentage || ''}
                          onChange={(e) => handleUpdateComponent(idx, { percentage: Number(e.target.value) || 0 })}
                          className={`${am.input} w-16 text-right`}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          value={row.fixedAmount || ''}
                          onChange={(e) => handleUpdateComponent(idx, { fixedAmount: Number(e.target.value) || 0 })}
                          className={`${am.input} w-24 text-right`}
                        />
                      </td>
                      {(['pfApplicable', 'esiApplicable', 'gratuity', 'taxable'] as const).map((key) => (
                        <td key={key} className="px-2 py-1.5 text-center">
                          <input
                            type="checkbox"
                            checked={row[key]}
                            onChange={(e) => handleUpdateComponent(idx, { [key]: e.target.checked })}
                            className="rounded border-slate-300"
                          />
                        </td>
                      ))}
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          value={row.displayOrder}
                          onChange={(e) => handleUpdateComponent(idx, { displayOrder: Number(e.target.value) || 1 })}
                          className={`${am.input} w-14 text-center`}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          value={row.status}
                          onChange={(e) => handleUpdateComponent(idx, { status: e.target.value })}
                          className={`${am.input} w-24`}
                        >
                          <option value="ACTIVE">Active</option>
                          <option value="INACTIVE">Inactive</option>
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <button
                          type="button"
                          onClick={() => handleRemoveComponent(idx)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {currentComponents.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-4 py-8 text-center text-slate-400">
                        No components — click &quot;Add Component&quot; to start
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-blue-600" />
              Summary
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <SummaryCard label="Total Earnings" value={formatInr(selected?.totalEarnings ?? liveSummary.totalEarnings)} />
              <SummaryCard
                label="Total Deduction"
                value={formatInr(selected?.totalDeductions ?? liveSummary.totalDeductions)}
                accent="text-red-600"
              />
              <SummaryCard
                label="Employer Contribution"
                value={formatInr(selected?.employerContribution ?? liveSummary.employerContribution)}
                accent="text-amber-600"
              />
              <SummaryCard label="CTC" value={formatInr(selected?.ctc ?? liveSummary.ctc)} accent="text-blue-600" />
              <SummaryCard label="Net Salary" value={formatInr(selected?.netSalary ?? liveSummary.netSalary)} accent="text-green-600" />
            </div>
          </div>

          {/* Mapping */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-blue-600" />
              Salary Structure Mapping
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-600">Assign Salary Structure</span>
                <select
                  value={assignEmployeeId}
                  onChange={(e) => setAssignEmployeeId(e.target.value)}
                  disabled={!selectedId}
                  className={am.input}
                >
                  <option value="">Select employee…</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-600">Effective Date</span>
                <input
                  type="date"
                  value={assignEffectiveDate}
                  onChange={(e) => setAssignEffectiveDate(e.target.value)}
                  className={am.input}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-600">Annual CTC</span>
                <input
                  type="number"
                  value={assignAnnualCtc}
                  onChange={(e) => setAssignAnnualCtc(e.target.value)}
                  className={am.input}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-600">Monthly Salary</span>
                <input
                  type="number"
                  value={assignMonthlySalary}
                  onChange={(e) => setAssignMonthlySalary(e.target.value)}
                  className={am.input}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-600">Pay Frequency</span>
                <select
                  value={assignPayFrequency}
                  onChange={(e) => setAssignPayFrequency(e.target.value)}
                  className={am.input}
                >
                  {PAY_FREQUENCIES_ASSIGN.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button
              type="button"
              onClick={() => void handleAssign()}
              disabled={!selectedId || !assignEmployeeId || assigning}
              className={am.btnPrimary}
            >
              {assigning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <IndianRupee className="w-3.5 h-3.5" />}
              Assign Structure
            </button>

            {templateAssignments.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase text-[10px]">
                      <th className="text-left px-3 py-2 font-bold">Employee</th>
                      <th className="text-left px-3 py-2 font-bold">Department</th>
                      <th className="text-left px-3 py-2 font-bold">Effective</th>
                      <th className="text-right px-3 py-2 font-bold">Annual CTC</th>
                      <th className="text-right px-3 py-2 font-bold">Monthly</th>
                      <th className="text-left px-3 py-2 font-bold">Frequency</th>
                      <th className="text-left px-3 py-2 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {templateAssignments.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2">
                          <p className="font-semibold text-slate-800">{a.employeeName}</p>
                          <p className="text-[10px] text-slate-400">{a.employeeCode}</p>
                        </td>
                        <td className="px-3 py-2 text-slate-600">{a.department}</td>
                        <td className="px-3 py-2 text-slate-600">{a.effectiveDate}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatInr(a.annualCtc)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatInr(a.monthlySalary)}</td>
                        <td className="px-3 py-2 text-slate-600">{a.payFrequency}</td>
                        <td className="px-3 py-2">
                          <StatusBadge status={a.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview modal */}
      <AcademicModal open={previewOpen} onClose={() => setPreviewOpen(false)} title="Preview Salary" large>
        {previewLoading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : preview ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <SummaryCard label="Earnings" value={formatInr(preview.totalEarnings)} />
              <SummaryCard label="Deductions" value={formatInr(preview.totalDeductions)} accent="text-red-600" />
              <SummaryCard label="Employer" value={formatInr(preview.employerContribution)} accent="text-amber-600" />
              <SummaryCard label="CTC" value={formatInr(preview.ctc)} accent="text-blue-600" />
              <SummaryCard label="Net" value={formatInr(preview.netSalary)} accent="text-green-600" />
            </div>
            {(['earnings', 'deductions', 'employerContributions'] as const).map((key) => {
              const rows = preview.preview[key];
              const title = key === 'employerContributions' ? 'Employer Contributions' : key.charAt(0).toUpperCase() + key.slice(1);
              if (!rows.length) return null;
              return (
                <div key={key}>
                  <h4 className="text-xs font-bold text-slate-700 mb-2">{title}</h4>
                  <table className="w-full text-xs border border-slate-100 rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="text-left px-3 py-1.5">Component</th>
                        <th className="text-right px-3 py-1.5">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} className="border-t border-slate-50">
                          <td className="px-3 py-1.5">{r.componentName}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{formatInr(r.amount ?? r.fixedAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        ) : null}
      </AcademicModal>

      {/* Import modal */}
      <AcademicModal open={importOpen} onClose={() => setImportOpen(false)} title="Import Components" large>
        <p className="text-xs text-slate-500 mb-2">
          Paste a JSON array of components. They will be added to the current <strong>{componentTab}</strong> tab.
        </p>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          rows={8}
          placeholder='[{"componentName":"Bonus","fixedAmount":5000,"displayOrder":1}]'
          className={`${am.input} font-mono text-xs`}
        />
        <div className="flex justify-end gap-2 mt-3">
          <button type="button" onClick={() => setImportOpen(false)} className={am.btnSecondary}>
            Cancel
          </button>
          <button type="button" onClick={handleImport} className={am.btnPrimary}>
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Import
          </button>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
