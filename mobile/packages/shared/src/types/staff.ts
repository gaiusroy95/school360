import type { MobileRole } from './auth';

export type StaffDashboard = {
  role: MobileRole;
  displayName: string;
  department?: string;
  summary: Record<string, number>;
};

export type AttendanceRosterStudent = {
  studentId: string;
  admissionNumber: string;
  rollNumber: string;
  name: string;
  status: string | null;
  absentReason: string;
};

export type StaffTask = {
  id: string;
  title: string;
  taskTypeLabel: string;
  status: string;
  statusLabel: string;
  dueDate: string | null;
  isOverdue: boolean;
  classGroup: string;
  subjectName: string;
};

export type StaffLeaveItem = {
  id: string;
  category: string;
  categoryLabel?: string;
  applicantName?: string;
  leaveTypeLabel: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: string;
  statusLabel: string;
};

export type StaffEvaluation = {
  id: string;
  teacherName: string;
  classGroup: string;
  subjectName: string;
  status: string;
  statusLabel: string;
  parentEngagementScore: number | null;
  behaviourScore?: number | null;
};

export type TransportVehicle = {
  id: string;
  vehicleNumber: string;
  routeName: string;
  driverName: string;
  latestLocation: { latitude: number; longitude: number; recordedAt: string } | null;
};
