import { SubModuleView } from './shared/SubModuleView';
import { MarksEntryView } from './ExaminationManagement/MarksEntryView';
import { ExamDashboardView } from './ExaminationManagement/ExamDashboardView';
import { ExamScheduleView } from './ExaminationManagement/ExamScheduleView';
import { SubjectsSyllabusView } from './ExaminationManagement/SubjectsSyllabusView';
import { QuestionBankView } from './ExaminationManagement/QuestionBankView';
import { PaperManagementView } from './ExaminationManagement/PaperManagementView';
import { SeatingArrangementView } from './ExaminationManagement/SeatingArrangementView';
import { InvigilationManagementView } from './ExaminationManagement/InvigilationManagementView';
import { ResultProcessingView } from './ExaminationManagement/ResultProcessingView';
import { ReportCardsView } from './ExaminationManagement/ReportCardsView';
import { RevaluationRecheckView } from './ExaminationManagement/RevaluationRecheckView';
import { GradePromotionView } from './ExaminationManagement/GradePromotionView';
import { CertificatesView } from './ExaminationManagement/CertificatesView';
import { ExamAnalyticsView } from './ExaminationManagement/ExamAnalyticsView';

type Props = {
  currentView?: string;
  onNavigate?: (view: string) => void;
};

export function ExaminationManagementCRM({ currentView = 'Exam Dashboard', onNavigate }: Props) {
  switch (currentView) {
    case 'Exam Dashboard':
      return <ExamDashboardView onNavigate={onNavigate} />;
    case 'Exam Schedule':
      return <ExamScheduleView />;
    case 'Subjects & Syllabus':
      return <SubjectsSyllabusView />;
    case 'Question Bank':
      return <QuestionBankView />;
    case 'Paper Management':
      return <PaperManagementView />;
    case 'Seating Arrangement':
      return <SeatingArrangementView />;
    case 'Invigilation Management':
      return <InvigilationManagementView />;
    case 'Marks Entry':
      return <MarksEntryView />;
    case 'Result Processing':
      return <ResultProcessingView />;
    case 'Report Cards':
      return <ReportCardsView />;
    case 'Revaluation / Recheck':
      return <RevaluationRecheckView />;
    case 'Grade & Promotion':
      return <GradePromotionView />;
    case 'Certificates':
      return <CertificatesView />;
    case 'Exam Analytics':
      return <ExamAnalyticsView />;
    default:
      return <SubModuleView module="Examination Management" title={currentView} />;
  }
}
