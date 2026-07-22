import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Search,
  UserRound,
} from 'lucide-react';
import { fetchInstitutionSetup } from '../../../lib/institutionApi';
import type { SetupField } from '../../../lib/institutionSetupSchema';
import type { RecordColumn } from './masterListExcel';
import { SetupFieldInput } from './SetupFieldInput';
import {
  applyStaffToRow,
  buildStaffRoster,
  formatClassSectionLabel,
  normalizeClassSectionRow,
  type StaffMember,
} from './classSectionRecords';

type ClassRow = Record<string, string>;

type FilterMode = 'all' | 'assigned' | 'pending';

export function ClassTeacherAssignView({
  fields,
  values,
  onChange,
  records,
  columns,
  onReplaceRecord,
}: {
  fields: SetupField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  records: ClassRow[];
  columns: RecordColumn[];
  onReplaceRecord: (index: number, row: ClassRow) => void;
}) {
  const [staffRoster, setStaffRoster] = useState<StaffMember[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');

  const requireTeacher = values.requireClassTeacher !== 'No';
  const teacherPool = values.teacherPool || '';

  const rows = useMemo(
    () => records.map((r) => normalizeClassSectionRow(r, columns)),
    [records, columns],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { setup } = await fetchInstitutionSetup();
        if (cancelled) return;
        const deptRecords =
          ((setup.departmentsSetup as { records?: ClassRow[] } | undefined)?.records) || [];
        setStaffRoster(
          buildStaffRoster({
            teacherPoolRaw: teacherPool,
            departmentRecords: deptRecords,
            classRecords: records,
            columns,
          }),
        );
      } catch {
        if (!cancelled) {
          setStaffRoster(buildStaffRoster({ teacherPoolRaw: teacherPool, classRecords: records, columns }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [records, columns, teacherPool]);

  const stats = useMemo(() => {
    const total = rows.length;
    const assigned = rows.filter((r) => r.classTeacher.trim()).length;
    const distinctClasses = new Set(rows.map((r) => r.className).filter(Boolean)).size;
    return { total, assigned, unassigned: total - assigned, distinctClasses };
  }, [rows]);

  const visibleIndices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records
      .map((raw, index) => ({ raw, index, norm: normalizeClassSectionRow(raw, columns) }))
      .filter(({ norm }) => {
        const assigned = !!norm.classTeacher.trim();
        if (filter === 'assigned' && !assigned) return false;
        if (filter === 'pending' && assigned) return false;
        if (!q) return true;
        const hay = [
          norm.className,
          norm.sectionName,
          norm.room,
          norm.classTeacher,
          formatClassSectionLabel(norm),
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
  }, [records, columns, search, filter]);

  const findStaffForRow = (norm: ReturnType<typeof normalizeClassSectionRow>): StaffMember | null => {
    if (!norm.classTeacher) return null;
    const byId = staffRoster.find((s) => s.id === norm.classTeacherId && norm.classTeacherId);
    if (byId) return byId;
    return staffRoster.find((s) => s.name.toLowerCase() === norm.classTeacher.toLowerCase()) || null;
  };

  const handleStaffChange = (index: number, staffId: string) => {
    let staff: StaffMember | null = null;
    if (staffId.startsWith('custom_')) {
      staff = {
        id: '',
        name: staffId.slice(7),
        department: 'Class Teacher',
        phone: '',
        email: '',
        source: 'Manual',
      };
    } else if (staffId) {
      staff = staffRoster.find((s) => s.id === staffId) || null;
    }
    const current = records[index] || {};
    const norm = normalizeClassSectionRow(current, columns);
    const merged = {
      ...current,
      className: norm.className || current.className,
      sectionName: norm.sectionName || current.sectionName,
      capacity: norm.capacity || current.capacity,
      room: norm.room || current.room,
    };
    onReplaceRecord(index, applyStaffToRow(merged, staff));
  };

  return (
    <div className="space-y-5">
      {/* Overview */}
      <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
            <GraduationCap size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">Class Teacher Assignment</h2>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed max-w-3xl">
              Each row below is one <strong>class + section</strong> from your{' '}
              <strong>Records / Master List</strong> (for example, Class 1 Section A, Class 1 Section B).
              Assign the responsible class teacher for attendance, parent communication, and student
              welfare. Changes are saved to the master list when you click{' '}
              <strong>Save Configuration</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-3">Assignment rules</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map((field) => (
            <div
              key={field.key}
              className={field.type === 'textarea' ? 'md:col-span-2 space-y-1.5' : 'space-y-1.5'}
            >
              <label className="block text-xs font-bold text-slate-700">{field.label}</label>
              <SetupFieldInput
                field={field}
                value={values[field.key] || ''}
                onChange={(v) => onChange(field.key, v)}
              />
              {field.help && <p className="text-[10px] text-slate-400">{field.help}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Class–sections in master list',
            hint: 'Each row = one class + section (e.g. Class 2 – B)',
            value: stats.total,
            color: 'text-slate-800',
            icon: BookOpen,
          },
          {
            label: 'Distinct classes',
            hint: 'Unique class names across sections',
            value: stats.distinctClasses,
            color: 'text-indigo-700',
            icon: GraduationCap,
          },
          {
            label: 'Teachers assigned',
            hint: 'Sections with a class teacher',
            value: stats.assigned,
            color: 'text-emerald-700',
            icon: CheckCircle2,
          },
          {
            label: 'Pending assignment',
            hint: 'Sections still without a teacher',
            value: stats.unassigned,
            color: 'text-amber-700',
            icon: AlertCircle,
          },
        ].map((card) => (
          <div key={card.label} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <card.icon size={14} />
              <p className="text-[10px] font-semibold uppercase leading-tight">{card.label}</p>
            </div>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-[10px] text-slate-400 mt-1 leading-snug">{card.hint}</p>
          </div>
        ))}
      </div>

      {requireTeacher && stats.unassigned > 0 && stats.total > 0 && (
        <div className="flex items-start gap-2 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <p>
            <strong>{stats.unassigned}</strong> of <strong>{stats.total}</strong> class–sections do not
            have a teacher yet. Your policy requires every section to have a class teacher before
            go-live.
          </p>
        </div>
      )}

      {/* Mapping table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Assign teachers by class–section</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {staffRoster.length} staff available · sourced from teacher pool, department HODs, and
              existing assignments
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search class, section, teacher…"
                className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg w-48"
              />
            </div>
            {(['all', 'assigned', 'pending'] as FilterMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setFilter(mode)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize ${
                  filter === mode
                    ? 'bg-indigo-600 text-white'
                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {records.length === 0 ? (
          <div className="text-center py-14 px-6">
            <BookOpen size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-semibold text-slate-700">No classes in master list</p>
            <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto">
              Open <strong>Records / Master List</strong> in the sidebar and add your classes and
              sections first. Each row there becomes one assignable class–section here.
            </p>
          </div>
        ) : visibleIndices.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-12">No rows match your search or filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold w-10">#</th>
                  <th className="px-4 py-3 font-semibold min-w-[200px]">Class &amp; Section</th>
                  <th className="px-4 py-3 font-semibold">Room</th>
                  <th className="px-4 py-3 font-semibold">Capacity</th>
                  <th className="px-4 py-3 font-semibold min-w-[280px]">Class Teacher</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleIndices.map(({ index, norm }, displayIdx) => {
                  const missing = requireTeacher && !norm.classTeacher.trim();
                  const staff = findStaffForRow(norm);
                  const selectedId =
                    staff?.id ||
                    (norm.classTeacher ? `custom_${norm.classTeacher}` : '');

                  return (
                    <tr
                      key={index}
                      className={`border-b border-slate-100 ${missing ? 'bg-amber-50/40' : 'hover:bg-slate-50/60'}`}
                    >
                      <td className="px-4 py-3 text-slate-400 text-xs font-mono">{displayIdx + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">
                          {norm.className || (
                            <span className="text-amber-700 italic">Class name missing</span>
                          )}
                          {norm.sectionName ? (
                            <span className="text-slate-600 font-medium"> · Section {norm.sectionName}</span>
                          ) : (
                            <span className="text-slate-400 font-normal"> · No section</span>
                          )}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{formatClassSectionLabel(norm)}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{norm.room || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{norm.capacity ? `${norm.capacity} seats` : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <UserRound size={16} className="text-indigo-500 shrink-0" />
                            <select
                              value={selectedId}
                              onChange={(e) => handleStaffChange(index, e.target.value)}
                              className={`flex-1 border rounded-lg px-2.5 py-2 text-sm bg-white ${
                                missing ? 'border-amber-400 ring-1 ring-amber-200' : 'border-slate-200'
                              }`}
                            >
                              <option value="">— Select class teacher —</option>
                              {staffRoster.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                  {s.department ? ` · ${s.department}` : ''}
                                </option>
                              ))}
                              {norm.classTeacher &&
                                !staffRoster.some(
                                  (s) => s.name.toLowerCase() === norm.classTeacher.toLowerCase(),
                                ) && (
                                  <option value={`custom_${norm.classTeacher}`}>
                                    {norm.classTeacher} (saved)
                                  </option>
                                )}
                            </select>
                          </div>
                          {staff && (
                            <p className="text-[10px] text-slate-500 pl-6">
                              {staff.department}
                              {staff.phone ? ` · ${staff.phone}` : ''}
                              {staff.email ? ` · ${staff.email}` : ''}
                            </p>
                          )}
                          {!staff && norm.classTeacher && (
                            <p className="text-[10px] text-slate-500 pl-6">
                              Assigned: <strong>{norm.classTeacher}</strong>
                              {norm.classTeacherPhone ? ` · ${norm.classTeacherPhone}` : ''}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {norm.classTeacher ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-800">
                            <CheckCircle2 size={12} /> Assigned
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-800">
                            <AlertCircle size={12} /> Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {stats.total > 0 && (
        <p className="text-[11px] text-slate-400 text-center">
          Showing {visibleIndices.length} of {stats.total} class–sections from Records / Master List
        </p>
      )}
    </div>
  );
}
