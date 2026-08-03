import { lazy, Suspense, type ReactNode } from 'react';

const AcademicDashboardView = lazy(() =>
  import('./AcademicManagement/AcademicDashboardView').then((m) => ({ default: m.AcademicDashboardView })),
);
const ClassSectionsView = lazy(() =>
  import('./AcademicManagement/ClassSectionsView').then((m) => ({ default: m.ClassSectionsView })),
);
const CurriculumSyllabusView = lazy(() =>
  import('./AcademicManagement/CurriculumSyllabusView').then((m) => ({ default: m.CurriculumSyllabusView })),
);
const TimetableView = lazy(() =>
  import('./AcademicManagement/TimetableView').then((m) => ({ default: m.TimetableView })),
);
const LessonPlanningView = lazy(() =>
  import('./AcademicManagement/LessonPlanningView').then((m) => ({ default: m.LessonPlanningView })),
);
const HomeworkView = lazy(() =>
  import('./AcademicManagement/HomeworkView').then((m) => ({ default: m.HomeworkView })),
);
const AcademicCalendarView = lazy(() =>
  import('./AcademicManagement/AcademicCalendarView').then((m) => ({ default: m.AcademicCalendarView })),
);
const ContinuousEvaluationView = lazy(() =>
  import('./AcademicManagement/ContinuousEvaluationView').then((m) => ({ default: m.ContinuousEvaluationView })),
);
const SubjectManagementView = lazy(() =>
  import('./AcademicManagement/SubjectManagementView').then((m) => ({ default: m.SubjectManagementView })),
);
const CoScholasticView = lazy(() =>
  import('./AcademicManagement/CoScholasticView').then((m) => ({ default: m.CoScholasticView })),
);
const TeacherAllocationView = lazy(() =>
  import('./AcademicManagement/TeacherAllocationView').then((m) => ({ default: m.TeacherAllocationView })),
);
const AcademicReportsView = lazy(() =>
  import('./AcademicManagement/AcademicReportsView').then((m) => ({ default: m.AcademicReportsView })),
);

type Props = {
  currentView?: string;
};

function wrap(node: ReactNode) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[30vh] text-sm text-slate-400">Loading page…</div>}>
      {node}
    </Suspense>
  );
}

export function AcademicManagementCRM({ currentView = 'Academic Dashboard' }: Props) {
  switch (currentView) {
    case 'Class & Sections':
      return wrap(<ClassSectionsView />);
    case 'Curriculum & Syllabus':
      return wrap(<CurriculumSyllabusView />);
    case 'Timetable':
      return wrap(<TimetableView />);
    case 'Lesson Planning':
      return wrap(<LessonPlanningView />);
    case 'Homework':
      return wrap(<HomeworkView />);
    case 'Academic Calendar':
      return wrap(<AcademicCalendarView />);
    case 'Continuous Evaluation':
      return wrap(<ContinuousEvaluationView />);
    case 'Subject Management':
      return wrap(<SubjectManagementView />);
    case 'Co-Scholastic Activities':
      return wrap(<CoScholasticView />);
    case 'Teacher Allocation':
      return wrap(<TeacherAllocationView />);
    case 'Academic Reports':
      return wrap(<AcademicReportsView />);
    case 'Academic Dashboard':
    default:
      return wrap(<AcademicDashboardView />);
  }
}
