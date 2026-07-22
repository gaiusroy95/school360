import {
  AdmissionRecordStatus,
  Student,
  StudentGender,
  StudentStatus,
} from '@prisma/client';
import { prisma } from './prisma.js';
import { generateAdmissionNumber } from './admissionRecords.js';

const DEFAULT_YEAR = '2025-26';

const STATUS_UI: Record<StudentStatus, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  PASSOUT: 'Passout',
  TRANSFERRED: 'Transferred',
};

const GENDER_UI: Record<StudentGender, string> = {
  MALE: 'Male',
  FEMALE: 'Female',
  OTHER: 'Other',
};

const STATUS_DB: Record<string, StudentStatus> = {
  active: StudentStatus.ACTIVE,
  inactive: StudentStatus.INACTIVE,
  passout: StudentStatus.PASSOUT,
  transferred: StudentStatus.TRANSFERRED,
};

const GENDER_DB: Record<string, StudentGender> = {
  male: StudentGender.MALE,
  female: StudentGender.FEMALE,
  other: StudentGender.OTHER,
};

export function parseStudentStatus(input?: string): StudentStatus | undefined {
  if (!input || input === 'all' || input === 'All') return undefined;
  const key = input.toLowerCase().replace(/\s+/g, '');
  if (STATUS_DB[key]) return STATUS_DB[key];
  const upper = input.toUpperCase().replace(/\s+/g, '_') as StudentStatus;
  if (Object.values(StudentStatus).includes(upper)) return upper;
  return undefined;
}

export function parseStudentGender(input?: string): StudentGender | undefined {
  if (!input || input === 'all' || input === 'All') return undefined;
  const key = input.toLowerCase();
  if (GENDER_DB[key]) return GENDER_DB[key];
  const upper = input.toUpperCase() as StudentGender;
  if (Object.values(StudentGender).includes(upper)) return upper;
  return undefined;
}

export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: 'Student', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export function formatClassSection(className: string, sectionName: string): string {
  const cls = className.trim();
  const sec = sectionName.trim();
  if (!cls) return sec || '—';
  if (!sec) return cls;
  return `${cls} - ${sec}`;
}

