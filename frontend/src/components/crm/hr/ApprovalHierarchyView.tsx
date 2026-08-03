import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCcw, Save, Users } from 'lucide-react';
import {
  fetchDepartmentEmployeeOptions,
  listApprovalHierarchy,
  updateApprovalMapping,
  type ModuleApprovalMapping,
} from '../../../lib/hrServices';
import {
  AcademicLoading,
  AcademicPageHeader,
  AcademicPageShell,
  am,
  EmptyState,
  FeeMessage,
} from '../FeeFinanceManagement/FeeFinanceUi';

export function ApprovalHierarchyView() {
  const [records, setRecords] = useState<ModuleApprovalMapping[]>([]);
  const [employees, setEmployees] = useState<
    Array<{ id: string; fullName: string; email?: string; department?: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [edits, setEdits] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [rows, empRes] = await Promise.all([
        listApprovalHierarchy(),
        fetchDepartmentEmployeeOptions().catch(() => ({ records: [] })),
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

  const grouped = useMemo(() => {
    const map = new Map<string, ModuleApprovalMapping[]>();
    for (const r of records) {
      const list = map.get(r.moduleCode) || [];
      list.push(r);
      map.set(r.moduleCode, list);
    }
    return [...map.entries()].map(([code, roles]) => ({
      code,
      label: roles[0]?.moduleLabel || code,
      roles,
    }));
  }, [records]);

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

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="HR & Payroll › Approval Hierarchy"
        title="Approval Hierarchy"
        subtitle="Map approval roles to people for every module that requires approval. Change assignees anytime."
        actions={
          <button type="button" onClick={() => void load()} className={am.btnSecondary}>
            <RefreshCcw size={14} /> Refresh
          </button>
        }
      />
      <div className={am.content}>
        <FeeMessage message={message} type="success" />
        <FeeMessage message={error} type="error" />

        <div className="text-xs text-slate-600 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 flex items-start gap-2">
          <Users size={14} className="mt-0.5 shrink-0 text-indigo-600" />
          <span>
            Refund requests are sent for approval to the person mapped as <strong>HOD of Finance</strong>.
            Edit mappings below to change who receives approvals for each module.
          </span>
        </div>

        {loading ? (
          <AcademicLoading label="Loading approval hierarchy…" />
        ) : grouped.length === 0 ? (
          <EmptyState>No approval mappings yet.</EmptyState>
        ) : (
          grouped.map((mod) => (
            <div key={mod.code} className={am.tableWrap}>
              <p className="text-xs font-bold text-slate-700 px-3 py-2 border-b border-slate-100 bg-slate-50">
                {mod.label}
              </p>
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
    </AcademicPageShell>
  );
}
