import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ClipboardCheck, Download, FileSpreadsheet, Loader2, Plus, RefreshCw, Save, Send, Upload,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  bulkUploadSubjectAssignments,
  createSubjectTeacherAssignment,
  fetchMarkingSheet,
  fetchMarksEntryMeta,
  fetchSubjectTeacherAssignments,
  saveMarkingDraft,
  seedMarksEntry,
  submitMarkingSheet,
  type ExamMarksColumnKey,
  type MarkingSheet,
  type SubjectTeacherAssignment,
} from '../../../lib/examinationServices';
import { downloadExaminerMarkSheetPdf } from '../../../lib/examMarksSheetPdf';
import { ClassTestsMarksEntryView } from './ClassTestsMarksEntryView';
import { AcademicLoading, AcademicModal, AcademicPageHeader, AcademicPageShell, am } from '../AcademicManagement/AcademicManagementUi';

type Tab = 'marks' | 'assignments' | 'class-tests';

export function MarksEntryView() {
  const [tab, setTab] = useState<Tab>('marks');
  const [meta, setMeta] = useState<Awaited<ReturnType<typeof fetchMarksEntryMeta>> | null>(null);
  const [assignments, setAssignments] = useState<SubjectTeacherAssignment[]>([]);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<MarkingSheet | null>(null);
  const [grid, setGrid] = useState<MarkingSheet['rows']>([]);
  const [loading, setLoading] = useState(true);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [bulkResult, setBulkResult] = useState<Awaited<ReturnType<typeof bulkUploadSubjectAssignments>> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    className: '', sectionName: '', subjectName: '', teacherName: '',
    teacherEmail: '', examinationName: 'Annual Examination',
    assignedColumns: [] as ExamMarksColumnKey[],
  });

  const sectionOptions = useMemo(() => {
    if (!meta) return [];
    if (!form.className) return [...new Set(Object.values(meta.sectionsByClass).flat())].sort();
    return meta.sectionsByClass[form.className] || [];
  }, [meta, form.className]);

  const selectedAssignment = useMemo(
    () => assignments.find((a) => a.id === selectedAssignmentId) ?? null,
    [assignments, selectedAssignmentId],
  );

  const enabledColumns = useMemo(
    () => sheet?.columns.filter((c) => c.enabled) ?? [],
    [sheet],
  );

  const loadAssignments = useCallback(async (year?: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      let m = meta;
      if (!m) {
        m = await fetchMarksEntryMeta();
        setMeta(m);
        setAcademicYear(m.defaultAcademicYear);
      }
      const yearFilter = year || academicYear || m.defaultAcademicYear;
      let data = await fetchSubjectTeacherAssignments(yearFilter);
      if (!data.assignments.length) {
        await seedMarksEntry(yearFilter);
        data = await fetchSubjectTeacherAssignments(yearFilter);
      }
      setAssignments(data.assignments);
      if (!selectedAssignmentId && data.assignments.length) {
        setSelectedAssignmentId(data.assignments[0].id);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  }, [meta, academicYear, selectedAssignmentId]);

  const loadSheet = useCallback(async (assignment: SubjectTeacherAssignment) => {
    if (!assignment.sheetId) return;
    setSheetLoading(true);
    try {
      const data = await fetchMarkingSheet(assignment.sheetId);
      setSheet(data);
      setGrid(data.rows);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load marking sheet');
    } finally {
      setSheetLoading(false);
    }
  }, []);

  useEffect(() => { void loadAssignments(); }, [loadAssignments]);

  useEffect(() => {
    if (selectedAssignment?.sheetId) void loadSheet(selectedAssignment);
    else {
      setSheet(null);
      setGrid([]);
    }
  }, [selectedAssignment, loadSheet]);

  const updateCell = (
    studentId: string,
    columnKey: ExamMarksColumnKey,
    field: 'marksObtained' | 'isAbsent' | 'graceMarks' | 'remarks',
    value: string | number | boolean,
  ) => {
    setGrid((rows) => rows.map((row) => {
      if (row.studentId !== studentId) return row;
      const columns = row.columns.map((col) => {
        if (col.key !== columnKey || !col.enabled) return col;
        if (field === 'marksObtained') {
          return { ...col, marksObtained: value === '' ? null : Number(value), isAbsent: false };
        }
        if (field === 'isAbsent') {
          return { ...col, isAbsent: Boolean(value), marksObtained: value ? null : col.marksObtained };
        }
        if (field === 'graceMarks') {
          return { ...col, graceMarks: Number(value) || 0 };
        }
        return { ...col, remarks: String(value) };
      });
      const totalObtained = columns.reduce((sum, c) => {
        if (!c.enabled || c.isAbsent) return sum;
        return sum + (c.marksObtained ?? 0) + c.graceMarks;
      }, 0);
      const totalMax = columns.filter((c) => c.enabled).reduce((s, c) => s + c.maxMarks, 0);
      const pct = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
      const overallGrade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : pct >= 36 ? 'D' : 'F';
      return { ...row, columns, totalObtained: Math.round(totalObtained * 100) / 100, totalMax, overallGrade };
    }));
  };

  const buildEntries = () => grid.flatMap((row) =>
    row.columns.filter((c) => c.enabled).map((c) => ({
      studentId: row.studentId,
      columnKey: c.key,
      marksObtained: c.marksObtained,
      isAbsent: c.isAbsent,
      graceMarks: c.graceMarks,
      remarks: c.remarks,
    })),
  );

  const handleSaveDraft = async () => {
    if (!sheet) return;
    setActionLoading(true);
    try {
      const result = await saveMarkingDraft(sheet.sheet.id, buildEntries());
      setSuccessMsg(result.message);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!sheet) return;
    setActionLoading(true);
    try {
      await saveMarkingDraft(sheet.sheet.id, buildEntries());
      const result = await submitMarkingSheet(sheet.sheet.id);
      setSuccessMsg(result.message);
      downloadExaminerMarkSheetPdf(result.pdfData);
      await loadAssignments(academicYear);
      if (selectedAssignment) await loadSheet(selectedAssignment);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateAssignment = async () => {
    if (!form.assignedColumns.length) return setErrorMsg('Select at least one marks column');
    setActionLoading(true);
    try {
      const teacher = meta?.teachers.find((t) => t.teacherName === form.teacherName);
      await createSubjectTeacherAssignment({
        academicYear,
        className: form.className,
        sectionName: form.sectionName,
        subjectName: form.subjectName,
        teacherName: form.teacherName,
        teacherEmail: form.teacherEmail || teacher?.email,
        examinationName: form.examinationName,
        assignedColumns: form.assignedColumns,
      });
      setAssignOpen(false);
      setSuccessMsg('Teacher assigned — students auto-mapped to marking sheet');
      await loadAssignments(academicYear);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Assignment failed');
    } finally {
      setActionLoading(false);
    }
  };

  const downloadTemplate = () => {
    const headers = meta?.bulkTemplateColumns || [
      'academicYear', 'className', 'sectionName', 'subjectName',
      'teacherName', 'teacherEmail', 'teacherPhone', 'examinationName', 'assignedColumns',
    ];
    const sample = [{
      academicYear: '2025-26',
      className: 'Class 10',
      sectionName: 'A',
      subjectName: 'Mathematics',
      teacherName: 'Mr. Sharma',
      teacherEmail: 'sharma@school.edu',
      teacherPhone: '9876543210',
      examinationName: 'Annual Examination',
      assignedColumns: 'UNIT_1,UNIT_2,HALF_YEARLY',
    }];
    const ws = XLSX.utils.json_to_sheet(sample, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Assignments');
    XLSX.writeFile(wb, 'Subject_Teacher_Assignment_Template.xlsx');
  };

  const handleBulkUpload = async (file: File) => {
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws);
    setActionLoading(true);
    try {
      const result = await bulkUploadSubjectAssignments(rows);
      setBulkResult(result);
      setSuccessMsg(`Bulk upload: ${result.created} created, ${result.updated} updated`);
      await loadAssignments(academicYear);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Bulk upload failed');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleColumn = (key: ExamMarksColumnKey) => {
    setForm((f) => ({
      ...f,
      assignedColumns: f.assignedColumns.includes(key)
        ? f.assignedColumns.filter((k) => k !== key)
        : [...f.assignedColumns, key],
    }));
  };

  if (loading && !assignments.length && tab !== 'class-tests') {
    return <AcademicPageShell><AcademicLoading label="Loading marks entry…" /></AcademicPageShell>;
  }

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Examination Management › Marks Entry"
        title="Marks Entry"
        subtitle="Subject-wise marks grid — only assigned columns enabled per teacher. Auto-maps students on assignment."
        actions={(
          <div className="flex flex-wrap gap-2">
            <select className={am.select} value={academicYear} onChange={(e) => { setAcademicYear(e.target.value); void loadAssignments(e.target.value); }}>
              {(meta?.academicYears || [academicYear]).map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button type="button" className={am.btnSecondary} onClick={() => void loadAssignments(academicYear)}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        )}
      />

      <div className={am.content}>
        {errorMsg && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{errorMsg}</p>}
        {successMsg && (
          <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
            {successMsg}
            <button type="button" className="ml-2 underline" onClick={() => setSuccessMsg(null)}>Dismiss</button>
          </p>
        )}

        <div className="flex gap-1 border-b border-slate-200">
          {([
            ['marks', 'Exam Marks Entry'],
            ['assignments', 'Subject Teacher Assignment'],
            ['class-tests', 'Class Tests'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition ${
                tab === id ? 'border-amber-400 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'class-tests' && <ClassTestsMarksEntryView embedded />}

        {tab === 'assignments' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <button type="button" className={am.btnPrimary} onClick={() => setAssignOpen(true)}>
                <Plus size={14} /> Assign Teacher
              </button>
              <button type="button" className={am.btnSecondary} onClick={downloadTemplate}>
                <Download size={14} /> Download Excel Template
              </button>
              <button type="button" className={am.btnSecondary} onClick={() => fileRef.current?.click()}>
                <Upload size={14} /> Bulk Excel Upload
              </button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleBulkUpload(f);
                e.target.value = '';
              }} />
            </div>

            {bulkResult && bulkResult.errors.length > 0 && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3">
                <p className="font-semibold mb-1">Upload validation errors:</p>
                {bulkResult.errors.map((e) => <p key={e.row}>Row {e.row}: {e.message}</p>)}
              </div>
            )}

            <div className={am.tableWrap}>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={am.th}>Teacher</th>
                    <th className={am.th}>Class</th>
                    <th className={am.th}>Subject</th>
                    <th className={am.th}>Assigned Columns</th>
                    <th className={am.th}>Students</th>
                    <th className={am.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/50">
                      <td className={am.td}>
                        <p className="font-semibold text-sm">{a.teacherName}</p>
                        <p className="text-xs text-slate-400">{a.teacherEmail}</p>
                      </td>
                      <td className={am.td}>{a.classGroup}</td>
                      <td className={am.td}>{a.subjectName}</td>
                      <td className={am.td}>
                        <div className="flex flex-wrap gap-1">
                          {a.assignedColumnLabels.map((l) => (
                            <span key={l} className="text-[10px] bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded">{l}</span>
                          ))}
                        </div>
                      </td>
                      <td className={am.td}>{a.studentCount}</td>
                      <td className={am.td}>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                          a.sheetStatus === 'SUBMITTED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {a.sheetStatus || 'DRAFT'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'marks' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-3 space-y-2">
              <h3 className="text-sm font-semibold text-slate-700">My Assignments</h3>
              {assignments.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedAssignmentId(a.id)}
                  className={`w-full text-left p-3 rounded-lg border text-sm ${
                    selectedAssignmentId === a.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <p className="font-medium">{a.subjectName}</p>
                  <p className="text-xs text-slate-500">{a.classGroup} · {a.teacherName}</p>
                  <p className="text-xs text-slate-400">{a.assignedColumnLabels.join(', ')}</p>
                </button>
              ))}
            </div>

            <div className="lg:col-span-9">
              {sheetLoading && <AcademicLoading label="Loading marks grid…" />}
              {!sheetLoading && sheet && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{sheet.sheet.examinationName}</h3>
                      <p className="text-xs text-slate-500">
                        {sheet.sheet.classGroup} · {sheet.sheet.subjectName} · Examiner: {sheet.sheet.teacherName}
                      </p>
                    </div>
                    {!sheet.sheet.isSubmitted && (
                      <div className="flex gap-2">
                        <button type="button" className={am.btnSecondary} disabled={actionLoading} onClick={() => void handleSaveDraft()}>
                          {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                          Save Draft
                        </button>
                        <button type="button" className={am.btnPrimary} disabled={actionLoading} onClick={() => void handleSubmit()}>
                          <Send size={14} /> Submit & Generate PDF
                        </button>
                      </div>
                    )}
                    {sheet.sheet.isSubmitted && (
                      <span className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full font-semibold">
                        Submitted {sheet.sheet.submittedAt ? new Date(sheet.sheet.submittedAt).toLocaleString() : ''}
                      </span>
                    )}
                  </div>

                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-sky-100 text-slate-800">
                          <th className="border border-white px-2 py-1.5 text-left text-xs font-bold min-w-[140px]">Max. Marks</th>
                          {sheet.columns.map((col) => (
                            <th key={col.key} className={`border border-white px-2 py-1.5 text-center text-xs font-bold min-w-[72px] ${!col.enabled ? 'opacity-30' : ''}`}>
                              {col.enabled ? col.maxMarks : '—'}
                            </th>
                          ))}
                          <th className="border border-white px-2 py-1.5 text-center text-xs font-bold bg-sky-200">
                            {sheet.enabledMaxTotal}
                          </th>
                        </tr>
                        <tr className="bg-sky-50 text-slate-700">
                          <th className="border border-white px-2 py-1.5 text-left text-xs font-semibold">Student Name</th>
                          {sheet.columns.map((col) => (
                            <th key={col.key} className={`border border-white px-2 py-1.5 text-center text-[10px] font-semibold ${!col.enabled ? 'opacity-30' : ''}`}>
                              {col.label}
                            </th>
                          ))}
                          <th className="border border-white px-2 py-1.5 text-center text-xs font-semibold bg-sky-100">Total marks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grid.map((row) => (
                          <tr key={row.studentId} className="hover:bg-slate-50">
                            <td className="border border-slate-200 px-2 py-1">
                              <div className="font-medium text-xs">{row.studentName}</div>
                              <div className="text-[10px] text-slate-400">{row.admissionNumber}</div>
                            </td>
                            {row.columns.map((col) => (
                              <td key={col.key} className={`border border-slate-200 px-1 py-0.5 ${!col.enabled ? 'bg-slate-50' : ''}`}>
                                {col.enabled && !sheet.sheet.isSubmitted ? (
                                  <div className="space-y-0.5">
                                    <input
                                      type="number"
                                      min={0}
                                      max={col.maxMarks}
                                      disabled={col.isAbsent}
                                      value={col.marksObtained ?? ''}
                                      onChange={(e) => updateCell(row.studentId, col.key, 'marksObtained', e.target.value)}
                                      className="w-full text-center text-xs border rounded px-1 py-0.5"
                                      placeholder="—"
                                    />
                                    <label className="flex items-center justify-center gap-0.5 text-[9px] text-slate-500">
                                      <input type="checkbox" checked={col.isAbsent} onChange={(e) => updateCell(row.studentId, col.key, 'isAbsent', e.target.checked)} />
                                      AB
                                    </label>
                                  </div>
                                ) : col.enabled ? (
                                  <span className="text-xs block text-center">{col.isAbsent ? 'AB' : (col.marksObtained ?? '—')}</span>
                                ) : (
                                  <span className="text-xs block text-center text-slate-300">—</span>
                                )}
                              </td>
                            ))}
                            <td className="border border-slate-200 px-2 py-1 text-center font-bold text-xs bg-slate-50">
                              {row.totalObtained}
                              <div className="text-[10px] font-normal text-slate-500">{row.overallGrade}</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-sky-50">
                          <td colSpan={sheet.columns.length + 2} className="border border-slate-200 px-2 py-1 text-right text-xs font-bold text-slate-600">
                            AUTO TOTAL MAX MARKS: {sheet.allMaxTotal} · Enabled Max: {sheet.enabledMaxTotal}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <ClipboardCheck size={12} />
                    Disabled columns are not assigned to this teacher. Students are auto-mapped from class & section.
                  </p>
                </div>
              )}
              {!sheetLoading && !sheet && (
                <div className="border rounded-lg p-8 text-center text-slate-500">
                  Select an assignment to enter marks
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <AcademicModal open={assignOpen} onClose={() => setAssignOpen(false)} title="Subject Teacher Assignment" large>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Assign a teacher to class, section & subject. Students are automatically mapped — no manual allocation needed.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-slate-600">Class</span>
              <select className={am.select} value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value, sectionName: '' })}>
                <option value="">Select</option>
                {(meta?.classes || []).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-slate-600">Section</span>
              <select className={am.select} value={form.sectionName} onChange={(e) => setForm({ ...form, sectionName: e.target.value })}>
                <option value="">Select</option>
                {sectionOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-slate-600">Subject</span>
              <select className={am.select} value={form.subjectName} onChange={(e) => setForm({ ...form, subjectName: e.target.value })}>
                <option value="">Select</option>
                {(meta?.subjects || []).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-slate-600">Teacher</span>
              <select className={am.select} value={form.teacherName} onChange={(e) => {
                const t = meta?.teachers.find((x) => x.teacherName === e.target.value);
                setForm({ ...form, teacherName: e.target.value, teacherEmail: t?.email || '' });
              }}>
                <option value="">Select</option>
                {(meta?.teachers || []).map((t) => <option key={t.id} value={t.teacherName}>{t.teacherName}</option>)}
              </select>
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs text-slate-600">Examination Name</span>
              <input className={am.input} value={form.examinationName} onChange={(e) => setForm({ ...form, examinationName: e.target.value })} />
            </label>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2">Assigned Marks Columns (only these will be enabled for entry)</p>
            <div className="flex flex-wrap gap-2">
              {(meta?.columns || []).map((col) => (
                <button
                  key={col.key}
                  type="button"
                  onClick={() => toggleColumn(col.key)}
                  className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition ${
                    form.assignedColumns.includes(col.key)
                      ? 'bg-blue-100 border-blue-300 text-blue-800'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  {col.label} ({col.maxMarks})
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" className={am.btnSecondary} onClick={() => setAssignOpen(false)}>Cancel</button>
            <button type="button" className={am.btnPrimary} disabled={actionLoading} onClick={() => void handleCreateAssignment()}>
              {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
              Assign & Map Students
            </button>
          </div>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