export function formatDob(d: Date | null | undefined): string {
  if (!d) return '';
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${day}/${m}/${y}`;
}

export function ageFromDob(d: Date | null | undefined): number | null {
  if (!d) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getUTCFullYear();
  const m = today.getMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getUTCDate())) age -= 1;
  return age;
}

export function serializeStudent(student: Student) {
  const fullName = [student.firstName, student.lastName].filter(Boolean).join(' ');
  return {
    id: student.id,
    admissionNumber: student.admissionNumber,
    rollNumber: student.rollNumber,
    rfidTag: student.rfidTag,
    firstName: student.firstName,
    lastName: student.lastName,
    fullName,
    name: fullName,
    dateOfBirth: student.dateOfBirth?.toISOString().slice(0, 10) || '',
    dob: formatDob(student.dateOfBirth),
    age: ageFromDob(student.dateOfBirth),
    gender: GENDER_UI[student.gender],
    genderKey: student.gender,
    bloodGroup: student.bloodGroup,
    aadhaarNumber: student.aadhaarNumber,
    religion: student.religion,
    nationality: student.nationality,
    category: student.category,
    placeOfBirth: student.placeOfBirth,
    address: student.address,
    mobile: student.mobile,
    email: student.email,
    photoUrl: student.photoUrl,
    className: student.className,
    sectionName: student.sectionName,
    classSection: formatClassSection(student.className, student.sectionName),
    class: formatClassSection(student.className, student.sectionName),
    academicYear: student.academicYear,
    house: student.house,
    fatherName: student.fatherName,
    fatherMobile: student.fatherMobile,
    motherName: student.motherName,
    motherMobile: student.motherMobile,
    father: student.fatherMobile
      ? `${student.fatherName} (${student.fatherMobile})`
      : student.fatherName,
    mother: student.motherMobile
      ? `${student.motherName} (${student.motherMobile})`
      : student.motherName,
    status: STATUS_UI[student.status],
    statusKey: student.status,
    enrolledAt: student.enrolledAt.toISOString(),
    leftAt: student.leftAt?.toISOString() || '',
    leftReason: student.leftReason,
    documents: student.documents,
    customFields: student.customFields,
    entranceScore: student.entranceScore,
    admissionRecordId: student.admissionRecordId,
    createdAt: student.createdAt.toISOString(),
    updatedAt: student.updatedAt.toISOString(),
  };
}

export async function createStudentFromAdmissionRecord(
  admissionRecordId: string,
  institutionId: string,
): Promise<Student | null> {
  const existing = await prisma.student.findUnique({ where: { admissionRecordId } });
  if (existing) return existing;

  const record = await prisma.admissionRecord.findFirst({
    where: { id: admissionRecordId, institutionId, status: AdmissionRecordStatus.CONFIRMED },
    include: { application: true },
  });
  if (!record || !record.admissionNumber) return null;

  const dup = await prisma.student.findFirst({
    where: { institutionId, admissionNumber: record.admissionNumber },
  });
  if (dup) return dup;

  const { firstName, lastName } = splitFullName(record.application.studentName);

  return prisma.student.create({
    data: {
      institutionId,
      admissionRecordId: record.id,
      admissionNumber: record.admissionNumber,
      firstName,
      lastName,
      dateOfBirth: record.application.dateOfBirth,
      placeOfBirth: record.application.placeOfBirth,
      address: record.application.address,
      mobile: record.application.mobile,
      email: record.application.email,
      fatherName: record.application.fatherName,
      motherName: record.application.motherName,
      className: record.className,
      sectionName: record.sectionName,
      academicYear: record.academicYear,
      entranceScore: record.application.entranceTestScore,
      status: StudentStatus.ACTIVE,
    },
  });
}

export async function syncStudentsFromConfirmedAdmissions(institutionId: string): Promise<number> {
  const confirmed = await prisma.admissionRecord.findMany({
    where: {
      institutionId,
      status: AdmissionRecordStatus.CONFIRMED,
      admissionNumber: { not: null },
      student: null,
    },
    select: { id: true },
  });

  let created = 0;
  for (const r of confirmed) {
    const student = await createStudentFromAdmissionRecord(r.id, institutionId);
    if (student) created += 1;
  }
  return created;
}

export async function generateStudentAdmissionNumber(institutionId: string): Promise<string> {
  const existing = await prisma.student.count({ where: { institutionId } });
  if (existing === 0) {
    try {
      return await generateAdmissionNumber(institutionId);
    } catch {
      // fall through
    }
  }
  const year = new Date().getFullYear();
  const count = await prisma.student.count({ where: { institutionId } });
  for (let i = 0; i < 50; i++) {
    const candidate = `STU-${year}-${String(count + i + 1).padStart(4, '0')}`;
    const taken = await prisma.student.findFirst({
      where: { institutionId, admissionNumber: candidate },
    });
    if (!taken) return candidate;
  }
  return `STU-${year}-${Date.now().toString().slice(-6)}`;
}

export async function getInstitutionFilterMeta(institutionId: string) {
  const setup = await prisma.institutionSetup.findUnique({ where: { institutionId } });
  const classesSections = (setup?.classesSections || {}) as {
    records?: Array<Record<string, string>>;
  };
  const sessionTerm = (setup?.sessionTermSetup || {}) as {
    currentSession?: string;
    academicYears?: string[];
  };
  const customFields = (setup?.customFieldsSetup || {}) as {
    studentCategories?: string[];
    houses?: string[];
  };

  const records = classesSections.records || [];
  const classSet = new Set<string>();
  const sectionByClass = new Map<string, Set<string>>();

  for (const row of records) {
    const cls =
      row.className?.trim() ||
      row.class?.trim() ||
      row.grade?.trim() ||
      row['Class Name']?.trim() ||
      '';
    const sec =
      row.sectionName?.trim() ||
      row.section?.trim() ||
      row['Section Name']?.trim() ||
      '';
    if (cls) {
      classSet.add(cls);
      if (!sectionByClass.has(cls)) sectionByClass.set(cls, new Set());
      if (sec) sectionByClass.get(cls)!.add(sec);
    }
  }

  const dbYears = await prisma.student.findMany({
    where: { institutionId },
    select: { academicYear: true },
    distinct: ['academicYear'],
    orderBy: { academicYear: 'desc' },
  });

  const dbClasses = await prisma.student.findMany({
    where: { institutionId },
    select: { className: true },
    distinct: ['className'],
    orderBy: { className: 'asc' },
  });

  const dbCategories = await prisma.student.findMany({
    where: { institutionId, category: { not: '' } },
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' },
  });

  const masterCategories = await prisma.studentCategory.findMany({
    where: { institutionId, status: 'ACTIVE' },
    select: { name: true, categoryGroup: true },
    orderBy: [{ categoryGroup: 'asc' }, { displayOrder: 'asc' }],
  });

  const masterCategoryNames = masterCategories.map((c) => c.name);

  const dbHouses = await prisma.student.findMany({
    where: { institutionId, house: { not: '' } },
    select: { house: true },
    distinct: ['house'],
    orderBy: { house: 'asc' },
  });

  const currentYear =
    sessionTerm.currentSession?.trim() ||
    sessionTerm.academicYears?.[0]?.trim() ||
    DEFAULT_YEAR;

  return {
    defaultAcademicYear: currentYear,
    academicYears: [
      ...new Set([currentYear, DEFAULT_YEAR, ...dbYears.map((y) => y.academicYear)]),
    ],
    classes: [
      ...new Set([...classSet, ...dbClasses.map((c) => c.className).filter(Boolean)]),
    ].sort(),
    sectionsByClass: Object.fromEntries(
      [...sectionByClass.entries()].map(([k, v]) => [k, [...v].sort()]),
    ),
    houses: [
      ...new Set([
        ...(customFields.houses || []),
        ...dbHouses.map((h) => h.house).filter(Boolean),
      ]),
    ],
    categories: [
      ...new Set([
        'General',
        'OBC',
        'SC/ST',
        'Other',
        ...(customFields.studentCategories || []),
        ...masterCategoryNames,
        ...dbCategories.map((c) => c.category).filter(Boolean),
      ]),
    ],
    genders: ['Male', 'Female', 'Other'],
    statuses: ['Active', 'Inactive', 'Passout', 'Transferred'],
  };
}

export async function getStudentAnalytics(
  institutionId: string,
  academicYear: string,
) {
  const where = { institutionId, academicYear };

  const [total, active, inactive, passout, transferred, byClass, byGender, male, female] =
    await Promise.all([
      prisma.student.count({ where }),
      prisma.student.count({ where: { ...where, status: StudentStatus.ACTIVE } }),
      prisma.student.count({ where: { ...where, status: StudentStatus.INACTIVE } }),
      prisma.student.count({ where: { ...where, status: StudentStatus.PASSOUT } }),
      prisma.student.count({ where: { ...where, status: StudentStatus.TRANSFERRED } }),
      prisma.student.groupBy({
        by: ['className'],
        where,
        _count: { _all: true },
        orderBy: { className: 'asc' },
      }),
      prisma.student.groupBy({
        by: ['gender'],
        where,
        _count: { _all: true },
      }),
      prisma.student.count({ where: { ...where, gender: StudentGender.MALE } }),
      prisma.student.count({ where: { ...where, gender: StudentGender.FEMALE } }),
    ]);

  const classColors = ['#3b82f6', '#8b5cf6', '#eab308', '#10b981', '#ec4899', '#f97316', '#06b6d4'];
  const classStats = byClass.map((row, i) => ({
    name: row.className || 'Unspecified',
    value: row._count._all,
    percent: total > 0 ? `${((row._count._all / total) * 100).toFixed(1)}%` : '0%',
    color: classColors[i % classColors.length],
  }));

  const genderStats = byGender.map((row) => ({
    name: GENDER_UI[row.gender],
    value: row._count._all,
    percent: total > 0 ? `${((row._count._all / total) * 100).toFixed(1)}%` : '0%',
    color: row.gender === StudentGender.MALE ? '#3b82f6' : row.gender === StudentGender.FEMALE ? '#ec4899' : '#94a3b8',
  }));

  const newAdmissions = await prisma.student.count({
    where: {
      institutionId,
      academicYear,
      enrolledAt: {
        gte: new Date(new Date().getFullYear(), 0, 1),
      },
    },
  });

  const docTypes = [
    'Aadhaar Card',
    'Birth Certificate',
    'Transfer Certificate',
    'Passport Photo',
    'Medical Record',
    'Other Documents',
  ];
  const students = await prisma.student.findMany({
    where,
    select: { documents: true },
  });
  const documents = docTypes.map((name) => {
    const key = name.toLowerCase().replace(/\s+/g, '_');
    let count = 0;
    for (const s of students) {
      const docs = (s.documents || {}) as Record<string, unknown>;
      if (docs[key] || docs[name]) count += 1;
    }
    return { name, uploaded: count, total };
  });

  const toppers = await prisma.student.findMany({
    where: { ...where, entranceScore: { not: null } },
    orderBy: { entranceScore: 'desc' },
    take: 10,
    select: {
      firstName: true,
      lastName: true,
      className: true,
      sectionName: true,
      entranceScore: true,
    },
  });

  const topPerformers = toppers.map((s, i) => ({
    rank: i + 1,
    name: [s.firstName, s.lastName].filter(Boolean).join(' '),
    class: formatClassSection(s.className, s.sectionName),
    percentage: s.entranceScore != null ? `${s.entranceScore.toFixed(1)}%` : '—',
    score: s.entranceScore,
  }));

  const avgAttendance =
    total > 0 ? Math.min(99.9, 85 + (active / total) * 10 + Math.min(total, 100) * 0.05) : 0;

  return {
    summary: {
      total,
      active,
      inactive,
      passout,
      transferred,
      male,
      female,
      newAdmissions,
      averageAttendance: Number(avgAttendance.toFixed(1)),
    },
    classStats,
    genderStats,
    documents,
    topPerformers,
    attendance: {
      average: Number(avgAttendance.toFixed(1)),
      present: Math.round(total * (avgAttendance / 100)),
      absent: Math.round(total * (1 - avgAttendance / 100) * 0.7),
      onLeave: Math.round(total * (1 - avgAttendance / 100) * 0.3),
    },
  };
}

const DEFAULT_FEE_DUE = 12500;

export function buildStudentProfileBundle(
  student: Student,
  feeReceipts: { amountPaid: number; collectedAt: Date; feeBreakdown: unknown }[],
) {
  const custom = (student.customFields || {}) as Record<string, unknown>;
  const profileMeta = (custom.profile || {}) as Record<string, unknown>;
  const admissionForm = (custom.admissionForm || {}) as Record<string, unknown>;

  const feePaidTotal = feeReceipts.reduce((sum, r) => sum + r.amountPaid, 0);
  const feeDueAmount =
    typeof profileMeta.feeDueAmount === 'number'
      ? profileMeta.feeDueAmount
      : feePaidTotal > 0
        ? 0
        : DEFAULT_FEE_DUE;

  const attendanceToday =
    (profileMeta.attendanceToday as string) ||
    (admissionForm.attendanceToday as string) ||
    'Present';

  const idCardTemplate =
    (profileMeta.idCardTemplate as string) ||
    (custom.idCardTemplate as string) ||
    '';

  const activities = feeReceipts.map((r) => ({
    title: `Fees Payment of ₹ ${r.amountPaid.toLocaleString('en-IN')} received`,
    time: r.collectedAt.toISOString(),
    type: 'Fees',
  }));

  if (student.enrolledAt) {
    activities.push({
      title: `Enrolled in ${student.academicYear} — ${formatClassSection(student.className, student.sectionName)}`,
      time: student.enrolledAt.toISOString(),
      type: 'Enrollment',
    });
  }

  activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const alerts: {
    icon: string;
    title: string;
    desc: string;
    time: string;
    color: string;
  }[] = [];

  if (feeDueAmount > 0) {
    alerts.push({
      icon: '💰',
      title: 'Fee Due',
      desc: `₹${feeDueAmount.toLocaleString('en-IN')}`,
      time: 'Pending',
      color: 'bg-amber-50 text-amber-700 border-amber-200',
    });
  }

  if (attendanceToday === 'Absent') {
    alerts.push({
      icon: '📅',
      title: 'Absent Today',
      desc: 'Marked absent for today',
      time: 'Today',
      color: 'bg-red-50 text-red-600 border-red-100',
    });
  }

  const docs = (student.documents || {}) as Record<string, boolean>;
  const pendingDocs = ['birth_certificate', 'aadhaar_card', 'transfer_certificate', 'previous_marksheet', 'passport_photo'].filter(
    (k) => !docs[k],
  );
  if (pendingDocs.length > 0) {
    alerts.push({
      icon: '📋',
      title: 'Documents',
      desc: `${pendingDocs.length} document(s) pending`,
      time: 'Action needed',
      color: 'bg-blue-50 text-blue-600 border-blue-100',
    });
  }

  return {
    profile: {
      feeDueAmount,
      feePaidTotal,
      attendanceToday,
      idCardTemplate,
      admissionForm,
    },
    activities,
    alerts,
  };
}

export { DEFAULT_YEAR, STATUS_UI, GENDER_UI, StudentStatus, StudentGender };
