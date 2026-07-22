import * as XLSX from 'xlsx';
import type {
  AllAttendanceReports,
  StaffAttendanceReport,
  StudentAttendanceReport,
  TeacherAttendanceReport,
} from './attendanceServices';

function formatCell(value: unknown): string | number {
  if (value === null || value === undefined) return '';
  return value as string | number;
}

export function downloadAttendanceDrilldownExcel(
  data: { title: string; columns: { key: string; label: string }[]; rows: Record<string, unknown>[] },
  academicYear: string,
) {
  const wb = XLSX.utils.book_new();
  const header = data.columns.map((c) => c.label);
  const rows = data.rows.map((row) => data.columns.map((c) => formatCell(row[c.key])));
  const sheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
  XLSX.utils.book_append_sheet(wb, sheet, 'Data');
  const safeTitle = data.title.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 40);
  XLSX.writeFile(wb, `Attendance_${safeTitle}_${academicYear}.xlsx`);
}

export function downloadStudentAttendanceReportExcel(
  report: StudentAttendanceReport,
  categoryKey?: string,
) {
  const wb = XLSX.utils.book_new();

  const info = [
    ['Academic Year', report.academicYear],
    ['Period', report.periodLabel],
    ['From', report.from],
    ['To', report.to],
    ['Working Days', report.workingDays],
    ['Total Students', report.summary.totalStudents],
    ['Avg Attendance Score %', report.summary.avgAttendanceScore],
    [],
    ['Legend', 'P=Present, A=Absent, L=Late, OL=On Leave, HD=Half Day'],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(info), 'Report Info');

  const classHeader = ['Class', 'Total Students', 'Avg Attendance %', 'Total Present', 'Total Absent', 'Total Late', 'Total On Leave'];
  const classRows = report.classSummary.map((c) => [
    c.classGroup,
    c.totalStudents,
    c.avgAttendance,
    c.totalPresent,
    c.totalAbsent,
    c.totalLate,
    c.totalOnLeave,
  ]);
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(classRows.length ? [classHeader, ...classRows] : [['No class data']]),
    'Class Summary',
  );

  if (!categoryKey) {
    const header = [
      'Admission No.',
      'Roll No.',
      'Student Name',
      'Class',
      'Category',
      ...report.dateColumns.map((d) => d.label),
      'Days Present',
      'Days Absent',
      'Days Late',
      'Days On Leave',
      'Days Half Day',
      'Days Marked',
      'Attendance Score %',
    ];
    const rows = report.rows.map((r) => [
      r.student.admissionNumber,
      r.student.rollNumber,
      r.student.name,
      r.student.classGroup,
      r.student.category,
      ...report.dateColumns.map((d) => formatCell(r.daily[d.date])),
      r.totals.daysPresent,
      r.totals.daysAbsent,
      r.totals.daysLate,
      r.totals.daysOnLeave,
      r.totals.daysHalfDay,
      r.totals.daysMarked,
      r.totals.attendanceScore,
    ]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([header, ...rows]), 'Date-wise Attendance');
  }

  const categories = categoryKey
    ? report.categoryExports.filter((c) => c.key === categoryKey)
    : report.categoryExports;

  for (const cat of categories) {
    const sheetName = cat.title.slice(0, 31);
    const header = ['Date', 'Admission No.', 'Roll No.', 'Student Name', 'Class', 'Status', 'Check-in', 'Remarks'];
    const rows = cat.rows.map((r) => [
      r.date,
      r.admissionNumber,
      r.rollNumber,
      r.studentName,
      r.classGroup,
      r.status,
      r.checkInTime,
      r.remarks,
    ]);
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(rows.length ? [header, ...rows] : [['No records in this category']]),
      sheetName,
    );
  }

  const suffix = categoryKey ? `_${categoryKey}` : '_Full';
  const safeYear = report.academicYear.replace(/[^a-zA-Z0-9_-]+/g, '_');
  XLSX.writeFile(wb, `Student_Attendance_${safeYear}${suffix}.xlsx`);
}

function appendTeacherReportSheets(wb: XLSX.WorkBook, report: TeacherAttendanceReport, prefix = '') {
  const info = [
    ['Academic Year', report.academicYear],
    ['Period', report.periodLabel],
    ['From', report.from],
    ['To', report.to],
    ['Working Days', report.workingDays],
    ['Total Teachers', report.summary.totalTeachers],
    ['Avg Attendance Score %', report.summary.avgAttendanceScore],
    [],
    ['Legend', 'P=Present, PL=Planned Leave, ML=Medical Leave, UA=Unplanned Absent, NI=Not Intimated'],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(info), `${prefix}Teacher Info`.slice(0, 31));

  const header = [
    'Employee Code',
    'Teacher Name',
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
    r.teacher.employeeCode,
    r.teacher.teacherName,
    r.teacher.department,
    r.teacher.designation,
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
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([header, ...rows]), `${prefix}Teachers`.slice(0, 31));

  for (const cat of report.categoryExports) {
    const sheetName = `${prefix}${cat.title}`.slice(0, 31);
    const catHeader = ['Date', 'Employee Code', 'Teacher Name', 'Department', 'Status', 'Remarks', 'Check-in'];
    const catRows = cat.rows.map((r) => [
      r.date,
      r.employeeCode,
      r.teacherName,
      r.department,
      r.status,
      r.teacherRemarks,
      r.checkInTime,
    ]);
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(catRows.length ? [catHeader, ...catRows] : [['No records']]),
      sheetName,
    );
  }
}

