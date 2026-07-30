import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus, CheckCircle, Search, Users, User, Phone, ClipboardList, FileText, X,
} from 'lucide-react';
import {
  createParentEngagement, createParentEngagementsBatch, fetchParentEngagements,
  fetchParentEngagementsMeta, fetchParentEngagementHierarchy, updateParentEngagement,
  type EngagementHierarchyMeta, type EngagementRecord,
} from '../../../lib/parentEngagementServices';
import { fetchParents, fetchParentDetail, type ParentDetail, type ParentListItem } from '../../../lib/parentServices';
import { fetchStudents, fetchStudentsMeta } from '../../../lib/studentServices';
import {
  ParentKpiCard, ParentKpiGrid, ParentLoading, ParentModal,
  ParentPageHeader, ParentPageShell, ParentTableCard, pm,
} from './ParentManagementUi';

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type FilterMode = 'hierarchy' | 'parent' | 'child';
type SelectedChild = { studentId: string; name: string; classGroup: string };
type EngagementFormTab = 'plan' | 'results';
type EngagementModalState = { mode: 'create' | 'edit'; tab: EngagementFormTab; record?: EngagementRecord };

const emptyForm = () => ({
  parentRelationship: 'FATHER',
  title: '',
  plannedAt: '',
  description: '',
  engagementType: 'General',
  actionsTaken: '',
  outcome: '',
});

