import { lazy, Suspense, type ReactNode } from 'react';

const AddNewStudentView = lazy(() =>
  import('./StudentManagement/AddNewStudentView').then((m) => ({ default: m.AddNewStudentView })),
);
const StudentProfilesView = lazy(() =>
  import('./StudentManagement/StudentProfilesView').then((m) => ({ default: m.StudentProfilesView })),
);
const StudentsListView = lazy(() =>
  import('./StudentManagement/StudentsListView').then((m) => ({ default: m.StudentsListView })),
);
const BulkImportView = lazy(() =>
  import('./StudentManagement/BulkImportView').then((m) => ({ default: m.BulkImportView })),
);
const StudentCategoriesView = lazy(() =>
  import('./StudentManagement/StudentCategoriesView').then((m) => ({ default: m.StudentCategoriesView })),
);
const StudentReportsView = lazy(() =>
  import('./StudentManagement/StudentReportsView').then((m) => ({ default: m.StudentReportsView })),
);
const StudentAnalyticsView = lazy(() =>
  import('./StudentManagement/StudentAnalyticsView').then((m) => ({ default: m.StudentAnalyticsView })),
);
const StudentIdCardsView = lazy(() =>
  import('./StudentManagement/StudentIdCardsView').then((m) => ({ default: m.StudentIdCardsView })),
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

export function StudentManagementCRM({ currentView = 'Students List', onNavigate }: Props) {
  switch (currentView) {
    case 'Add New Student':
      return wrap(<AddNewStudentView onNavigate={onNavigate} />);
    case 'Student Profiles':
      return wrap(<StudentProfilesView />);
    case 'Bulk Import':
      return wrap(<BulkImportView />);
    case 'Student Categories':
      return wrap(<StudentCategoriesView />);
    case 'Student Reports':
      return wrap(<StudentReportsView />);
    case 'Student Analytics':
      return wrap(<StudentAnalyticsView />);
    case 'Student ID Cards':
      return wrap(<StudentIdCardsView onNavigate={onNavigate} />);
    case 'Students List':
    default:
      return wrap(<StudentsListView onNavigate={onNavigate} />);
  }
}
