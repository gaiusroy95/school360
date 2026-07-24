import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calculator,
  FolderOpen,
  Layers,
  Link2,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  createSalaryComponent,
  createSalaryComponentGroup,
  createSalaryComponentMapping,
  deleteSalaryComponent,
  deleteSalaryComponentGroup,
  deleteSalaryComponentMapping,
  fetchAllowancesDeductions,
  fetchSalaryComponentDetail,
  formatInr,
  previewComponentFormula,
  updateSalaryComponent,
  updateSalaryComponentGroup,
  type AllowancesDeductionsDashboard,
  type HrSalaryComponentGroup,
  type HrSalaryComponentHistoryRow,
  type HrSalaryComponentMapping,
  type HrSalaryComponentRow,
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

const MAIN_TABS = ['Earnings', 'Deductions', 'Employer Contributions', 'Groups', 'Mapping', 'History'] as const;
type MainTab = (typeof MAIN_TABS)[number];

const TAB_TO_TYPE: Record<string, string> = {
  Earnings: 'EARNING',
  Deductions: 'DEDUCTION',
  'Employer Contributions': 'EMPLOYER_CONTRIBUTION',
};

const FORM_TABS = ['General', 'Advanced', 'Formula Builder', 'Audit History'] as const;
type FormTab = (typeof FORM_TABS)[number];

const TAXABILITY_OPTIONS = [
  { value: '', label: 'All Taxability' },
  { value: 'TAXABLE', label: 'Taxable' },
  { value: 'PARTIALLY_TAXABLE', label: 'Partially Taxable' },
  { value: 'NON_TAXABLE', label: 'Non-Taxable' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'INACTIVE', label: 'Inactive' },
];

type ComponentForm = {
  code: string;
  name: string;
  componentType: string;
  groupId: string;
  calculationType: string;
  formula: string;
  percentage: string;
  fixedAmount: string;
  taxable: boolean;
  taxability: string;
  pfApplicable: boolean;
  esiApplicable: boolean;
  gratuity: boolean;
  displayOrder: string;
  status: string;
  description: string;
  minAmount: string;
  maxAmount: string;
  roundTo: string;
  includeInGross: boolean;
  includeInNet: boolean;
  proRata: boolean;
  attendanceMultiplier: string;
  shiftMultiplier: string;
  performanceWeight: string;
  advancedRemarks: string;
};

const emptyForm = (componentType = 'EARNING'): ComponentForm => ({
  code: '',
  name: '',
  componentType,
  groupId: '',
  calculationType: 'FIXED',
  formula: '',
  percentage: '',
  fixedAmount: '',
  taxable: true,
  taxability: 'TAXABLE',
  pfApplicable: false,
  esiApplicable: false,
  gratuity: false,
  displayOrder: '1',
  status: 'ACTIVE',
  description: '',
  minAmount: '',
  maxAmount: '',
  roundTo: '',
  includeInGross: true,
  includeInNet: true,
  proRata: false,
  attendanceMultiplier: '1',
  shiftMultiplier: '1',
  performanceWeight: '1',
  advancedRemarks: '',
});

function formFromComponent(c: HrSalaryComponentRow): ComponentForm {
  const adv = c.advancedSettings as Record<string, unknown>;
  return {
    code: c.code,
    name: c.name,
    componentType: c.componentType,
    groupId: c.groupId ?? '',
    calculationType: c.calculationType,
    formula: c.formula,
    percentage: String(c.percentage || ''),
    fixedAmount: String(c.fixedAmount || ''),
    taxable: c.taxable,
    taxability: c.taxability,
    pfApplicable: c.pfApplicable,
    esiApplicable: c.esiApplicable,
    gratuity: c.gratuity,
    displayOrder: String(c.displayOrder),
    status: c.status,
    description: c.description,
    minAmount: adv.minAmount != null ? String(adv.minAmount) : '',
    maxAmount: adv.maxAmount != null ? String(adv.maxAmount) : '',
    roundTo: adv.roundTo != null ? String(adv.roundTo) : '',
    includeInGross: adv.includeInGross !== false,
    includeInNet: adv.includeInNet !== false,
    proRata: Boolean(adv.proRata),
    attendanceMultiplier: adv.attendanceMultiplier != null ? String(adv.attendanceMultiplier) : '1',
    shiftMultiplier: adv.shiftMultiplier != null ? String(adv.shiftMultiplier) : '1',
    performanceWeight: adv.performanceWeight != null ? String(adv.performanceWeight) : '1',
    advancedRemarks: typeof adv.remarks === 'string' ? adv.remarks : '',
  };
}