export function ParentsEngagementView() {
  const [records, setRecords] = useState<EngagementRecord[]>([]);
  const [summary, setSummary] = useState<{ total: number; planned: number; completed: number; missed: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const [filterMode, setFilterMode] = useState<FilterMode>('hierarchy');
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [hierarchyMeta, setHierarchyMeta] = useState<EngagementHierarchyMeta | null>(null);
  const [teacherName, setTeacherName] = useState('');
  const [hierarchyClass, setHierarchyClass] = useState('');
  const [hierarchySection, setHierarchySection] = useState('');
  const [sectionStudents, setSectionStudents] = useState<{ id: string; fullName: string; classGroup: string }[]>([]);

  const [parentSearch, setParentSearch] = useState('');
  const [parentResults, setParentResults] = useState<ParentListItem[]>([]);
  const [searchingParents, setSearchingParents] = useState(false);
  const [selectedParent, setSelectedParent] = useState<ParentDetail | null>(null);
  const [selectedParentKey, setSelectedParentKey] = useState<string | null>(null);

  const [classOptions, setClassOptions] = useState<string[]>([]);
  const [sectionOptions, setSectionOptions] = useState<string[]>([]);
  const [childClass, setChildClass] = useState('');
  const [childSection, setChildSection] = useState('');
  const [childStudents, setChildStudents] = useState<{ id: string; fullName: string; classGroup: string }[]>([]);
  const [selectedChildId, setSelectedChildId] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [engagementModal, setEngagementModal] = useState<EngagementModalState | null>(null);
  const [planAllChildren, setPlanAllChildren] = useState(false);
  const [selectedPlanChildren, setSelectedPlanChildren] = useState<SelectedChild[]>([]);
  const [allStudents, setAllStudents] = useState<{ id: string; fullName: string; classGroup: string }[]>([]);
  const [modalStudentId, setModalStudentId] = useState('');
  const [form, setForm] = useState(emptyForm());

  const listParams = useMemo(() => {
    if (filterMode === 'hierarchy' && teacherName && hierarchyClass) {
      return {
        teacherName,
        className: hierarchyClass,
        sectionName: hierarchySection || undefined,
        academicYear,
      };
    }
    if (selectedParentKey) return { parentKey: selectedParentKey };
    if (selectedChildId) return { studentId: selectedChildId };
    return undefined;
  }, [filterMode, teacherName, hierarchyClass, hierarchySection, academicYear, selectedParentKey, selectedChildId]);

  const teacherAssignments = useMemo(() => {
    return hierarchyMeta?.teachers.find((t) => t.teacherName === teacherName)?.assignments || [];
  }, [hierarchyMeta, teacherName]);

  const teacherClassOptions = useMemo(() => {
    return [...new Set(teacherAssignments.map((a) => a.className))];
  }, [teacherAssignments]);

  const teacherSectionOptions = useMemo(() => {
    if (!hierarchyClass) return [];
    return teacherAssignments
      .filter((a) => a.className === hierarchyClass)
      .map((a) => a.sectionName);
  }, [teacherAssignments, hierarchyClass]);

  const nextAssignment = useMemo(() => {
    if (!hierarchyClass || !hierarchySection) return null;
    const idx = teacherAssignments.findIndex(
      (a) => a.className === hierarchyClass && a.sectionName === hierarchySection,
    );
    if (idx < 0 || idx >= teacherAssignments.length - 1) return null;
    return teacherAssignments[idx + 1];
  }, [teacherAssignments, hierarchyClass, hierarchySection]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [meta, list] = await Promise.all([
        fetchParentEngagementsMeta(),
        fetchParentEngagements(listParams),
      ]);
      setSummary(meta.summary);
      setRecords(list.records);
    } finally {
      setLoading(false);
    }
  }, [listParams]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    void fetchParentEngagementHierarchy(academicYear).then(setHierarchyMeta);
    void fetchStudentsMeta().then((r) => {
      setClassOptions(r.filters.classes);
      if (r.filters.defaultAcademicYear) setAcademicYear(r.filters.defaultAcademicYear);
    });
    void fetchStudents({ pageSize: 500, viewAll: true }).then((r) =>
      setAllStudents(r.students.map((s) => ({
        id: s.id,
        fullName: s.fullName,
        classGroup: s.classSection || `${s.className}-${s.sectionName}`,
      }))),
    );
  }, [academicYear]);

  useEffect(() => {
    if (!hierarchyClass) {
      setSectionStudents([]);
      setSelectedPlanChildren([]);
      return;
    }
    void fetchStudents({
      className: hierarchyClass,
      sectionName: hierarchySection || undefined,
      academicYear,
      viewAll: true,
      pageSize: 500,
    }).then((r) => {
      const students = r.students.map((s) => ({
        id: s.id,
        fullName: s.fullName,
        classGroup: s.classSection || `${s.className}-${s.sectionName}`,
      }));
      setSectionStudents(students);
      if (filterMode === 'hierarchy' && students.length > 0) {
        setSelectedPlanChildren(students.map((s) => ({
          studentId: s.id,
          name: s.fullName,
          classGroup: s.classGroup,
        })));
      }
    });
  }, [hierarchyClass, hierarchySection, academicYear, filterMode]);

  useEffect(() => {
    if (!childClass) {
      setSectionOptions([]);
      setChildSection('');
      return;
    }
    void fetchStudentsMeta().then((r) => {
      setSectionOptions(r.filters.sectionsByClass[childClass] || []);
      setChildSection('');
      setSelectedChildId('');
      setSelectedParent(null);
      setSelectedParentKey(null);
    });
  }, [childClass]);

  useEffect(() => {
    if (!childClass) {
      setChildStudents([]);
      return;
    }
    void fetchStudents({
      className: childClass,
      sectionName: childSection || undefined,
      viewAll: true,
      pageSize: 500,
    }).then((r) => {
      setChildStudents(r.students.map((s) => ({
        id: s.id,
        fullName: s.fullName,
        classGroup: s.classSection || `${s.className}-${s.sectionName}`,
      })));
    });
  }, [childClass, childSection]);

  const searchParents = async () => {
    if (!parentSearch.trim()) return;
    setSearchingParents(true);
    try {
      const res = await fetchParents({ q: parentSearch.trim() });
      setParentResults(res.parents);
      if (res.parents.length === 1) {
        await selectParent(res.parents[0].parentKey);
      }
    } finally {
      setSearchingParents(false);
    }
  };

  const selectParent = async (parentKey: string) => {
    setSelectedParentKey(parentKey);
    setSelectedChildId('');
    const detail = await fetchParentDetail(parentKey);
    setSelectedParent(detail);
    setSelectedPlanChildren(detail.children.map((c) => ({
      studentId: c.studentId,
      name: c.name,
      classGroup: c.classGroup,
    })));
    setForm((f) => ({
      ...f,
      parentRelationship: detail.parent.relationship === 'Mother' ? 'MOTHER' : 'FATHER',
    }));
  };

  const selectChild = async (studentId: string) => {
    setSelectedChildId(studentId);
    setSelectedParentKey(null);
    const student = childStudents.find((s) => s.id === studentId);
    if (!student) return;

    const res = await fetchParents({ q: student.fullName });
    const match = res.parents.find((p) => p.students.some((s) => s.studentId === studentId));
    if (match) {
      const detail = await fetchParentDetail(match.parentKey);
      setSelectedParent(detail);
      const child = detail.children.find((c) => c.studentId === studentId);
      setSelectedPlanChildren(child ? [{ studentId: child.studentId, name: child.name, classGroup: child.classGroup }] : []);
      setForm((f) => ({
        ...f,
        parentRelationship: detail.parent.relationship === 'Mother' ? 'MOTHER' : 'FATHER',
      }));
    } else {
      setSelectedParent(null);
      setSelectedPlanChildren([{ studentId: student.id, name: student.fullName, classGroup: student.classGroup }]);
    }
  };

  const clearSelection = () => {
    setSelectedParent(null);
    setSelectedParentKey(null);
    setSelectedChildId('');
    setParentResults([]);
    setParentSearch('');
    setChildClass('');
    setChildSection('');
    setTeacherName('');
    setHierarchyClass('');
    setHierarchySection('');
    setSectionStudents([]);
    setSelectedPlanChildren([]);
    setPlanAllChildren(false);
  };

  const applyHierarchyAssignment = (className: string, sectionName: string) => {
    setHierarchyClass(className);
    setHierarchySection(sectionName);
    setSelectedChildId('');
    setSelectedParent(null);
    setSelectedParentKey(null);
  };

  const advanceToNextClass = () => {
    if (!nextAssignment) return false;
    applyHierarchyAssignment(nextAssignment.className, nextAssignment.sectionName);
    return true;
  };

  const openPlanForm = () => {
    if (filterMode === 'hierarchy' && (!teacherName || !hierarchyClass || !hierarchySection)) {
      setMessage('Select Teacher, Class, and Section in the hierarchy filter first.');
      return;
    }
    setPlanAllChildren(
      filterMode === 'hierarchy'
        ? true
        : selectedParent
          ? selectedParent.children.length > 1
          : false,
    );
    setModalStudentId(selectedPlanChildren[0]?.studentId || selectedChildId || '');
    setForm(emptyForm());
    if (selectedParent) {
      setForm((f) => ({
        ...f,
        parentRelationship: selectedParent.parent.relationship === 'Mother' ? 'MOTHER' : 'FATHER',
      }));
    }
    setEngagementModal({ mode: 'create', tab: 'plan' });
    setShowForm(true);
  };

  const openEditEngagement = (record: EngagementRecord, tab: EngagementFormTab = 'plan') => {
    setModalStudentId(record.studentId);
    setForm({
      parentRelationship: record.parentRelationship,
      title: record.title,
      plannedAt: toLocalInputValue(record.plannedAt),
      description: record.description,
      engagementType: record.engagementType || 'General',
      actionsTaken: record.actionsTaken || '',
      outcome: record.outcome || '',
    });
    setEngagementModal({ mode: 'edit', tab, record });
    setShowForm(true);
  };

  const closeEngagementModal = () => {
    setShowForm(false);
    setEngagementModal(null);
    setModalStudentId('');
    setForm(emptyForm());
  };

  const targetsForForm = () => (
    planAllChildren && selectedParent
      ? selectedParent.children.map((c) => ({ studentId: c.studentId, name: c.name, classGroup: c.classGroup }))
      : selectedPlanChildren
  );

  const togglePlanChild = (child: SelectedChild) => {
    setSelectedPlanChildren((prev) => {
      const exists = prev.some((c) => c.studentId === child.studentId);
      if (exists) return prev.filter((c) => c.studentId !== child.studentId);
      return [...prev, child];
    });
  };

  const resolveCreateTargets = () => {
    if (selectedPlanChildren.length > 0) {
      return planAllChildren && selectedParent
        ? selectedParent.children.map((c) => ({ studentId: c.studentId, name: c.name, classGroup: c.classGroup }))
        : selectedPlanChildren;
    }
    if (modalStudentId) {
      const s = allStudents.find((st) => st.id === modalStudentId);
      return s ? [{ studentId: s.id, name: s.fullName, classGroup: s.classGroup }] : [];
    }
    return [];
  };

  const hierarchyPayload = () => ({
    teacherName,
    className: hierarchyClass,
    sectionName: hierarchySection,
    academicYear,
    publishToMobile: true,
  });

  const persistEngagementPlan = async (andCreateNext = false) => {
    const targets = resolveCreateTargets();
    if (targets.length === 0) {
      setMessage('Select students for this class/section or choose a parent/child.');
      return;
    }

    const payload = {
      parentRelationship: form.parentRelationship,
      title: form.title,
      description: form.description,
      engagementType: form.engagementType,
      plannedAt: new Date(form.plannedAt).toISOString(),
      actionsTaken: form.actionsTaken || undefined,
      outcome: form.outcome || undefined,
      status: form.outcome ? 'COMPLETED' : 'PLANNED',
      completedAt: form.outcome ? new Date().toISOString() : undefined,
      ...(filterMode === 'hierarchy' ? hierarchyPayload() : {}),
    };

    if (targets.length === 1) {
      await createParentEngagement({ ...payload, studentId: targets[0].studentId });
    } else {
      await createParentEngagementsBatch(targets.map((c) => ({ ...payload, studentId: c.studentId })));
    }

    setMessage(
      filterMode === 'hierarchy'
        ? `Created ${targets.length} engagement plan(s) for ${hierarchyClass} ${hierarchySection} and published to teacher mobile app.`
        : targets.length > 1
          ? `Created ${targets.length} engagement plans.`
          : 'Action plan created.',
    );

    if (andCreateNext) {
      const queued = nextAssignment;
      if (queued && advanceToNextClass()) {
        setForm((f) => ({ ...f, title: '', description: '', actionsTaken: '', outcome: '' }));
        setMessage(`Saved. Continue with ${queued.classGroup}.`);
        void load();
        return;
      }
    }

    closeEngagementModal();
    void load();
  };

  const handleSavePlan = async (andCreateNext = false) => {
    if (!form.title || !form.plannedAt) {
      setMessage('Title and planned date are required on Action Plan.');
      return;
    }

    if (engagementModal?.mode === 'edit' && engagementModal.record) {
      try {
        await updateParentEngagement(engagementModal.record.id, {
          title: form.title,
          description: form.description,
          engagementType: form.engagementType,
          plannedAt: new Date(form.plannedAt).toISOString(),
        });
        setMessage('Action plan updated.');
        closeEngagementModal();
        void load();
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'Failed to update plan');
      }
      return;
    }

    const targets = resolveCreateTargets();
    if (targets.length === 0) {
      setMessage('Select a student or parent/child from filters.');
      return;
    }

    try {
      await persistEngagementPlan(andCreateNext);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to create engagement');
    }
  };

  const handleSaveResults = async () => {
    if (!form.actionsTaken.trim()) {
      setMessage('Please record actions taken before saving results.');
      setEngagementModal((m) => (m ? { ...m, tab: 'results' } : m));
      return;
    }

    if (engagementModal?.mode === 'edit' && engagementModal.record) {
      try {
        await updateParentEngagement(engagementModal.record.id, {
          actionsTaken: form.actionsTaken.trim(),
          outcome: form.outcome.trim(),
          status: form.outcome.trim() ? 'COMPLETED' : 'PLANNED',
          completedAt: form.outcome.trim() ? new Date().toISOString() : null,
        });
        setMessage(form.outcome.trim() ? 'Results saved and engagement completed.' : 'Actions recorded.');
        closeEngagementModal();
        void load();
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'Failed to save results');
      }
      return;
    }

    if (!form.title || !form.plannedAt) {
      setMessage('Complete the Action Plan tab first (title and date).');
      setEngagementModal((m) => (m ? { ...m, tab: 'plan' } : m));
      return;
    }

    await handleSavePlan();
  };

  if (loading && !summary) return <ParentLoading label="Loading engagements…" />;

  return (
    <ParentPageShell>
      <ParentPageHeader
        breadcrumb="Parent Management › Parents Engagement"
        title="Parents Engagement"
        subtitle="Teacher → Class → Section → Parents Engagement. Plans sync to the teacher mobile app."
        actions={
          <button type="button" onClick={openPlanForm} className={pm.btnPrimary}>
            <Plus size={14} /> New Engagement
          </button>
        }
      />

      <div className={pm.content}>
        {message && <p className={pm.message}>{message}</p>}

        <div className={`${pm.card} ${pm.cardPad} space-y-4`}>
          <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3 text-xs text-indigo-900">
            <p className="font-bold">Hierarchy workflow</p>
            <p className="mt-1 text-indigo-800">
              Select <strong>Teacher</strong> → <strong>Class</strong> → <strong>Section</strong>, then create parent engagement plans for all students in that section.
              Teacher assignments come from Academic Management (Class Teacher &amp; Teacher Allocation) and are published to the mobile app automatically.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { setFilterMode('hierarchy'); clearSelection(); }}
              className={filterMode === 'hierarchy' ? pm.tabActive : pm.tab}
            >
              <Users size={12} className="inline mr-1" /> Teacher → Class → Section
            </button>
            <button
              type="button"
              onClick={() => { setFilterMode('parent'); clearSelection(); }}
              className={filterMode === 'parent' ? pm.tabActive : pm.tab}
            >
              <Search size={12} className="inline mr-1" /> Search Parent
            </button>
            <button
              type="button"
              onClick={() => { setFilterMode('child'); clearSelection(); }}
              className={filterMode === 'child' ? pm.tabActive : pm.tab}
            >
              <User size={12} className="inline mr-1" /> Child-wise Filter
            </button>
            {(selectedParent || selectedChildId || teacherName) && (
              <button type="button" onClick={clearSelection} className={`${pm.btnGhost} ml-auto text-xs`}>
                <X size={12} /> Clear selection
              </button>
            )}
          </div>

          {filterMode === 'hierarchy' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className={pm.selectFull}>
                  <option value={academicYear}>{academicYear}</option>
                </select>
                <select
                  value={teacherName}
                  onChange={(e) => {
                    setTeacherName(e.target.value);
                    setHierarchyClass('');
                    setHierarchySection('');
                  }}
                  className={pm.selectFull}
                >
                  <option value="">Select Teacher</option>
                  {(hierarchyMeta?.teachers || []).map((t) => (
                    <option key={t.teacherName} value={t.teacherName}>{t.teacherName}</option>
                  ))}
                </select>
                <select
                  value={hierarchyClass}
                  onChange={(e) => {
                    setHierarchyClass(e.target.value);
                    setHierarchySection('');
                  }}
                  disabled={!teacherName}
                  className={pm.selectFull}
                >
                  <option value="">Select Class</option>
                  {teacherClassOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select
                  value={hierarchySection}
                  onChange={(e) => setHierarchySection(e.target.value)}
                  disabled={!hierarchyClass}
                  className={pm.selectFull}
                >
                  <option value="">Select Section</option>
                  {teacherSectionOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {teacherName && teacherAssignments.length === 0 && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2">
                  No class/section assignments found for this teacher. Assign class teachers in Academic Management → Class Sections or Teacher Allocation.
                </p>
              )}
              {teacherName && hierarchyClass && hierarchySection && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-bold text-slate-700 mb-2">
                    Students in {hierarchyClass} {hierarchySection} ({sectionStudents.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {sectionStudents.map((s) => (
                      <span key={s.id} className={`${pm.badge} ${pm.badgeBlue}`}>{s.fullName}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : filterMode === 'parent' ? (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Search parent name or registered mobile number…"
                  value={parentSearch}
                  onChange={(e) => setParentSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void searchParents(); }}
                  className={`${pm.input} flex-1`}
                />
                <button type="button" onClick={() => void searchParents()} disabled={searchingParents} className={pm.btnSecondary}>
                  <Search size={14} /> {searchingParents ? 'Searching…' : 'Search'}
                </button>
              </div>
              {parentResults.length > 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {parentResults.map((p) => (
                    <button
                      key={p.parentKey}
                      type="button"
                      onClick={() => void selectParent(p.parentKey)}
                      className={`text-left p-3 rounded-lg border transition-colors ${selectedParentKey === p.parentKey ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                    >
                      <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.relationship} · {p.mobile}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{p.students.length} child(ren): {p.students.map((s) => s.name).join(', ')}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select value={childClass} onChange={(e) => setChildClass(e.target.value)} className={pm.selectFull}>
                <option value="">Select Class</option>
                {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={childSection} onChange={(e) => setChildSection(e.target.value)} disabled={!childClass} className={pm.selectFull}>
                <option value="">All Sections</option>
                {sectionOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={selectedChildId} onChange={(e) => void selectChild(e.target.value)} disabled={!childClass || childStudents.length === 0} className={pm.selectFull}>
                <option value="">Select Student</option>
                {childStudents.map((s) => <option key={s.id} value={s.id}>{s.fullName} ({s.classGroup})</option>)}
              </select>
            </div>
          )}
        </div>

        {selectedParent && (
          <div className={`${pm.card} ${pm.cardPad}`}>
            <div className="flex flex-col md:flex-row md:items-start gap-4">
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-lg">
                  {selectedParent.parent.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{selectedParent.parent.name}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Phone size={11} /> {selectedParent.parent.mobile}
                  </p>
                  <p className="text-xs text-slate-500">{selectedParent.parent.relationship} · {selectedParent.parent.email || 'No email'}</p>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                  <Users size={12} /> Children enrolled ({selectedParent.children.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedParent.children.map((c) => {
                    const selected = selectedPlanChildren.some((p) => p.studentId === c.studentId);
                    return (
                      <button
                        key={c.studentId}
                        type="button"
                        onClick={() => togglePlanChild({ studentId: c.studentId, name: c.name, classGroup: c.classGroup })}
                        className={`px-3 py-2 rounded-lg border text-left text-xs transition-colors ${selected ? 'border-indigo-400 bg-indigo-50 text-indigo-900' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'}`}
                      >
                        <p className="font-semibold">{c.name}</p>
                        <p className="text-slate-500">{c.classGroup}</p>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-400 mt-2">
                  Select one child for individual plan, or select multiple / use &quot;Plan all children&quot; when creating engagement.
                </p>
              </div>
            </div>
          </div>
        )}

        {summary && (
          <ParentKpiGrid>
            <ParentKpiCard label="Total" value={summary.total} />
            <ParentKpiCard label="Planned" value={summary.planned} valueClassName="text-amber-600" />
            <ParentKpiCard label="Completed" value={summary.completed} valueClassName="text-emerald-600" />
            <ParentKpiCard label="Missed" value={summary.missed} valueClassName="text-red-600" />
          </ParentKpiGrid>
        )}

        <ParentTableCard
          title={
            filterMode === 'hierarchy' && teacherName && hierarchyClass
              ? `Engagements — ${teacherName} · ${hierarchyClass} ${hierarchySection || ''}`
              : selectedParent || selectedChildId
                ? 'Filtered Engagement Events'
                : 'Engagement Events'
          }
          footer={`${records.length} event(s)`}
        >
          <table className={pm.table}>
            <thead className={pm.tableHead}>
              <tr>
                <th className={pm.th}>Title</th>
                <th className={pm.th}>Teacher</th>
                <th className={pm.th}>Student</th>
                <th className={pm.th}>Parent</th>
                <th className={pm.th}>Type</th>
                <th className={pm.th}>Planned</th>
                <th className={pm.th}>Status</th>
                <th className={pm.th}>Actions</th>
              </tr>
            </thead>
            <tbody className={pm.tbody}>
              {records.length === 0 ? (
                <tr><td colSpan={8} className="p-10 text-center text-slate-400 text-sm">No engagements yet</td></tr>
              ) : records.map((r) => (
                <tr key={r.id} className={pm.trHover}>
                  <td className={`${pm.td} font-medium text-slate-800`}>
                    <div>{r.title}</div>
                    {r.actionsTaken && (
                      <p className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[180px]" title={r.actionsTaken}>
                        Action: {r.actionsTaken}
                      </p>
                    )}
                    {r.outcome && (
                      <p className="text-[10px] text-emerald-600 mt-0.5 truncate max-w-[180px]" title={r.outcome}>
                        Result: {r.outcome}
                      </p>
                    )}
                  </td>
                  <td className={pm.td}>
                    <div className="text-sm">{r.teacherName || '—'}</div>
                    <div className="text-[10px] text-slate-500">
                      {r.className ? `${r.className} ${r.sectionName}` : r.classGroup}
                      {r.mobilePublished ? ' · Mobile' : ''}
                    </div>
                  </td>
                  <td className={pm.td}>
                    <div className="text-sm">{r.studentName}</div>
                    <div className="text-[10px] text-slate-500">{r.classGroup}</div>
                  </td>
                  <td className={pm.td}>
                    <div className="text-sm">{r.parentName}</div>
                    <div className="text-[10px] text-slate-500">{r.parentMobile}</div>
                  </td>
                  <td className={pm.td}>{r.engagementType || r.relationshipLabel}</td>
                  <td className={`${pm.td} text-slate-500 text-xs`}>{new Date(r.plannedAt).toLocaleString('en-IN')}</td>
                  <td className={pm.td}>
                    <span className={`${pm.badge} ${r.status === 'COMPLETED' ? pm.badgeGreen : r.status === 'MISSED' ? pm.badgeRed : pm.badgeAmber}`}>
                      {r.statusLabel}
                    </span>
                  </td>
                  <td className={pm.td}>
                    <div className="flex flex-col gap-1">
                      <button type="button" onClick={() => openEditEngagement(r, 'plan')} className="text-xs text-slate-600 font-semibold hover:underline text-left">
                        Manage
                      </button>
                      {r.status === 'PLANNED' && !r.actionsTaken && (
                        <button type="button" onClick={() => openEditEngagement(r, 'results')} className="text-xs text-indigo-700 font-bold flex items-center gap-1 hover:underline">
                          <ClipboardList size={12} /> Record Action
                        </button>
                      )}
                      {r.status === 'PLANNED' && r.actionsTaken && !r.outcome && (
                        <button type="button" onClick={() => openEditEngagement(r, 'results')} className="text-xs text-emerald-700 font-bold flex items-center gap-1 hover:underline">
                          <FileText size={12} /> Result Capture
                        </button>
                      )}
                      {r.status === 'COMPLETED' && (
                        <span className="text-xs text-emerald-600 flex items-center gap-1">
                          <CheckCircle size={12} /> Done
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ParentTableCard>
      </div>

      <ParentModal
        open={showForm}
        onClose={closeEngagementModal}
        title={engagementModal?.mode === 'edit' ? 'Manage Engagement' : 'New Engagement'}
        large
      >
        <div className="space-y-4">
          <div className={`${pm.tabs} -mx-1`}>
            <button
              type="button"
              onClick={() => setEngagementModal((m) => (m ? { ...m, tab: 'plan' } : { mode: 'create', tab: 'plan' }))}
              className={engagementModal?.tab === 'plan' ? pm.tabActive : pm.tab}
            >
              <ClipboardList size={12} className="inline mr-1" /> Action Plan
            </button>
            <button
              type="button"
              onClick={() => setEngagementModal((m) => (m ? { ...m, tab: 'results' } : { mode: 'create', tab: 'results' }))}
              className={engagementModal?.tab === 'results' ? pm.tabActive : pm.tab}
            >
              <FileText size={12} className="inline mr-1" /> Result Capture
            </button>
          </div>

          {engagementModal?.tab === 'plan' ? (
            <div className="space-y-3">
              {engagementModal.mode === 'create' && filterMode === 'hierarchy' && (
                <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3 text-xs text-slate-700 space-y-1">
                  <p><span className="font-semibold text-slate-800">Teacher:</span> {teacherName}</p>
                  <p><span className="font-semibold text-slate-800">Class / Section:</span> {hierarchyClass} {hierarchySection}</p>
                  <p><span className="font-semibold text-slate-800">Students:</span> {selectedPlanChildren.length} selected for engagement plan</p>
                </div>
              )}

              {engagementModal.mode === 'create' && filterMode !== 'hierarchy' && (
                <>
                  {selectedPlanChildren.length > 0 ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                      <p className="text-xs font-bold text-slate-700">Planning for:</p>
                      {selectedPlanChildren.length > 1 && (
                        <label className="flex items-center gap-2 text-xs text-slate-600">
                          <input
                            type="checkbox"
                            checked={planAllChildren}
                            onChange={(e) => setPlanAllChildren(e.target.checked)}
                            className="rounded border-slate-300"
                          />
                          Plan for all {selectedParent?.children.length ?? selectedPlanChildren.length} children
                        </label>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {targetsForForm().map((c) => (
                          <span key={c.studentId} className={`${pm.badge} ${pm.badgeBlue}`}>{c.name} · {c.classGroup}</span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <select
                      value={modalStudentId}
                      onChange={(e) => setModalStudentId(e.target.value)}
                      className={pm.selectFull}
                    >
                      <option value="">Select student</option>
                      {allStudents.map((s) => (
                        <option key={s.id} value={s.id}>{s.fullName} ({s.classGroup})</option>
                      ))}
                    </select>
                  )}
                </>
              )}

              {engagementModal.mode === 'edit' && engagementModal.record && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
                  <p><span className="font-semibold text-slate-800">Student:</span> {engagementModal.record.studentName} ({engagementModal.record.classGroup})</p>
                  <p><span className="font-semibold text-slate-800">Parent:</span> {engagementModal.record.parentName} · {engagementModal.record.parentMobile}</p>
                </div>
              )}

              <select
                value={form.parentRelationship}
                onChange={(e) => setForm((f) => ({ ...f, parentRelationship: e.target.value }))}
                className={pm.selectFull}
                disabled={engagementModal?.mode === 'edit'}
              >
                <option value="FATHER">Father</option>
                <option value="MOTHER">Mother</option>
                <option value="GUARDIAN">Guardian</option>
              </select>
              <input
                placeholder="Title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className={pm.input}
              />
              <select
                value={form.engagementType}
                onChange={(e) => setForm((f) => ({ ...f, engagementType: e.target.value }))}
                className={pm.selectFull}
              >
                <option value="General">General</option>
                <option value="PTM Follow-up">PTM Follow-up</option>
                <option value="Academic">Academic</option>
                <option value="Behaviour">Behaviour</option>
                <option value="Fee Reminder">Fee Reminder</option>
                <option value="Wellness Check">Wellness Check</option>
              </select>
              <input
                type="datetime-local"
                value={form.plannedAt}
                onChange={(e) => setForm((f) => ({ ...f, plannedAt: e.target.value }))}
                className={pm.input}
              />
              <textarea
                placeholder="Action plan — objectives, approach, and planned steps with the parent"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className={pm.input}
                rows={3}
              />
            </div>
          ) : (
            <div className="space-y-3">
              {(engagementModal?.record || form.title) && (
                <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3 text-xs space-y-1">
                  <p className="font-bold text-slate-800">{form.title || engagementModal?.record?.title}</p>
                  {engagementModal?.record && (
                    <p className="text-slate-600">{engagementModal.record.studentName} · {engagementModal.record.parentName}</p>
                  )}
                  {form.description && (
                    <p className="text-slate-500 pt-1 border-t border-indigo-100 mt-1">
                      <span className="font-semibold">Plan:</span> {form.description}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Actions taken</label>
                <textarea
                  placeholder="Record actions — calls made, messages sent, meetings held, follow-up steps completed…"
                  value={form.actionsTaken}
                  onChange={(e) => setForm((f) => ({ ...f, actionsTaken: e.target.value }))}
                  className={pm.input}
                  rows={4}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Results & outcome</label>
                <textarea
                  placeholder="Capture results — parent response, resolution, impact on student, next steps…"
                  value={form.outcome}
                  onChange={(e) => setForm((f) => ({ ...f, outcome: e.target.value }))}
                  className={pm.input}
                  rows={4}
                />
              </div>
              <p className="text-[10px] text-slate-400">
                Step 1: Save actions taken. Step 2: Add results to mark engagement as completed.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end pt-2 flex-wrap">
          <button type="button" onClick={closeEngagementModal} className={pm.btnCancel}>Cancel</button>
          {engagementModal?.tab === 'plan' ? (
            <>
              <button type="button" onClick={() => void handleSavePlan(false)} className={pm.btnSave}>
                {engagementModal.mode === 'edit' ? 'Save Plan' : 'Save'}
              </button>
              {engagementModal.mode === 'create' && filterMode === 'hierarchy' && nextAssignment && (
                <button
                  type="button"
                  onClick={() => void handleSavePlan(true)}
                  className={pm.btnPrimary}
                >
                  Save &amp; create next class
                </button>
              )}
            </>
          ) : (
            <button type="button" onClick={() => void handleSaveResults()} className={pm.btnSave}>
              {form.outcome.trim() ? 'Save Results & Complete' : 'Save Actions'}
            </button>
          )}
        </div>
      </ParentModal>
    </ParentPageShell>
  );
}
