import { AcademicDashboardView } from './AcademicManagement/AcademicDashboardView';
import { ClassSectionsView } from './AcademicManagement/ClassSectionsView';
import { CurriculumSyllabusView } from './AcademicManagement/CurriculumSyllabusView';
import { TimetableView } from './AcademicManagement/TimetableView';
import { LessonPlanningView } from './AcademicManagement/LessonPlanningView';
import { HomeworkView } from './AcademicManagement/HomeworkView';
import { AcademicCalendarView } from './AcademicManagement/AcademicCalendarView';
import { ContinuousEvaluationView } from './AcademicManagement/ContinuousEvaluationView';
import { SubjectManagementView } from './AcademicManagement/SubjectManagementView';
import { CoScholasticView } from './AcademicManagement/CoScholasticView';
import { TeacherAllocationView } from './AcademicManagement/TeacherAllocationView';
import { AcademicReportsView } from './AcademicManagement/AcademicReportsView';

type Props = {
  currentView?: string;
};

export function AcademicManagementCRM({ currentView = 'Academic Dashboard' }: Props) {
  switch (currentView) {
    case 'Class & Sections':
      return <ClassSectionsView />;
    case 'Curriculum & Syllabus':
      return <CurriculumSyllabusView />;
    case 'Timetable':
      return <TimetableView />;
    case 'Lesson Planning':
      return <LessonPlanningView />;
    case 'Homework':
      return <HomeworkView />;
    case 'Academic Calendar':
      return <AcademicCalendarView />;
    case 'Continuous Evaluation':
      return <ContinuousEvaluationView />;
    case 'Subject Management':
      return <SubjectManagementView />;
    case 'Co-Scholastic Activities':
      return <CoScholasticView />;
    case 'Teacher Allocation':
      return <TeacherAllocationView />;
    case 'Academic Reports':
      return <AcademicReportsView />;
    case 'Academic Dashboard':
    default:
      return <AcademicDashboardView />;
  }
}
