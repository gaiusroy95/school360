/** Mobile roles — separate from dashboard UserRole (SUPER_ADMIN, ADMIN, STAFF). */
export type MobileRole = 'STUDENT' | 'PARENT' | 'TEACHER' | 'PRINCIPAL' | 'TRANSPORT';

export type MobileUser = {
  accountId: string;
  role: MobileRole;
  institutionId: string;
  displayName: string;
  mustResetPassword: boolean;
  studentIds: string[];
  studentId?: string;
  activeStudentId?: string;
  admissionNumber?: string;
  employeeCode?: string;
};

export type LoginCredentials = {
  admissionNumber: string;
  registeredMobile: string;
  password: string;
  app: 'student-parent';
  layer: 'student' | 'parent';
};

export type AuthResponse = {
  token: string;
  user: MobileUser;
};
