import { lazy, Suspense, type ReactNode } from 'react';
import { SubModuleView } from './shared/SubModuleView';

const MarksEntryView = lazy(() =>
  import('./ExaminationManagement/MarksEntryView').then((m) => ({ default: m.MarksEntryView })),
);
const ExamDashboardView = lazy(() =>
  import('./ExaminationManagement/ExamDashboardView').then((m) => ({ default: m.ExamDashboardView })),
);
const ExamScheduleView = lazy(() =>
  import('./ExaminationManagement/ExamScheduleView').then((m) => ({ default: m.ExamScheduleView })),
);
const SubjectsSyllabusView = lazy(() =>
  import('./ExaminationManagement/SubjectsSyllabusView').then((m) => ({ default: m.SubjectsSyllabusView })),
);
const QuestionBankView = lazy(() =>
  import('./ExaminationManagement/QuestionBankView').then((m) => ({ default: m.QuestionBankView })),
);
const PaperManagementView = lazy(() =>
  import('./ExaminationManagement/PaperManagementView').then((m) => ({ default: m.PaperManagementView })),
);
const SeatingArrangementView = lazy(() =>
  import('./ExaminationManagement/SeatingArrangementView').then((m) => ({ default: m.SeatingArrangementView })),
);
const InvigilationManagementView = lazy(() =>
  import('./ExaminationManagement/InvigilationManagementView').then((m) => ({ default: m.InvigilationManagementView })),
);
const ResultProcessingView = lazy(() =>
  import('./ExaminationManagement/ResultProcessingView').then((m) => ({ default: m.ResultProcessingView })),
);
const ReportCardsView = lazy(() =>
  import('./ExaminationManagement/ReportCardsView').then((m) => ({ default: m.ReportCardsView })),
);
const RevaluationRecheckView = lazy(() =>
  import('./ExaminationManagement/RevaluationRecheckView').then((m) => ({ default: m.RevaluationRecheckView })),
);
const GradePromotionView = lazy(() =>
  import('./ExaminationManagement/GradePromotionView').then((m) => ({ default: m.GradePromotionView })),
);
const CertificatesView = lazy(() =>
  import('./ExaminationManagement/CertificatesView').then((m) => ({ default: m.CertificatesView })),
);
const ExamAnalyticsView = lazy(() =>
  import('./ExaminationManagement/ExamAnalyticsView').then((m) => ({ default: m.ExamAnalyticsView })),
);
const EvaluationEngineView = lazy(() =>
  import('./ExaminationManagement/EvaluationEngineView').then((m) => ({ default: m.EvaluationEngineView })),
);

type Props = {
  currentView?: string;
  onNavigate?: (view: string) => void;
};

function wrap(node: ReactNode) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[30vh] text-sm text-slate-400">Loading page…</div>}>
      {node}
    </Suspense>
  );
}

export function ExaminationManagementCRM({ currentView = 'Exam Dashboard', onNavigate }: Props) {
  switch (currentView) {
    case 'Exam Dashboard':
      return wrap(<ExamDashboardView onNavigate={onNavigate} />);
    case 'Exam Schedule':
      return wrap(<ExamScheduleView />);
    case 'Subjects & Syllabus':
      return wrap(<SubjectsSyllabusView />);
    case 'Question Bank':
      return wrap(<QuestionBankView />);
    case 'Paper Management':
      return wrap(<PaperManagementView />);
    case 'Seating Arrangement':
      return wrap(<SeatingArrangementView />);
    case 'Invigilation Management':
      return wrap(<InvigilationManagementView />);
    case 'Marks Entry':
      return wrap(<MarksEntryView />);
    case 'Result Processing':
      return wrap(<ResultProcessingView />);
    case 'Report Cards':
      return wrap(<ReportCardsView />);
    case 'Revaluation / Recheck':
      return wrap(<RevaluationRecheckView />);
    case 'Grade & Promotion':
      return wrap(<GradePromotionView />);
    case 'Certificates':
      return wrap(<CertificatesView />);
    case 'Exam Analytics':
      return wrap(<ExamAnalyticsView />);
    case 'Evaluation Engine':
      return wrap(<EvaluationEngineView />);
    default:
      return <SubModuleView module="Examination Management" title={currentView} />;
  }
}
