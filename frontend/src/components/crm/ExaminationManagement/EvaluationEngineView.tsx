import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Settings, Scale, Trophy, Calendar, CheckCircle2 } from 'lucide-react';
import {
  fetchEvaluationEngine,
  syncEvaluationEngine,
  type EvaluationEngineOverview,
} from '../../../lib/examinationServices';
import {
  AcademicLoading, AcademicPageHeader, AcademicPageShell, am,
} from '../AcademicManagement/AcademicManagementUi';

function ConfigCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={`${am.card} p-4 space-y-2`}>
      <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
        {icon}
        {title}
      </div>
      <div className="text-xs text-slate-600 space-y-1">{children}</div>
    </div>
  );
}

export function EvaluationEngineView() {
  const [data, setData] = useState<EvaluationEngineOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [academicYear, setAcademicYear] = useState('2025-26');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchEvaluationEngine(academicYear);
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [academicYear]);

  useEffect(() => { void load(); }, [load]);

  const handleSync = async () => {
    const res = await syncEvaluationEngine(academicYear);
    setMessage(`Evaluation engine synced for ${res.academicYear}. Weightage valid: ${res.weightageValidation?.valid ? 'Yes' : 'No'}`);
    void load();
  };

  if (loading && !data) return <AcademicLoading label="Loading evaluation engine…" />;

  const mc = data?.marksConfig;
  const gr = data?.gradingRule;
  const gpa = data?.gpaScale;
  const rank = data?.rankConfig;
  const periods = data?.examPeriods || [];

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Examination Management › Evaluation Engine"
        title="Examination & Evaluation Engine"
        subtitle="Marks configuration, pass/fail rules, GPA scales, ranking logic, and examination periods — synced from Institution Setup"
        actions={(
          <button type="button" onClick={() => void handleSync()} className={am.btnSecondary}>
            <RefreshCw size={14} /> Sync from Setup
          </button>
        )}
      />

      <div className={am.content}>
        <div className="flex items-center gap-3 mb-4">
          <label className="text-xs font-semibold text-slate-600">Academic Year</label>
          <input
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className={am.input}
            style={{ width: 120 }}
          />
          <button type="button" onClick={() => void load()} className={am.btnSecondary}>Load</button>
        </div>

        {message && (
          <div className="mb-4 px-4 py-2 bg-teal-50 text-teal-800 text-sm rounded-lg border border-teal-200 flex items-center gap-2">
            <CheckCircle2 size={16} />
            {message}
          </div>
        )}

        <p className="text-xs text-slate-500 mb-4">
          Configure in <strong>Institution Setup → Grade &amp; Marks Setup</strong> and <strong>Session &amp; Term Setup → Examination Periods</strong>, then save or sync here.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <ConfigCard title="Marks Configuration" icon={<Settings size={16} className="text-blue-600" />}>
            <p>Max marks: <strong>{mc?.maxMarks ?? '—'}</strong></p>
            <p>Grace marks: <strong>{mc?.graceMarks ?? 0}</strong></p>
            <p>Weightage: <strong>{mc?.weightageEnabled ? 'Enabled' : 'Disabled'}</strong></p>
            <p>Rules locked: <strong>{mc?.rulesLocked ? 'Yes' : 'No'}</strong></p>
            <p>Weightage valid: <strong>{mc?.weightageSumValid ? 'Yes' : 'No'}</strong></p>
          </ConfigCard>

          <ConfigCard title="Pass / Fail Criteria" icon={<Scale size={16} className="text-amber-600" />}>
            <p>Pass marks: <strong>{gr?.passMarks ?? '—'}%</strong></p>
            <p>Min pass grade: <strong>{gr?.passGrade ?? '—'}</strong></p>
            <p>Aggregated pass: <strong>{gr?.aggregatedPassPercent ?? '—'}%</strong></p>
            <p>Min component pass: <strong>{gr?.minComponentPassPercent ?? '—'}%</strong></p>
            <p>Rules active: <strong>{gr?.rulesActive ? 'Yes' : 'No'}</strong></p>
          </ConfigCard>

          <ConfigCard title="GPA / CGPA Settings" icon={<Scale size={16} className="text-purple-600" />}>
            <p>Scale: <strong>{gpa?.scaleType ?? '—'}</strong></p>
            <p>Grade bands: <strong>{Array.isArray(gpa?.resolvedMatrix) ? gpa.resolvedMatrix.length : (Array.isArray(gpa?.gradeMatrix) ? gpa.gradeMatrix.length : 0)}</strong></p>
            {gpa?.formulaNotes && <p className="text-slate-500">{gpa.formulaNotes}</p>}
          </ConfigCard>

          <ConfigCard title="Rank Configuration" icon={<Trophy size={16} className="text-orange-600" />}>
            <p>Method: <strong>{rank?.rankMethod ?? '—'}</strong></p>
            <p>Tie rule: <strong>{rank?.tieRule ?? '—'}</strong></p>
            <p>Scope: <strong>{rank?.rankScope ?? '—'}</strong></p>
            <p>Exempted subjects: <strong>{Array.isArray(rank?.exemptedSubjects) ? (rank.exemptedSubjects as string[]).join(', ') || 'None' : 'None'}</strong></p>
          </ConfigCard>

          <ConfigCard title="Examination Periods" icon={<Calendar size={16} className="text-teal-600" />}>
            {periods.length === 0 ? (
              <p>No periods configured. Add in Session &amp; Term Setup.</p>
            ) : (
              <ul className="space-y-2">
                {periods.map((p) => (
                  <li key={p.id} className="border-b border-slate-100 pb-1">
                    <strong>{p.periodName}</strong>
                    <br />
                    {new Date(p.startDate).toLocaleDateString()} – {new Date(p.endDate).toLocaleDateString()}
                    {p.marksEntryDeadline && (
                      <span className="block text-slate-500">Entry deadline: {new Date(p.marksEntryDeadline).toLocaleDateString()}</span>
                    )}
                    {p.isPublished && <span className="text-green-700 font-semibold">Published</span>}
                  </li>
                ))}
              </ul>
            )}
          </ConfigCard>
        </div>
      </div>
    </AcademicPageShell>
  );
}
