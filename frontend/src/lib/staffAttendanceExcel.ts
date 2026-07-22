import * as XLSX from 'xlsx';
import type { StaffAttendanceReport } from './attendanceServices';

function formatCell(value: unknown): string | number {
  if (value === null || value === undefined) return '';
  return value as string | number;
}

export function downloadStaffAttendanceReportExcel(
  report: StaffAttendanceReport,
  categoryKey?: string,
) {
  const wb = XLSX.utils.book_new();

  const info = [
    ['Academic Year', report.academicYear],
    ['Period', report.periodLabel],
    ['From', report.from],
    ['To', report.to],
    ['Working Days', report.workingDays],
    ['Total Staff', report.summary.totalStaff],
    ['Avg Attendance Score %', report.summary.avgAttendanceScore],
    [],
    ['Legend', 'P=Present, PL=Planned Leave, ML=Medical Leave, UA=Unplanned Absent, NI=Not Intimated'],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(info), 'Report Info');

  if (!categoryKey) {
    const header = [
    'Employee Code',
    'Staff Name',
    'Department',
    'Designation',
    ...report.dateColumns.map((d) => d.label),
      'Days Present',
      'Planned Leave',
      'Medical Leave',
      'Unplanned Absent',
      'Not Intimated',
      'Total Leave Used',
      'Leave Granted',
      'Leave Balance',
      'Attendance Score %',
    ];
    const rows = report.rows.map((r) => [
      r.staff.employeeCode,
      r.staff.staffName,
      r.staff.department,
      r.staff.designation,
      ...report.dateColumns.map((d) => formatCell(r.daily[d.date])),
      r.totals.daysPresent,
      r.totals.daysPlannedLeave,
      r.totals.daysMedicalLeave,
      r.totals.daysUnplannedAbsent,
      r.totals.daysNotIntimated,
      r.totals.totalLeaveUsed,
      r.leaveGrants.totalGranted,
      r.leaveGrants.balance,
      r.totals.attendanceScore,
    ]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([header, ...rows]), 'Date-wise Attendance');
  }

  const categories = categoryKey
    ? report.categoryExports.filter((c) => c.key === categoryKey)
    : report.categoryExports;

  for (const cat of categories) {
    const sheetName = cat.title.slice(0, 31);
    const header = ['Date', 'Employee Code', 'Staff Name', 'Department', 'Status', 'Staff Remarks', 'Check-in'];
    const rows = cat.rows.map((r) => [
      r.date,
      r.employeeCode,
      r.staffName,
      r.department,
      r.status,
      r.staffRemarks,
      r.checkInTime,
    ]);
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(rows.length ? [header, ...rows] : [['No records in this category']]),
      sheetName,
    );
  }

  const suffix = categoryKey ? `_${categoryKey}` : '_Full';
  const safeYear = report.academicYear.replace(/[^a-zA-Z0-9_-]+/g, '_');
  XLSX.writeFile(wb, `Staff_Attendance_${safeYear}${suffix}.xlsx`);
}

export function downloadStaffDayDetailExcel(
  day: {
    date: string;
    dateLabel: string;
    sections: {
      title: string;
      staff?: {
        staff: { staffName: string; employeeCode: string; department: string };
        staffRemarks: string;
        checkInTime: string;
        statusLabel: string;
      }[];
    }[];
  },
) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([['Date', day.dateLabel], []]),
    'Info',
  );

  for (const section of day.sections) {
    const header = ['Staff Name', 'Employee Code', 'Department', 'Status', 'Remarks', 'Check-in'];
    const rows = (section.staff || []).map((t) => [
      t.staff.staffName,
      t.staff.employeeCode,
      t.staff.department,
      t.statusLabel,
      t.staffRemarks,
      t.checkInTime,
    ]);
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([header, ...rows]),
      section.title.slice(0, 31),
    );
  }

  XLSX.writeFile(wb, `Staff_Attendance_Day_${day.date}.xlsx`);
}
