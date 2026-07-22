import {
  ExamCertificateCategory,
  ExamCertificateStatus,
  StudentStatus,
} from '@prisma/client';
import { prisma } from './prisma.js';
import { CO_SCHOLASTIC_CATEGORIES, PERFORMANCE_BAND_UI } from './coScholastic.js';
import { getInstitutionFilterMeta } from './students.js';

export const CERTIFICATE_CATEGORY_LABELS: Record<ExamCertificateCategory, string> = {
  PHYSICAL_HEALTH: 'Physical & Health Education',
  WORK_EDUCATION: 'Work Education & Life Skills',
  VISUAL_PERFORMING_ARTS: 'Visual & Performing Arts',
  LEADERSHIP_COMMUNITY: 'Leadership & Community Service',
};

export const CERTIFICATE_TEMPLATE_DESIGNS = [
  {
    id: 'PHYSICAL_HEALTH' as ExamCertificateCategory,
    label: 'Physical & Health Education',
    description: 'Sports, wellness, NCC, martial arts achievements',
    colors: { primary: '#16a34a', accent: '#22c55e', bg: '#f0fdf4' },
  },
  {
    id: 'WORK_EDUCATION' as ExamCertificateCategory,
    label: 'Work Education & Life Skills',
    description: 'Practical skills, soft skills, environmental awareness',
    colors: { primary: '#2563eb', accent: '#3b82f6', bg: '#eff6ff' },
  },
  {
    id: 'VISUAL_PERFORMING_ARTS' as ExamCertificateCategory,
    label: 'Visual & Performing Arts',
    description: 'Art, music, dance, theatre, photography',
    colors: { primary: '#9333ea', accent: '#a855f7', bg: '#faf5ff' },
  },
  {
    id: 'LEADERSHIP_COMMUNITY' as ExamCertificateCategory,
    label: 'Leadership & Community Service',
    description: 'Student council, clubs, NSS, social work',
    colors: { primary: '#ea580c', accent: '#f97316', bg: '#fff7ed' },
  },
];

function parseCategory(raw: string): ExamCertificateCategory {
  const upper = raw.toUpperCase() as ExamCertificateCategory;
  if (Object.values(ExamCertificateCategory).includes(upper)) return upper;
  return ExamCertificateCategory.PHYSICAL_HEALTH;
}

async function nextCertificateRecordId(institutionId: string) {
  const count = await prisma.examCoScholasticCertificate.count({ where: { institutionId } });
  return `CERT-${String(1000 + count + 1)}`;
}

async function getOrCreateConfig(institutionId: string, academicYear: string) {
  let config = await prisma.examCertificateConfig.findFirst({
    where: { institutionId, academicYear },
  });
  if (!config) {
    const reportConfig = await prisma.examReportCardConfig.findFirst({
      where: { institutionId, academicYear },
    });
    const institution = await prisma.institution.findUnique({ where: { id: institutionId } });
    config = await prisma.examCertificateConfig.create({
      data: {
        institutionId,
        academicYear,
        schoolName: reportConfig?.schoolName || institution?.name || '',
        schoolAddress: reportConfig?.schoolAddress || '',
        principalName: reportConfig?.principalName || 'Principal',
        principalSignatureData: reportConfig?.principalSignatureData || '',
        schoolSealData: reportConfig?.schoolSealData || '',
        headerLogoData: reportConfig?.headerLogoData || '',
      },
    });
  }
  return config;
}

function serializeCertificate(c: {
  id: string;
  recordId: string;
  academicYear: string;
  term: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  sectionName: string;
  category: ExamCertificateCategory;
  subCategory: string;
  activityTitle: string;
  activityId: string | null;
  performanceScore: number;
  performanceGrade: string;
  performanceBand: string;
  status: ExamCertificateStatus;
  certificateToken: string;
  recordedBy: string;
  recordedAt: Date;
  generatedAt: Date | null;
  issuedAt: Date | null;
  remarks: string;
}) {
  return {
    id: c.id,
    recordId: c.recordId,
    academicYear: c.academicYear,
    term: c.term,
    studentId: c.studentId,
    studentName: c.studentName,
    admissionNumber: c.admissionNumber,
    className: c.className,
    sectionName: c.sectionName,
    classGroup: c.sectionName ? `${c.className} — ${c.sectionName}` : c.className,
    category: c.category,
    categoryLabel: CERTIFICATE_CATEGORY_LABELS[c.category],
    subCategory: c.subCategory,
    activityTitle: c.activityTitle,
    activityId: c.activityId,
    performanceScore: c.performanceScore,
    performanceGrade: c.performanceGrade,
    performanceBand: c.performanceBand,
    performanceBandLabel: PERFORMANCE_BAND_UI[c.performanceBand as keyof typeof PERFORMANCE_BAND_UI] || c.performanceBand,
    status: c.status,
    certificateToken: c.certificateToken,
    recordedBy: c.recordedBy,
    recordedAt: c.recordedAt.toISOString(),
    generatedAt: c.generatedAt?.toISOString() ?? null,
    issuedAt: c.issuedAt?.toISOString() ?? null,
    remarks: c.remarks,
    canGenerate: c.status === ExamCertificateStatus.RECORDED,
    canIssue: c.status === ExamCertificateStatus.GENERATED,
    templateDesign: CERTIFICATE_TEMPLATE_DESIGNS.find((t) => t.id === c.category),
  };
}

