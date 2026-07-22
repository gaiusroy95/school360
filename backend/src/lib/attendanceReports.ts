import { getAttendanceMeta, getStudentAttendanceReport, type StudentPeriod } from './attendance.js';
import { getInstitutionFilterMeta } from './students.js';
import { getStaffAttendanceReport } from './staffAttendance.js';
import { getTeacherAttendanceReport } from './teacherAttendance.js';

export async function getAttendanceReportsMeta(institutionId: string) {
  const [filters, attendanceMeta] = await Promise.all([
    getInstitutionFilterMeta(institutionId),
    getAttendanceMeta(institutionId),
  ]);

  return {
    defaultAcademicYear: filters.defaultAcademicYear,
    academicYears: filters.academicYears,
    periods: [
      { id: 'monthly', label: 'Monthly' },
      { id: 'quarterly', label: 'Quarterly' },
      { id: 'half_yearly', label: 'Half Yearly' },
      { id: 'yearly', label: 'Yearly' },
    ],
    sections: attendanceMeta.sections,
    classes: attendanceMeta.classes,
    classGroups: attendanceMeta.classGroups,
  };
}

export async function getAllAttendanceReports(
  institutionId: string,
  opts: {
    academicYear?: string;
    period?: StudentPeriod;
    year?: number;
    month?: number;
    quarter?: number;
    half?: 1 | 2;
    sectionName?: string;
    className?: string;
  },
) {
  const [students, teachers, staff] = await Promise.all([
    getStudentAttendanceReport(institutionId, opts),
    getTeacherAttendanceReport(institutionId, opts),
    getStaffAttendanceReport(institutionId, opts),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    filters: {
      academicYear: opts.academicYear || students.academicYear,
      period: opts.period || students.period,
      periodLabel: students.periodLabel,
      from: students.from,
      to: students.to,
      sectionName: opts.sectionName || null,
      className: opts.className || null,
    },
    students,
    teachers,
    staff,
    summary: {
      totalStudents: students.summary.totalStudents,
      totalTeachers: teachers.summary.totalTeachers,
      totalStaff: staff.summary.totalStaff,
      studentAvgAttendance: students.summary.avgAttendanceScore,
      teacherAvgAttendance: teachers.summary.avgAttendanceScore,
      staffAvgAttendance: staff.summary.avgAttendanceScore,
    },
  };
}
