import { AddNewStudentView } from './StudentManagement/AddNewStudentView';
import { StudentProfilesView } from './StudentManagement/StudentProfilesView';
import { StudentsListView } from './StudentManagement/StudentsListView';
import { BulkImportView } from './StudentManagement/BulkImportView';
import { StudentCategoriesView } from './StudentManagement/StudentCategoriesView';
import { StudentReportsView } from './StudentManagement/StudentReportsView';
import { StudentAnalyticsView } from './StudentManagement/StudentAnalyticsView';
import { StudentIdCardsView } from './StudentManagement/StudentIdCardsView';

type Props = {
  currentView?: string;
  onNavigate?: (view: string) => void;
};

export function StudentManagementCRM({ currentView = 'Students List', onNavigate }: Props) {
  switch (currentView) {
    case 'Add New Student':
      return <AddNewStudentView onNavigate={onNavigate} />;
    case 'Student Profiles':
    return <StudentProfilesView />;
    case 'Bulk Import':
      return <BulkImportView />;
    case 'Student Categories':
      return <StudentCategoriesView />;
    case 'Student Reports':
      return <StudentReportsView />;
    case 'Student Analytics':
      return <StudentAnalyticsView />;
    case 'Student ID Cards':
      return <StudentIdCardsView onNavigate={onNavigate} />;
    case 'Students List':
    default:
      return <StudentsListView onNavigate={onNavigate} />;
  }
}