export async function syncCertificatesFromPerformances(institutionId: string, academicYear: string) {
  const performances = await prisma.academicCoScholasticPerformance.findMany({
    where: {
      institutionId,
      activity: { academicYear },
    },
    include: { activity: true },
  });

  let synced = 0;
  for (const perf of performances) {
    const category = parseCategory(perf.activity.category);
    const existing = await prisma.examCoScholasticCertificate.findFirst({
      where: {
        institutionId,
        studentId: perf.studentId,
        activityId: perf.activityId,
        category,
      },
    });
    if (existing) continue;

    const recordId = await nextCertificateRecordId(institutionId);
    await prisma.examCoScholasticCertificate.create({
      data: {
        institutionId,
        recordId,
        academicYear: perf.activity.academicYear,
        term: perf.activity.term,
        studentId: perf.studentId,
        studentName: perf.studentName,
        admissionNumber: '',
        className: perf.className,
        sectionName: perf.sectionName,
        category,
        subCategory: perf.activity.subCategory,
        activityTitle: perf.activity.title,
        activityId: perf.activityId,
        performanceId: perf.id,
        performanceScore: perf.performanceScore,
        performanceGrade: perf.performanceGrade,
        performanceBand: perf.performanceBand,
        status: ExamCertificateStatus.RECORDED,
        recordedBy: perf.recordedBy || perf.activity.teacherName,
        recordedAt: perf.recordedAt || perf.createdAt,
        remarks: perf.remarks,
      },
    });
    synced += 1;
  }

  const missingAdmission = await prisma.examCoScholasticCertificate.findMany({
    where: { institutionId, academicYear, admissionNumber: '' },
    include: { student: { select: { admissionNumber: true } } },
  });
  for (const cert of missingAdmission) {
    await prisma.examCoScholasticCertificate.update({
      where: { id: cert.id },
      data: { admissionNumber: cert.student.admissionNumber },
    });
  }

  return { synced };
}

export async function getCertificatesMeta(institutionId: string) {
  const filters = await getInstitutionFilterMeta(institutionId);
  await getOrCreateConfig(institutionId, filters.defaultAcademicYear);

  const [recorded, generated, issued] = await Promise.all([
    prisma.examCoScholasticCertificate.count({
      where: { institutionId, academicYear: filters.defaultAcademicYear, status: ExamCertificateStatus.RECORDED },
    }),
    prisma.examCoScholasticCertificate.count({
      where: { institutionId, academicYear: filters.defaultAcademicYear, status: ExamCertificateStatus.GENERATED },
    }),
    prisma.examCoScholasticCertificate.count({
      where: { institutionId, academicYear: filters.defaultAcademicYear, status: ExamCertificateStatus.ISSUED },
    }),
  ]);

  return {
    defaultAcademicYear: filters.defaultAcademicYear,
    academicYears: filters.academicYears,
    classes: filters.classes,
    sectionsByClass: filters.sectionsByClass,
    categories: CO_SCHOLASTIC_CATEGORIES,
    templateDesigns: CERTIFICATE_TEMPLATE_DESIGNS,
    summary: { recorded, generated, issued, total: recorded + generated + issued },
  };
}

export async function listCertificates(
  institutionId: string,
  opts?: {
    academicYear?: string;
    className?: string;
    sectionName?: string;
    category?: string;
    status?: string;
  },
) {
  const year = opts?.academicYear || '2025-26';
  await syncCertificatesFromPerformances(institutionId, year);

  const where: {
    institutionId: string;
    academicYear: string;
    className?: string;
    sectionName?: string;
    category?: ExamCertificateCategory;
    status?: ExamCertificateStatus;
  } = { institutionId, academicYear: year };

  if (opts?.className) where.className = opts.className;
  if (opts?.sectionName) where.sectionName = opts.sectionName;
  if (opts?.category && opts.category !== 'all') where.category = parseCategory(opts.category);
  if (opts?.status && opts.status !== 'all') where.status = opts.status as ExamCertificateStatus;

  const certificates = await prisma.examCoScholasticCertificate.findMany({
    where,
    orderBy: [{ className: 'asc' }, { sectionName: 'asc' }, { studentName: 'asc' }],
  });

  return {
    academicYear: year,
    certificates: certificates.map(serializeCertificate),
    summary: {
      total: certificates.length,
      recorded: certificates.filter((c) => c.status === ExamCertificateStatus.RECORDED).length,
      generated: certificates.filter((c) => c.status === ExamCertificateStatus.GENERATED).length,
      issued: certificates.filter((c) => c.status === ExamCertificateStatus.ISSUED).length,
      byCategory: CERTIFICATE_TEMPLATE_DESIGNS.map((t) => ({
        category: t.id,
        label: t.label,
        count: certificates.filter((c) => c.category === t.id).length,
      })),
    },
  };
}

