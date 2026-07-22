import { useCallback, useEffect, useState } from 'react';
import { ClipboardCheck, Save } from 'lucide-react';
import {
  fetchClassTestDetail, fetchClassTests, submitClassTestScores, type ClassTest,
} from '../../../lib/academicServices';
import { fetchStudents } from '../../../lib/studentServices';
import { AcademicLoading, AcademicModal, AcademicPageHeader, AcademicPageShell, am } from '../AcademicManagement/AcademicManagementUi';

const BUCKET_COLORS = {
  excellent: 'bg-green-100 text-green-800',
  good: 'bg-blue-100 text-blue-800',
  average: 'bg-amber-100 text-amber-800',
  below: 'bg-red-100 text-red-800',
};

export function ClassTestsMarksEntryView() {
  const [records, setRecords] = useState<ClassTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [message, setMessage] = useState('');
  const [activeTest, setActiveTest] = useState<ClassTest | null>(null);
  const [scoreRows, setScoreRows] = useState<{ studentId: string; fullName: string; marks: string }[]>([]);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRecords((await fetchClassTests({ academicYear })).records);
    } finally { setLoading(false); }
  }, [academicYear]);

  useEffect(() => { void load(); }, [load]);

  const openMarks = async (test: ClassTest) => {
    setActiveTest(test);
    const [students, detail] = await Promise.all([
      fetchStudents({ className: test.className, sectionName: test.sectionName, viewAll: true, pageSize: 200 }),
      fetchClassTestDetail(test.id),
    ]);
    const scoreMap = new Map(detail.scores.map((s) => [s.studentId, String(s.marksObtained)]));
    setScoreRows(students.students.map((s) => ({ studentId: s.id, fullName: s.fullName, marks: scoreMap.get(s.id) || '' })));
    setShowModal(true);
  };

  const saveMarks = async () => {
    if (!activeTest) return;
    const scores = scoreRows.filter((r) => r.marks !== '').map((r) => ({ studentId: r.studentId, marksObtained: Number(r.marks) }));
    const res = await submitClassTestScores(activeTest.id, scores);
    setMessage(`Marks saved for ${res.upserted} students. Results published to student & parent mobile analytics.`);
    setShowModal(false);
    void load();
  };

  if (loading) return <AcademicLoading label="Loading class tests from lesson plans…" />;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Examination Management › Marks Entry › Class Tests"
        title="Class Test Marks Entry"
        subtitle="Class tests synced from Lesson Planning — enter marks to reflect results on lesson plans and mobile analytics"
      />
      <div className={am.content}>
        {message && <p className={am.message}>{message}</p>}

        <div className={am.filterBar}>
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className={am.select}>
            <option>2025-26</option><option>2024-25</option>
          </select>
          <span className="text-xs text-slate-500">{records.length} class test(s) from lesson plans</span>
        </div>

        <div className={am.tableWrap}>
          <table className="w-full">
            <thead><tr>
              <th className={am.th}>Test</th><th className={am.th}>Class</th><th className={am.th}>Subject</th>
              <th className={am.th}>Teacher</th><th className={am.th}>Max Marks</th><th className={am.th}>Status</th>
              <th className={am.th}>Result Buckets</th><th className={am.th} />
            </tr></thead>
            <tbody>
              {records.map((t) => (
                <tr key={t.id}>
                  <td className={am.td}><span className="font-semibold">{t.title}</span><p className="text-xs text-slate-400">{t.lessonPlanTitle}</p></td>
                  <td className={am.td}>{t.classGroup}</td>
                  <td className={am.td}>{t.subjectName}</td>
                  <td className={am.td}>{t.teacherName}</td>
                  <td className={am.td}>{t.maxMarks}</td>
                  <td className={am.td}><span className={`text-xs font-bold px-2 py-0.5 rounded ${t.status === 'Conducted' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{t.status}</span></td>
                  <td className={am.td}>
                    <div className="flex flex-wrap gap-1 text-[10px]">
                      <span className={`px-1.5 py-0.5 rounded ${BUCKET_COLORS.excellent}`}>80–100%: {t.resultBuckets.excellent}</span>
                      <span className={`px-1.5 py-0.5 rounded ${BUCKET_COLORS.good}`}>60–79%: {t.resultBuckets.good}</span>
                      <span className={`px-1.5 py-0.5 rounded ${BUCKET_COLORS.average}`}>36–59%: {t.resultBuckets.average}</span>
                      <span className={`px-1.5 py-0.5 rounded ${BUCKET_COLORS.below}`}>&lt;36%: {t.resultBuckets.below}</span>
                    </div>
                  </td>
                  <td className={am.td}>
                    <button type="button" onClick={() => void openMarks(t)} className={`${am.btnPrimary} text-xs py-1 px-2`}>
                      <ClipboardCheck size={12} /> Enter Marks
                    </button>
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr><td colSpan={8} className={`${am.td} text-center text-slate-400`}>No class tests yet. Create lesson plans with &quot;Auto-create Class Test&quot; in Academic Management → Lesson Planning.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AcademicModal open={showModal} onClose={() => setShowModal(false)} title={`Marks Entry — ${activeTest?.title || ''}`} large>
        <p className="text-xs text-slate-500">Max marks: {activeTest?.maxMarks}. Results bucket: 80–100% / 60–79.99% / 36–59.99% / below 36%</p>
        <div className="max-h-72 overflow-y-auto space-y-1">
          {scoreRows.map((r) => (
            <div key={r.studentId} className="flex items-center gap-2 text-sm">
              <span className="flex-1">{r.fullName}</span>
              <input type="number" min={0} max={activeTest?.maxMarks || 100} value={r.marks}
                onChange={(e) => setScoreRows((rows) => rows.map((x) => x.studentId === r.studentId ? { ...x, marks: e.target.value } : x))}
                className={`${am.input} w-24`} placeholder="Marks" />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => setShowModal(false)} className={am.btnSecondary}>Cancel</button>
          <button type="button" onClick={() => void saveMarks()} className={am.btnPrimary}><Save size={14} /> Save & Sync Analytics</button>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
