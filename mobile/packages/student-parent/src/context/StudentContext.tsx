import { createContext, useContext } from 'react';
import type { MobileUser } from '@360schoolerp/shared';

export type ChildSummary = {
  id: string;
  name: string;
  classGroup: string;
  admissionNumber: string;
};

type StudentContextValue = {
  activeStudentId: string | null;
  children: ChildSummary[];
  setActiveStudentId: (id: string) => Promise<void>;
  refreshChildren: () => Promise<void>;
  studentParams: { studentId?: string };
};

export const StudentContext = createContext<StudentContextValue | null>(null);

export function useStudent() {
  const ctx = useContext(StudentContext);
  if (!ctx) throw new Error('useStudent must be used within StudentProvider');
  return ctx;
}

export function useStudentParams() {
  const { studentParams } = useStudent();
  return studentParams;
}