export async function recordCertificateFromMobile(
  institutionId: string,
  data: {
    teacherName: string;
    studentId: string;
    category: string;
    activityTitle: string;
    activityId?: string;
    subCategory?: string;
    academicYear?: string;
    term?: string;
    performanceScore?: number;
    performanceGrade?: string;
    performanceBand?: string;
    remarks?: string;
  },
) {
  const student = await prisma.student.findFirst({
    where: { institutionId, id: data.studentId, status: StudentStatus.ACTIVE },
  });
  if (!student) throw new Error('Student not found');

  const category = parseCategory(data.category);
  const academicYear = data.academicYear || student.academicYear;

  if (data.activityId) {
    const existing = await prisma.examCoScholasticCertificate.findFirst({
      where: { institutionId, studentId: student.id, activityId: data.activityId, category },
    });
    if (existing) throw new Error('Certificate already recorded for this activity');
  }

  const recordId = await nextCertificateRecordId(institutionId);
  const cert = await prisma.examCoScholasticCertificate.create({
    data: {
      institutionId,
      recordId,
      academicYear,
      term: data.term || 'Annual',
      studentId: student.id,
      studentName: [student.firstName, student.lastName].filter(Boolean).join(' '),
      admissionNumber: student.admissionNumber,
      className: student.className,
      sectionName: student.sectionName,
      category,
      subCategory: data.subCategory || '',
      activityTitle: data.activityTitle,
      activityId: data.activityId || null,
      performanceScore: data.performanceScore ?? 0,
      performanceGrade: data.performanceGrade || '',
      performanceBand: data.performanceBand || '',
      status: ExamCertificateStatus.RECORDED,
      recordedBy: data.teacherName,
      remarks: data.remarks?.trim() || '',
    },
  });

  await prisma.examResultAuditLog.create({
    data: {
      institutionId,
      entityType: 'CERTIFICATE',
      entityId: cert.id,
      action: 'RECORDED_MOBILE',
      actor: data.teacherName,
      details: `${data.activityTitle} — ${student.firstName} ${student.lastName}`,
    },
  });

  return { certificate: serializeCertificate(cert), message: 'Certificate recorded via teacher mobile app' };
}

export async function getMobileCertificatesForTeacher(
  institutionId: string,
  teacherName: string,
  academicYear?: string,
) {
  const year = academicYear || '2025-26';
  const certificates = await prisma.examCoScholasticCertificate.findMany({
    where: {
      institutionId,
      academicYear: year,
      recordedBy: { contains: teacherName, mode: 'insensitive' },
    },
    orderBy: [{ recordedAt: 'desc' }],
    take: 50,
  });

  const activities = await prisma.academicCoScholasticActivity.findMany({
    where: {
      institutionId,
      academicYear: year,
      teacherName: { contains: teacherName, mode: 'insensitive' },
      status: 'COMPLETED',
    },
    orderBy: { activityDate: 'desc' },
    take: 20,
  });

  return {
    recordedCertificates: certificates.map(serializeCertificate),
    availableActivities: activities.map((a) => ({
      id: a.id,
      title: a.title,
      category: a.category,
      categoryLabel: CERTIFICATE_CATEGORY_LABELS[parseCategory(a.category)],
      className: a.className,
      sectionName: a.sectionName,
      activityDate: a.activityDate.toISOString(),
    })),
    categories: CERTIFICATE_TEMPLATE_DESIGNS,
  };
}

export async function generateCertificates(
  institutionId: string,
  certificateIds: string[],
  actor: string,
) {
  if (!certificateIds.length) throw new Error('Select certificates to generate');

  const now = new Date();
  const updated = await prisma.examCoScholasticCertificate.updateMany({
    where: {
      institutionId,
      id: { in: certificateIds },
      status: ExamCertificateStatus.RECORDED,
    },
    data: { status: ExamCertificateStatus.GENERATED, generatedAt: now },
  });

  await prisma.examResultAuditLog.create({
    data: {
      institutionId,
      entityType: 'CERTIFICATE',
      entityId: 'batch',
      action: 'GENERATED',
      actor,
      details: `Generated ${updated.count} certificate(s)`,
    },
  });

  return { generated: updated.count, message: `${updated.count} certificate(s) generated` };
}

