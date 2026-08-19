import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCcw, Save, Trash2, Users } from 'lucide-react';
import {
  deleteDepartmentApprovalHierarchy,
  fetchDepartmentEmployeeOptions,
  fetchDepartmentHierarchyPrefill,
  listApprovalHierarchy,
  listHrDepartments,
  saveDepartmentApprovalHierarchy,
  updateApprovalMapping,
  type HrDepartmentSummary,
  type ModuleApprovalMapping,
} from '../../../lib/hrServices';
import {
  AcademicLoading,
  AcademicModal,
  AcademicPageHeader,
  AcademicPageShell,
  am,
  EmptyState,
  FeeMessage,
} from '../FeeFinanceManagement/FeeFinanceUi';

type EmployeeOpt = { id: string; fullName: string; email?: string; department?: string };
type Scope = 'all' | 'modules' | 'departments';
type LevelDraft = { roleKey: string; roleLabel: string; employeeId: string };

const DEFAULT_LEVELS: LevelDraft[] = [
  { roleKey: 'DEPT_HEAD', roleLabel: 'Department Head / HOD', employeeId: '' },
  { roleKey: 'REPORTING_AUTHORITY', roleLabel: 'Reporting Authority', employeeId: '' },
  { roleKey: 'PRINCIPAL', roleLabel: 'Principal / Center Head', employeeId: '' },
];