function BoolCell({ value }: { value: boolean }) {
  return (
    <span className={`text-[10px] font-bold ${value ? 'text-green-600' : 'text-slate-300'}`}>
      {value ? '✓' : '—'}
    </span>
  );
}

function KpiCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase">{label}</p>
        <p className="text-xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

export function AllowancesDeductionsView() {
  const [data, setData] = useState<AllowancesDeductionsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [activeTab, setActiveTab] = useState<MainTab>('Earnings');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterCalcType, setFilterCalcType] = useState('');
  const [filterTaxability, setFilterTaxability] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterQ, setFilterQ] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [formTab, setFormTab] = useState<FormTab>('General');
  const [editing, setEditing] = useState<HrSalaryComponentRow | null>(null);
  const [form, setForm] = useState<ComponentForm>(emptyForm());
  const [auditHistory, setAuditHistory] = useState<HrSalaryComponentHistoryRow[]>([]);

  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupForm, setGroupForm] = useState({ code: '', name: '', description: '', status: 'ACTIVE', displayOrder: '0' });
  const [editingGroup, setEditingGroup] = useState<HrSalaryComponentGroup | null>(null);

  const [mappingForm, setMappingForm] = useState({
    componentId: '',
    templateId: '',
    payGrade: '',
    effectiveFrom: new Date().toISOString().slice(0, 10),
    priority: '1',
  });

  const [formulaPreview, setFormulaPreview] = useState<{ amount: number; explanation: string } | null>(null);
  const [formulaTest, setFormulaTest] = useState({ basicSalary: '25000', grossSalary: '45000', ctc: '55000', attendanceDays: '26', workingDays: '30' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const componentType = TAB_TO_TYPE[activeTab];
      const res = await fetchAllowancesDeductions({
        componentType: ['Earnings', 'Deductions', 'Employer Contributions'].includes(activeTab) ? componentType : undefined,
        groupId: filterGroup || undefined,
        calculationType: filterCalcType || undefined,
        taxability: filterTaxability || undefined,
        status: filterStatus || undefined,
        q: filterQ.trim() || undefined,
        seed: true,
      });
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [activeTab, filterGroup, filterCalcType, filterTaxability, filterStatus, filterQ]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredComponents = useMemo(() => {
    if (!data) return [];
    if (!['Earnings', 'Deductions', 'Employer Contributions'].includes(activeTab)) return data.components;
    const type = TAB_TO_TYPE[activeTab];
    return data.components.filter((c) => c.componentType === type);
  }, [data, activeTab]);

  const openCreate = () => {
    const type = TAB_TO_TYPE[activeTab] ?? 'EARNING';
    setEditing(null);
    setForm(emptyForm(type));
    setAuditHistory([]);
    setFormTab('General');
    setFormulaPreview(null);
    setModalOpen(true);
  };

  const openEdit = async (row: HrSalaryComponentRow) => {
    setEditing(row);
    setForm(formFromComponent(row));
    setFormTab('General');
    setFormulaPreview(null);
    setModalOpen(true);
    try {
      const detail = await fetchSalaryComponentDetail(row.id);
      setAuditHistory(detail.history);
    } catch {
      setAuditHistory([]);
    }
  };

  const buildPayload = () => ({
    code: form.code.trim() || undefined,
    name: form.name.trim(),
    componentType: form.componentType,
    groupId: form.groupId || null,
    calculationType: form.calculationType,
    formula: form.formula,
    percentage: Number(form.percentage) || 0,
    fixedAmount: Number(form.fixedAmount) || 0,
    taxable: form.taxable,
    taxability: form.taxability,
    pfApplicable: form.pfApplicable,
    esiApplicable: form.esiApplicable,
    gratuity: form.gratuity,
    displayOrder: Number(form.displayOrder) || 1,
    status: form.status,
    description: form.description,
    advancedSettings: {
      minAmount: form.minAmount ? Number(form.minAmount) : undefined,
      maxAmount: form.maxAmount ? Number(form.maxAmount) : undefined,
      roundTo: form.roundTo ? Number(form.roundTo) : undefined,
      includeInGross: form.includeInGross,
      includeInNet: form.includeInNet,
      proRata: form.proRata,
      attendanceMultiplier: Number(form.attendanceMultiplier) || 1,
      shiftMultiplier: Number(form.shiftMultiplier) || 1,
      performanceWeight: Number(form.performanceWeight) || 1,
      remarks: form.advancedRemarks,
    },
  });

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Component name is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = buildPayload();
      if (editing) {
        const res = await updateSalaryComponent(editing.id, payload);
        setData((prev) =>
          prev
            ? { ...prev, components: prev.components.map((c) => (c.id === editing.id ? res.component : c)) }
            : prev,
        );
        setMessage('Component updated');
      } else {
        const res = await createSalaryComponent(payload);
        setData((prev) => (prev ? { ...prev, components: [res.component, ...prev.components] } : prev));
        setMessage('Component created');
      }
      setModalOpen(false);
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: HrSalaryComponentRow) => {
    if (!confirm(`Delete component "${row.name}"?`)) return;
    try {
      await deleteSalaryComponent(row.id);
      setMessage('Component deleted');
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handlePreviewFormula = async () => {
    try {
      const res = await previewComponentFormula({
        calculationType: form.calculationType,
        percentage: Number(form.percentage) || 0,
        fixedAmount: Number(form.fixedAmount) || 0,
        formula: form.formula,
        advancedSettings: buildPayload().advancedSettings,
        basicSalary: Number(formulaTest.basicSalary) || 25000,
        grossSalary: Number(formulaTest.grossSalary) || 45000,
        ctc: Number(formulaTest.ctc) || 55000,
        attendanceDays: Number(formulaTest.attendanceDays) || 26,
        workingDays: Number(formulaTest.workingDays) || 30,
      });
      setFormulaPreview(res.preview);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed');
    }
  };

  const handleSaveGroup = async () => {
    if (!groupForm.name.trim()) return;
    setSaving(true);
    try {
      if (editingGroup) {
        await updateSalaryComponentGroup(editingGroup.id, {
          ...groupForm,
          displayOrder: Number(groupForm.displayOrder) || 0,
        });
        setMessage('Group updated');
      } else {
        await createSalaryComponentGroup({
          ...groupForm,
          displayOrder: Number(groupForm.displayOrder) || 0,
        });
        setMessage('Group created');
      }
      setGroupModalOpen(false);
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Group save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async (g: HrSalaryComponentGroup) => {
    if (!confirm(`Delete group "${g.name}"?`)) return;
    try {
      await deleteSalaryComponentGroup(g.id);
      setMessage('Group deleted');
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleCreateMapping = async () => {
    if (!mappingForm.componentId) {
      setError('Select a component');
      return;
    }
    setSaving(true);
    try {
      await createSalaryComponentMapping({
        componentId: mappingForm.componentId,
        templateId: mappingForm.templateId || null,
        payGrade: mappingForm.payGrade,
        effectiveFrom: mappingForm.effectiveFrom,
        priority: Number(mappingForm.priority) || 1,
      });
      setMessage('Mapping created');
      setMappingForm({ componentId: '', templateId: '', payGrade: '', effectiveFrom: mappingForm.effectiveFrom, priority: '1' });
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mapping failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMapping = async (m: HrSalaryComponentMapping) => {
    if (!confirm('Remove this mapping?')) return;
    try {
      await deleteSalaryComponentMapping(m.id);
      setMessage('Mapping removed');
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  if (loading && !data) {
    return (
      <AcademicPageShell>
        <AcademicLoading label="Loading allowances & deductions…" />
      </AcademicPageShell>
    );
  }

  const summary = data?.summary;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="HR & Payroll Management › Allowances & Deductions"
        title="Allowances & Deductions"
        subtitle="Manage all salary components — earnings, deductions, employer contributions, groups and mappings"
        actions={
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void load()} className={am.btnSecondary}>
              <RefreshCcw className="w-3.5 h-3.5" />
              Refresh
            </button>
            {['Earnings', 'Deductions', 'Employer Contributions'].includes(activeTab) && (
              <button type="button" onClick={openCreate} className={am.btnPrimary}>
                <Plus className="w-3.5 h-3.5" />
                Add Component
              </button>
            )}
            {activeTab === 'Groups' && (
              <button
                type="button"
                onClick={() => {
                  setEditingGroup(null);
                  setGroupForm({ code: '', name: '', description: '', status: 'ACTIVE', displayOrder: '0' });
                  setGroupModalOpen(true);
                }}
                className={am.btnPrimary}
              >
                <Plus className="w-3.5 h-3.5" />
                Add Group
              </button>
            )}
          </div>
        }
      />

      {error && <div className="mx-4 md:mx-6 mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
      {message && <div className="mx-4 md:mx-6 mb-3 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">{message}</div>}

      <div className={am.content}>
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Earnings" value={String(summary.activeEarnings)} icon={<TrendingUp className="w-5 h-5 text-green-600" />} color="bg-green-50" />
            <KpiCard label="Deductions" value={String(summary.activeDeductions)} icon={<Wallet className="w-5 h-5 text-red-600" />} color="bg-red-50" />
            <KpiCard label="Employer" value={String(summary.activeEmployer)} icon={<Layers className="w-5 h-5 text-amber-600" />} color="bg-amber-50" />
            <KpiCard label="Groups" value={String(summary.totalGroups)} icon={<FolderOpen className="w-5 h-5 text-blue-600" />} color="bg-blue-50" />
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 pt-3 border-b border-slate-100">
            <FeeTabs tabs={[...MAIN_TABS]} active={activeTab} onChange={(t) => setActiveTab(t as MainTab)} />
          </div>

          {['Earnings', 'Deductions', 'Employer Contributions'].includes(activeTab) && (
            <>
              <div className={`${am.filterBar} m-3`}>
                <select value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)} className={am.select}>
                  <option value="">All Groups</option>
                  {data?.groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                <select value={filterCalcType} onChange={(e) => setFilterCalcType(e.target.value)} className={am.select}>
                  <option value="">All Calculation Types</option>
                  {data?.calculationTypes.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <select value={filterTaxability} onChange={(e) => setFilterTaxability(e.target.value)} className={am.select}>
                  {TAXABILITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={am.select}>
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <div className="relative flex-1 min-w-[160px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    value={filterQ}
                    onChange={(e) => setFilterQ(e.target.value)}
                    placeholder="Search code, name, formula…"
                    className={`${am.input} pl-8 text-xs`}
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase text-[10px]">
                      <th className="text-left px-4 py-2 font-bold">Code</th>
                      <th className="text-left px-4 py-2 font-bold">Name</th>
                      <th className="text-left px-4 py-2 font-bold">Component Group</th>
                      <th className="text-left px-4 py-2 font-bold">Formula</th>
                      <th className="text-center px-2 py-2 font-bold">Taxable</th>
                      <th className="text-center px-2 py-2 font-bold">PF</th>
                      <th className="text-center px-2 py-2 font-bold">ESI</th>
                      <th className="text-center px-2 py-2 font-bold">Gratuity</th>
                      <th className="text-left px-3 py-2 font-bold">Status</th>
                      <th className="px-3 py-2 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredComponents.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-2.5 font-mono text-slate-600">{row.code}</td>
                        <td className="px-4 py-2.5">
                          <p className="font-semibold text-slate-800">{row.name}</p>
                          <p className="text-[10px] text-slate-400">{row.calculationTypeLabel}</p>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">{row.groupName || '—'}</td>
                        <td className="px-4 py-2.5 text-slate-600 max-w-[180px] truncate" title={row.formulaDisplay}>{row.formulaDisplay}</td>
                        <td className="px-2 py-2.5 text-center"><BoolCell value={row.taxable} /></td>
                        <td className="px-2 py-2.5 text-center"><BoolCell value={row.pfApplicable} /></td>
                        <td className="px-2 py-2.5 text-center"><BoolCell value={row.esiApplicable} /></td>
                        <td className="px-2 py-2.5 text-center"><BoolCell value={row.gratuity} /></td>
                        <td className="px-3 py-2.5"><StatusBadge status={row.status} /></td>
                        <td className="px-3 py-2.5">
                          <div className="flex gap-1">
                            <button type="button" onClick={() => void openEdit(row)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" onClick={() => void handleDelete(row)} className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredComponents.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-4 py-10 text-center text-slate-400">No components found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === 'Groups' && (
            <div className="overflow-x-auto p-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase text-[10px]">
                    <th className="text-left px-4 py-2 font-bold">Code</th>
                    <th className="text-left px-4 py-2 font-bold">Name</th>
                    <th className="text-left px-4 py-2 font-bold">Description</th>
                    <th className="text-center px-4 py-2 font-bold">Components</th>
                    <th className="text-left px-4 py-2 font-bold">Status</th>
                    <th className="px-4 py-2 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data?.groups.map((g) => (
                    <tr key={g.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2.5 font-mono">{g.code}</td>
                      <td className="px-4 py-2.5 font-semibold">{g.name}</td>
                      <td className="px-4 py-2.5 text-slate-600">{g.description || '—'}</td>
                      <td className="px-4 py-2.5 text-center tabular-nums">{g.componentCount}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={g.status} /></td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingGroup(g);
                              setGroupForm({ code: g.code, name: g.name, description: g.description, status: g.status, displayOrder: String(g.displayOrder) });
                              setGroupModalOpen(true);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => void handleDeleteGroup(g)} className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'Mapping' && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-600">Component</span>
                  <select value={mappingForm.componentId} onChange={(e) => setMappingForm({ ...mappingForm, componentId: e.target.value })} className={am.input}>
                    <option value="">Select…</option>
                    {data?.components.map((c) => (
                      <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-600">Salary Structure</span>
                  <select value={mappingForm.templateId} onChange={(e) => setMappingForm({ ...mappingForm, templateId: e.target.value })} className={am.input}>
                    <option value="">Any / Pay Grade only</option>
                    {data?.templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.structureCode} — {t.name}</option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-600">Pay Grade</span>
                  <input value={mappingForm.payGrade} onChange={(e) => setMappingForm({ ...mappingForm, payGrade: e.target.value })} className={am.input} placeholder="e.g. Grade T1" />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-600">Effective From</span>
                  <input type="date" value={mappingForm.effectiveFrom} onChange={(e) => setMappingForm({ ...mappingForm, effectiveFrom: e.target.value })} className={am.input} />
                </label>
                <div className="flex items-end">
                  <button type="button" onClick={() => void handleCreateMapping()} disabled={saving} className={`${am.btnPrimary} w-full`}>
                    <Link2 className="w-3.5 h-3.5" />
                    Add Mapping
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase text-[10px]">
                      <th className="text-left px-4 py-2 font-bold">Component</th>
                      <th className="text-left px-4 py-2 font-bold">Structure</th>
                      <th className="text-left px-4 py-2 font-bold">Pay Grade</th>
                      <th className="text-left px-4 py-2 font-bold">Effective</th>
                      <th className="text-center px-4 py-2 font-bold">Priority</th>
                      <th className="text-left px-4 py-2 font-bold">Status</th>
                      <th className="px-4 py-2 font-bold" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data?.mappings.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-2.5">
                          <p className="font-semibold">{m.componentName}</p>
                          <p className="text-[10px] text-slate-400">{m.componentCode}</p>
                        </td>
                        <td className="px-4 py-2.5">{m.structureName || '—'}</td>
                        <td className="px-4 py-2.5">{m.payGrade || '—'}</td>
                        <td className="px-4 py-2.5">{m.effectiveFrom}{m.effectiveTo ? ` → ${m.effectiveTo}` : ''}</td>
                        <td className="px-4 py-2.5 text-center">{m.priority}</td>
                        <td className="px-4 py-2.5"><StatusBadge status={m.status} /></td>
                        <td className="px-4 py-2.5">
                          <button type="button" onClick={() => void handleDeleteMapping(m)} className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!data?.mappings.length && (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No mappings yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'History' && (
            <div className="overflow-x-auto p-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase text-[10px]">
                    <th className="text-left px-4 py-2 font-bold">Date</th>
                    <th className="text-left px-4 py-2 font-bold">Component</th>
                    <th className="text-left px-4 py-2 font-bold">Action</th>
                    <th className="text-left px-4 py-2 font-bold">Changed By</th>
                    <th className="text-left px-4 py-2 font-bold">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data?.history.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2.5 text-slate-500">{new Date(h.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-2.5">
                        <p className="font-semibold">{h.componentName}</p>
                        <p className="text-[10px] text-slate-400">{h.componentCode}</p>
                      </td>
                      <td className="px-4 py-2.5"><StatusBadge status={h.action} /></td>
                      <td className="px-4 py-2.5">{h.changedBy}</td>
                      <td className="px-4 py-2.5 text-slate-600">{h.remarks || '—'}</td>
                    </tr>
                  ))}
                  {!data?.history.length && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No history records</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Component modal */}
      <AcademicModal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Component' : 'Add Component'} large>
        <FeeTabs tabs={[...FORM_TABS]} active={formTab} onChange={(t) => setFormTab(t as FormTab)} />

        {formTab === 'General' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">Code</span>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Auto-generated" className={am.input} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">Name *</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={am.input} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">Component Type</span>
              <select value={form.componentType} onChange={(e) => setForm({ ...form, componentType: e.target.value })} className={am.input}>
                <option value="EARNING">Earning</option>
                <option value="DEDUCTION">Deduction</option>
                <option value="EMPLOYER_CONTRIBUTION">Employer Contribution</option>
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">Group</span>
              <select value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value })} className={am.input}>
                <option value="">None</option>
                {data?.groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">Calculation Type</span>
              <select value={form.calculationType} onChange={(e) => setForm({ ...form, calculationType: e.target.value })} className={am.input}>
                {data?.calculationTypes.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">Status</span>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={am.input}>
                <option value="ACTIVE">Active</option>
                <option value="DRAFT">Draft</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">Percentage</span>
              <input type="number" value={form.percentage} onChange={(e) => setForm({ ...form, percentage: e.target.value })} className={am.input} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">Fixed Amount</span>
              <input type="number" value={form.fixedAmount} onChange={(e) => setForm({ ...form, fixedAmount: e.target.value })} className={am.input} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">Taxability</span>
              <select value={form.taxability} onChange={(e) => setForm({ ...form, taxability: e.target.value })} className={am.input}>
                <option value="TAXABLE">Taxable</option>
                <option value="PARTIALLY_TAXABLE">Partially Taxable</option>
                <option value="NON_TAXABLE">Non-Taxable</option>
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">Display Order</span>
              <input type="number" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: e.target.value })} className={am.input} />
            </label>
            <div className="sm:col-span-2 flex flex-wrap gap-4 pt-1">
              {(['taxable', 'pfApplicable', 'esiApplicable', 'gratuity'] as const).map((key) => (
                <label key={key} className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <input type="checkbox" checked={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} className="rounded" />
                  {key === 'pfApplicable' ? 'PF' : key === 'esiApplicable' ? 'ESI' : key.charAt(0).toUpperCase() + key.slice(1)}
                </label>
              ))}
            </div>
            <label className="block space-y-1 sm:col-span-2">
              <span className="text-xs font-semibold text-slate-600">Description</span>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className={am.input} />
            </label>
          </div>
        )}

        {formTab === 'Advanced' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">Min Amount</span>
              <input type="number" value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: e.target.value })} className={am.input} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">Max Amount</span>
              <input type="number" value={form.maxAmount} onChange={(e) => setForm({ ...form, maxAmount: e.target.value })} className={am.input} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">Round To</span>
              <input type="number" value={form.roundTo} onChange={(e) => setForm({ ...form, roundTo: e.target.value })} placeholder="e.g. 1" className={am.input} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">Attendance Multiplier</span>
              <input type="number" step="0.01" value={form.attendanceMultiplier} onChange={(e) => setForm({ ...form, attendanceMultiplier: e.target.value })} className={am.input} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">Shift Multiplier</span>
              <input type="number" step="0.01" value={form.shiftMultiplier} onChange={(e) => setForm({ ...form, shiftMultiplier: e.target.value })} className={am.input} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">Performance Weight</span>
              <input type="number" step="0.01" value={form.performanceWeight} onChange={(e) => setForm({ ...form, performanceWeight: e.target.value })} className={am.input} />
            </label>
            <div className="sm:col-span-2 flex flex-wrap gap-4">
              {(['includeInGross', 'includeInNet', 'proRata'] as const).map((key) => (
                <label key={key} className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <input type="checkbox" checked={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} className="rounded" />
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </label>
              ))}
            </div>
            <label className="block space-y-1 sm:col-span-2">
              <span className="text-xs font-semibold text-slate-600">Remarks</span>
              <textarea value={form.advancedRemarks} onChange={(e) => setForm({ ...form, advancedRemarks: e.target.value })} rows={2} className={am.input} />
            </label>
          </div>
        )}

        {formTab === 'Formula Builder' && (
          <div className="space-y-3 mt-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">Formula Expression</span>
              <input value={form.formula} onChange={(e) => setForm({ ...form, formula: e.target.value })} placeholder="e.g. 40% of Basic, As per IT slab" className={am.input} />
            </label>
            <p className="text-[10px] text-slate-500">
              Calculation: <strong>{data?.calculationTypes.find((c) => c.value === form.calculationType)?.label}</strong>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 bg-slate-50 rounded-lg">
              {(['basicSalary', 'grossSalary', 'ctc', 'attendanceDays', 'workingDays'] as const).map((key) => (
                <label key={key} className="block space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{key.replace(/([A-Z])/g, ' $1')}</span>
                  <input
                    value={formulaTest[key]}
                    onChange={(e) => setFormulaTest({ ...formulaTest, [key]: e.target.value })}
                    className={am.input}
                  />
                </label>
              ))}
            </div>
            <button type="button" onClick={() => void handlePreviewFormula()} className={am.btnSecondary}>
              <Calculator className="w-3.5 h-3.5" />
              Test Formula
            </button>
            {formulaPreview && (
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <p className="text-sm font-bold text-blue-800">{formatInr(formulaPreview.amount)}</p>
                <p className="text-xs text-blue-600 mt-1">{formulaPreview.explanation}</p>
              </div>
            )}
          </div>
        )}

        {formTab === 'Audit History' && (
          <div className="mt-3 max-h-64 overflow-y-auto">
            {auditHistory.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No audit history for this component</p>
            ) : (
              <div className="space-y-2">
                {auditHistory.map((h) => (
                  <div key={h.id} className="p-3 border border-slate-100 rounded-lg text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <StatusBadge status={h.action} />
                      <span className="text-slate-400">{new Date(h.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="mt-1 text-slate-600">{h.remarks || '—'}</p>
                    <p className="text-[10px] text-slate-400 mt-1">By {h.changedBy}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-4">
          <button type="button" onClick={() => setModalOpen(false)} className={am.btnSecondary}>Cancel</button>
          <button type="button" onClick={() => void handleSave()} disabled={saving} className={am.btnPrimary}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Save Component
          </button>
        </div>
      </AcademicModal>

      {/* Group modal */}
      <AcademicModal open={groupModalOpen} onClose={() => setGroupModalOpen(false)} title={editingGroup ? 'Edit Group' : 'Add Group'}>
        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-600">Code</span>
            <input value={groupForm.code} onChange={(e) => setGroupForm({ ...groupForm, code: e.target.value })} placeholder="Auto-generated" className={am.input} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-600">Name *</span>
            <input value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} className={am.input} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-600">Description</span>
            <textarea value={groupForm.description} onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })} rows={2} className={am.input} />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setGroupModalOpen(false)} className={am.btnSecondary}>Cancel</button>
            <button type="button" onClick={() => void handleSaveGroup()} disabled={saving} className={am.btnPrimary}>Save</button>
          </div>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