export async function generateAllCertificates(
  institutionId: string,
  academicYear: string,
  opts?: { className?: string; sectionName?: string; category?: string },
  actor = 'Admin',
) {
  const list = await listCertificates(institutionId, { academicYear, ...opts, status: 'RECORDED' });
  const ids = list.certificates.map((c) => c.id);
  if (!ids.length) return { generated: 0, message: 'No recorded certificates to generate' };
  return generateCertificates(institutionId, ids, actor);
}

export async function issueCertificates(
  institutionId: string,
  certificateIds: string[],
  actor: string,
) {
  if (!certificateIds.length) throw new Error('Select certificates to issue');

  const now = new Date();
  const updated = await prisma.examCoScholasticCertificate.updateMany({
    where: {
      institutionId,
      id: { in: certificateIds },
      status: ExamCertificateStatus.GENERATED,
    },
    data: { status: ExamCertificateStatus.ISSUED, issuedAt: now },
  });

  await prisma.examResultAuditLog.create({
    data: {
      institutionId,
      entityType: 'CERTIFICATE',
      entityId: 'batch',
      action: 'ISSUED',
      actor,
      details: `Issued ${updated.count} certificate(s)`,
    },
  });

  return { issued: updated.count, message: `${updated.count} certificate(s) issued to students` };
}

export async function getCertificatePreview(institutionId: string, certificateId: string) {
  const cert = await prisma.examCoScholasticCertificate.findFirst({
    where: { institutionId, id: certificateId },
  });
  if (!cert) throw new Error('Certificate not found');

  const config = await getOrCreateConfig(institutionId, cert.academicYear);

  return {
    certificate: serializeCertificate(cert),
    config: {
      schoolName: config.schoolName,
      schoolAddress: config.schoolAddress,
      principalName: config.principalName,
      principalSignatureData: config.principalSignatureData,
      schoolSealData: config.schoolSealData,
      headerLogoData: config.headerLogoData,
      footerNote: config.footerNote,
    },
  };
}

export async function getMobileCertificateByToken(institutionId: string, token: string) {
  const cert = await prisma.examCoScholasticCertificate.findFirst({
    where: { institutionId, certificateToken: token },
  });
  if (!cert) throw new Error('Certificate not found');
  if (cert.status === ExamCertificateStatus.RECORDED) {
    throw new Error('Certificate not yet generated');
  }

  const preview = await getCertificatePreview(institutionId, cert.id);
  return preview;
}

export async function seedCertificatesDemo(institutionId: string, academicYear = '2025-26') {
  await getOrCreateConfig(institutionId, academicYear);
  await syncCertificatesFromPerformances(institutionId, academicYear);

  const existing = await prisma.examCoScholasticCertificate.count({
    where: { institutionId, academicYear },
  });
  if (existing) return { seeded: true, count: existing, message: `${existing} certificates already exist` };

  const students = await prisma.student.findMany({
    where: { institutionId, academicYear, status: StudentStatus.ACTIVE },
    take: 12,
    orderBy: [{ className: 'asc' }, { admissionNumber: 'asc' }],
  });

  if (!students.length) return { seeded: false, reason: 'No active students found' };

  const categories = Object.values(ExamCertificateCategory);
  let created = 0;

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const category = categories[i % categories.length];
    const design = CERTIFICATE_TEMPLATE_DESIGNS.find((d) => d.id === category)!;
    const subCat = CO_SCHOLASTIC_CATEGORIES.find((c) => c.id === category);
    const activity = subCat?.subCategories[0]?.activities[0] || 'Achievement';

    const recordId = await nextCertificateRecordId(institutionId);
    await prisma.examCoScholasticCertificate.create({
      data: {
        institutionId,
        recordId,
        academicYear,
        studentId: student.id,
        studentName: [student.firstName, student.lastName].filter(Boolean).join(' '),
        admissionNumber: student.admissionNumber,
        className: student.className,
        sectionName: student.sectionName,
        category,
        subCategory: subCat?.subCategories[0]?.label || '',
        activityTitle: activity,
        performanceScore: 75 + (i % 20),
        performanceGrade: 'A',
        performanceBand: 'GOOD',
        status: ExamCertificateStatus.RECORDED,
        recordedBy: 'Demo Teacher',
        remarks: `Outstanding performance in ${design.label}`,
      },
    });
    created += 1;
  }

  return { seeded: true, count: created, message: `Demo: ${created} certificates created` };
}