function appendStaffReportSheets(wb: XLSX.WorkBook, report: StaffAttendanceReport, prefix = '') {
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
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(info), `${prefix}Staff Info`.slice(0, 31));

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
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([header, ...rows]), `${prefix}Staff`.slice(0, 31));

  for (const cat of report.categoryExports) {
    const sheetName = `${prefix}Staff ${cat.title}`.slice(0, 31);
    const catHeader = ['Date', 'Employee Code', 'Staff Name', 'Department', 'Status', 'Remarks', 'Check-in'];
    const catRows = cat.rows.map((r) => [
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
      XLSX.utils.aoa_to_sheet(catRows.length ? [catHeader, ...catRows] : [['No records']]),
      sheetName,
    );
  }
}

function appendStudentReportSheets(wb: XLSX.WorkBook, report: StudentAttendanceReport, prefix = '') {
  const info = [
    ['Academic Year', report.academicYear],
    ['Period', report.periodLabel],
    ['From', report.from],
    ['To', report.to],
    ['Working Days', report.workingDays],
    ['Total Students', report.summary.totalStudents],
    ['Avg Attendance Score %', report.summary.avgAttendanceScore],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(info), `${prefix}Student Info`.slice(0, 31));

  const classHeader = ['Class', 'Total Students', 'Avg Attendance %', 'Total Present', 'Total Absent', 'Total Late', 'Total On Leave'];
  const classRows = report.classSummary.map((c) => [
    c.classGroup,
    c.totalStudents,
    c.avgAttendance,
    c.totalPresent,
    c.totalAbsent,
    c.totalLate,
    c.totalOnLeave,
  ]);
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(classRows.length ? [classHeader, ...classRows] : [['No class data']]),
    `${prefix}Class Summary`.slice(0, 31),
  );

  const header = [
    'Admission No.',
    'Roll No.',
    'Student Name',
    'Class',
    'Category',
    ...report.dateColumns.map((d) => d.label),
    'Days Present',
    'Days Absent',
    'Days Late',
    'Days On Leave',
    'Days Half Day',
    'Attendance Score %',
  ];
  const rows = report.rows.map((r) => [
    r.student.admissionNumber,
    r.student.rollNumber,
    r.student.name,
    r.student.classGroup,
    r.student.category,
    ...report.dateColumns.map((d) => formatCell(r.daily[d.date])),
    r.totals.daysPresent,
    r.totals.daysAbsent,
    r.totals.daysLate,
    r.totals.daysOnLeave,
    r.totals.daysHalfDay,
    r.totals.attendanceScore,
  ]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([header, ...rows]), `${prefix}Students`.slice(0, 31));

  for (const cat of report.categoryExports) {
    const sheetName = `${prefix}Stu ${cat.title}`.slice(0, 31);
    const catHeader = ['Date', 'Admission No.', 'Student Name', 'Class', 'Status', 'Check-in', 'Remarks'];
    const catRows = cat.rows.map((r) => [
      r.date,
      r.admissionNumber,
      r.studentName,
      r.classGroup,
      r.status,
      r.checkInTime,
      r.remarks,
    ]);
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(catRows.length ? [catHeader, ...catRows] : [['No records']]),
      sheetName,
    );
  }
}

export function downloadAllAttendanceReportsExcel(bundle: AllAttendanceReports) {
  const wb = XLSX.utils.book_new();

  const overview = [
    ['Attendance Report — All Data'],
    ['Generated At', bundle.generatedAt],
    ['Academic Year', bundle.filters.academicYear],
    ['Period', bundle.filters.periodLabel],
    ['From', bundle.filters.from],
    ['To', bundle.filters.to],
    [],
    ['Category', 'Total', 'Avg Attendance %'],
    ['Students', bundle.summary.totalStudents, bundle.summary.studentAvgAttendance],
    ['Teachers', bundle.summary.totalTeachers, bundle.summary.teacherAvgAttendance],
    ['Staff', bundle.summary.totalStaff, bundle.summary.staffAvgAttendance],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(overview), 'Overview');

  appendStudentReportSheets(wb, bundle.students);
  appendTeacherReportSheets(wb, bundle.teachers);
  appendStaffReportSheets(wb, bundle.staff);

  const safeYear = bundle.filters.academicYear.replace(/[^a-zA-Z0-9_-]+/g, '_');
  const safePeriod = bundle.filters.periodLabel.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 30);
  XLSX.writeFile(wb, `All_Attendance_Report_${safeYear}_${safePeriod}.xlsx`);
}