export function ApprovalHierarchyView() {
  const [records, setRecords] = useState<ModuleApprovalMapping[]>([]);
  const [employees, setEmployees] = useState<EmployeeOpt[]>([]);
  const [departments, setDepartments] = useState<HrDepartmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [scope, setScope] = useState<Scope>('all');
  const [departmentFilter, setDepartmentFilter] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createDeptId, setCreateDeptId] = useState('');
  const [createExists, setCreateExists] = useState(false);
  const [levels, setLevels] = useState<LevelDraft[]>(DEFAULT_LEVELS);
  const [createBusy, setCreateBusy] = useState(false);
  const [prefillBusy, setPrefillBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [rows, empRes, deptRes] = await Promise.all([
        listApprovalHierarchy(),
        fetchDepartmentEmployeeOptions().catch(() => ({ records: [] })),
        listHrDepartments().catch(() => ({ records: [] })),
      ]);
      setRecords(rows);
      setEmployees(
        (empRes.records || []).map((e) => ({
          id: e.id,
          fullName: e.fullName || e.label || 'Employee',
          email: '',
          department: e.department || '',
        })),
      );
      setDepartments((deptRes.records || []).filter((d) => d.status !== 'DELETED'));
      const next: Record<string, string> = {};
      for (const r of rows) next[r.id] = r.employeeId || '';
      setEdits(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load approval hierarchy');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const mappedDeptIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of records) if (r.departmentId) ids.add(r.departmentId);
    return ids;
  }, [records]);

  const missingDepartments = useMemo(
    () => departments.filter((d) => d.status === 'ACTIVE' && !mappedDeptIds.has(d.id)),
    [departments, mappedDeptIds],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, ModuleApprovalMapping[]>();
    for (const r of records) {
      const isDept = Boolean(r.isDepartmentHierarchy);
      if (scope === 'modules' && isDept) continue;
      if (scope === 'departments' && !isDept) continue;
      if (departmentFilter && (!isDept || r.departmentId !== departmentFilter)) continue;
      const list = map.get(r.moduleCode) || [];
      list.push(r);
      map.set(r.moduleCode, list);
    }
    return [...map.entries()].map(([code, roles]) => ({
      code,
      label: roles[0]?.moduleLabel || code,
      departmentId: roles[0]?.departmentId || '',
      isDepartment: Boolean(roles[0]?.isDepartmentHierarchy),
      roles,
    }));
  }, [records, scope, departmentFilter]);

  const saveRow = async (row: ModuleApprovalMapping) => {
    setSavingId(row.id);
    setError('');
    try {
      const employeeId = edits[row.id] || '';
      await updateApprovalMapping(row.id, { employeeId });
      setMessage(`Updated approver for ${row.moduleLabel} → ${row.roleLabel}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSavingId(null);
    }
  };

  const openCreate = (departmentId?: string) => {
    setCreateDeptId(departmentId || missingDepartments[0]?.id || departments[0]?.id || '');
    setCreateExists(false);
    setLevels(DEFAULT_LEVELS);
    setCreateOpen(true);
    setMessage('');
    setError('');
  };

  useEffect(() => {
    if (!createOpen || !createDeptId) return;
    let cancelled = false;
    setPrefillBusy(true);
    void fetchDepartmentHierarchyPrefill(createDeptId)
      .then((data) => {
        if (cancelled) return;
        setCreateExists(data.exists);
        setLevels(
          data.levels.map((l) => ({
            roleKey: l.roleKey,
            roleLabel: l.roleLabel,
            employeeId: l.employeeId || '',
          })),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setCreateExists(false);
          setLevels(DEFAULT_LEVELS);
        }
      })
      .finally(() => {
        if (!cancelled) setPrefillBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [createOpen, createDeptId]);

  const handleCreate = async () => {
    if (!createDeptId) {
      setError('Select a department');
      return;
    }
    const payload = levels
      .map((l, i) => ({
        roleKey: l.roleKey || undefined,
        roleLabel: l.roleLabel.trim(),
        employeeId: l.employeeId || undefined,
        sortOrder: i,
      }))
      .filter((l) => l.roleLabel);
    if (!payload.length) {
      setError('Add at least one approval level');
      return;
    }
    setCreateBusy(true);
    setError('');
    try {
      const result = await saveDepartmentApprovalHierarchy({
        departmentId: createDeptId,
        levels: payload,
      });
      setMessage(result.message);
      setCreateOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save department hierarchy');
    } finally {
      setCreateBusy(false);
    }
  };

  const handleDeleteDepartmentHierarchy = async (departmentId: string, label: string) => {
    if (!window.confirm(`Delete approval hierarchy for "${label}"?`)) return;
    try {
      await deleteDepartmentApprovalHierarchy(departmentId);
      setMessage(`Removed approval hierarchy for ${label}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const selectedDept = departments.find((d) => d.id === createDeptId);

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="HR & Payroll › Approval Hierarchy"
        title="Approval Hierarchy"
        subtitle="Map approval roles to people, and create department-wise hierarchies when a new department is added."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => openCreate()} className={am.btnPrimary}>
              <Plus size={14} /> New Approval Hierarchy
            </button>
            <button type="button" onClick={() => void load()} className={am.btnSecondary}>
              <RefreshCcw size={14} /> Refresh
            </button>
          </div>
        }
      />
      <div className={am.content}>
        <FeeMessage message={message} type="success" />
        <FeeMessage message={error} type="error" />

        <div className="text-xs text-slate-600 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 flex items-start gap-2">
          <Users size={14} className="mt-0.5 shrink-0 text-indigo-600" />
          <span>
            Create a department-wise approval chain (HOD → Reporting Authority → Principal) for any HR department.
            Module approvals such as refunds still route to the mapped HOD of Finance.
          </span>
        </div>

        {missingDepartments.length > 0 && (
          <div className="text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-amber-800">
              <strong>{missingDepartments.length}</strong> department{missingDepartments.length === 1 ? '' : 's'} have no approval hierarchy yet
              {missingDepartments.slice(0, 4).map((d) => ` · ${d.name}`).join('')}
              {missingDepartments.length > 4 ? '…' : ''}
            </span>
            <button type="button" onClick={() => openCreate(missingDepartments[0].id)} className={am.btnSecondary}>
              <Plus size={12} /> Create for {missingDepartments[0].name}
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {([
            ['all', 'All'],
            ['departments', 'Department hierarchies'],
            ['modules', 'Module approvals'],
          ] as Array<[Scope, string]>).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setScope(key)}
              className={scope === key ? am.btnPrimary : am.btnSecondary}
            >
              {label}
            </button>
          ))}
          <select
            className={`${am.select} ml-auto`}
            value={departmentFilter}
            onChange={(e) => {
              setDepartmentFilter(e.target.value);
              if (e.target.value) setScope('departments');
            }}
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} {mappedDeptIds.has(d.id) ? '' : '(no hierarchy)'}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <AcademicLoading label="Loading approval hierarchy…" />
        ) : grouped.length === 0 ? (
          <EmptyState>No approval mappings yet. Use New Approval Hierarchy to add a department chain.</EmptyState>
        ) : (
          grouped.map((mod) => (
            <div key={mod.code} className={am.tableWrap}>
              <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-100 bg-slate-50">
                <p className="text-xs font-bold text-slate-700">
                  {mod.label}
                  {mod.isDepartment && (
                    <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
                      Department
                    </span>
                  )}
                </p>
                {mod.isDepartment && mod.departmentId && (
                  <button
                    type="button"
                    onClick={() => void handleDeleteDepartmentHierarchy(mod.departmentId, mod.label)}
                    className="text-[11px] font-semibold text-red-600 hover:underline inline-flex items-center gap-1"
                  >
                    <Trash2 size={12} /> Delete hierarchy
                  </button>
                )}
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className={`${am.th} text-left`}>Approval Role</th>
                    <th className={`${am.th} text-left`}>Assigned Person</th>
                    <th className={`${am.th} text-left`}>Email</th>
                    <th className={`${am.th} text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mod.roles.map((row) => {
                    const selectedEmp = employees.find((e) => e.id === (edits[row.id] || ''));
                    return (
                      <tr key={row.id} className="hover:bg-slate-50/80">
                        <td className={am.td}>
                          <p className="font-semibold">{row.roleLabel}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{row.roleKey}</p>
                        </td>
                        <td className={am.td}>
                          <select
                            className={`${am.select} w-full max-w-xs`}
                            value={edits[row.id] || ''}
                            onChange={(e) =>
                              setEdits((prev) => ({ ...prev, [row.id]: e.target.value }))
                            }
                          >
                            <option value="">— Unassigned —</option>
                            {employees.map((e) => (
                              <option key={e.id} value={e.id}>
                                {e.fullName}
                                {e.department ? ` (${e.department})` : ''}
                              </option>
                            ))}
                          </select>
                          {!edits[row.id] && row.assigneeName && (
                            <p className="text-[10px] text-slate-400 mt-1">
                              Current: {row.assigneeName}
                            </p>
                          )}
                        </td>
                        <td className={am.td}>
                          {selectedEmp?.email || row.assigneeEmail || '—'}
                        </td>
                        <td className={`${am.td} text-right`}>
                          <button
                            type="button"
                            className={am.btnPrimary}
                            disabled={savingId === row.id}
                            onClick={() => void saveRow(row)}
                          >
                            {savingId === row.id ? (
                              'Saving…'
                            ) : (
                              <>
                                <Save size={12} /> Save
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>

      <AcademicModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={createExists ? 'Edit Department Approval Hierarchy' : 'New Approval Hierarchy'}
        large
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            Select the department and map each approval level to a person. New departments can be set up here as soon as they exist in HR Departments.
          </p>
          <div>
            <label className="text-xs font-semibold text-slate-600">Department *</label>
            <select
              className={`${am.select} w-full`}
              value={createDeptId}
              onChange={(e) => setCreateDeptId(e.target.value)}
            >
              <option value="">Select department…</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code}){mappedDeptIds.has(d.id) ? ' — hierarchy exists' : ' — new'}
                </option>
              ))}
            </select>
            {selectedDept && (
              <p className="text-[11px] text-slate-500 mt-1">
                {createExists
                  ? `Updating the existing chain for ${selectedDept.name}.`
                  : `Creating a new approval chain for ${selectedDept.name}. Department Head and Reports To are prefilled when available.`}
              </p>
            )}
          </div>

          {prefillBusy ? (
            <AcademicLoading label="Loading department mapping…" />
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-700">Approval levels (in order)</p>
              {levels.map((level, idx) => (
                <div key={`${level.roleKey}-${idx}`} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end border border-slate-100 rounded-lg p-2">
                  <div className="md:col-span-1 text-[10px] font-bold text-slate-400">L{idx + 1}</div>
                  <div className="md:col-span-4">
                    <label className="text-[10px] font-semibold text-slate-500">Role</label>
                    <input
                      className={am.input}
                      value={level.roleLabel}
                      onChange={(e) =>
                        setLevels((prev) => prev.map((row, i) => (i === idx ? { ...row, roleLabel: e.target.value } : row)))
                      }
                    />
                  </div>
                  <div className="md:col-span-6">
                    <label className="text-[10px] font-semibold text-slate-500">Approver</label>
                    <select
                      className={`${am.select} w-full`}
                      value={level.employeeId}
                      onChange={(e) =>
                        setLevels((prev) => prev.map((row, i) => (i === idx ? { ...row, employeeId: e.target.value } : row)))
                      }
                    >
                      <option value="">— Unassigned —</option>
                      {employees.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.fullName}
                          {e.department ? ` (${e.department})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-1">
                    <button
                      type="button"
                      disabled={levels.length <= 1}
                      onClick={() => setLevels((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-2 text-slate-400 hover:text-red-600 disabled:opacity-30"
                      title="Remove level"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setLevels((prev) => [
                    ...prev,
                    { roleKey: '', roleLabel: `Level ${prev.length + 1}`, employeeId: '' },
                  ])
                }
                className={am.btnSecondary}
              >
                <Plus size={14} /> Add approval level
              </button>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCreateOpen(false)} className={am.btnSecondary}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleCreate()}
              className={am.btnPrimary}
              disabled={createBusy || !createDeptId}
            >
              {createBusy ? 'Saving…' : createExists ? 'Save Hierarchy' : 'Create Hierarchy'}
            </button>
          </div>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
