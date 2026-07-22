import {
  ExamMarkingSheetStatus,
  ExamReportCardStatus,
  ExamReportCardTemplate,
  ExamResultBatchStatus,
} from '@prisma/client';
import { prisma } from './prisma.js';
import { getInstitutionFilterMeta } from './students.js';

const BOARD_CLASS_NUMBERS = new Set([5, 8, 10, 12]);
const PRIMARY_CLASS_NUMBERS = new Set([1, 2, 3, 4]);
const MIDDLE_CLASS_NUMBERS = new Set([6, 7]);
const UPPER_CLASS_NUMBERS = new Set([9, 11]);
const PRE_PRIMARY_KEYWORDS = ['pre-primary', 'pre primary', 'nursery', 'lkg', 'ukg', 'kg', 'prep', 'playgroup'];

const TEMPLATE_LABELS: Record<ExamReportCardTemplate, string> = {
  PRE_PRIMARY: 'Pre-Primary',
  PRIMARY: 'Primary (Class 1–4)',
  MIDDLE: 'Middle (Class 6–7)',
  UPPER: 'Upper (Class 9 & 11)',
  BOARD: 'Board Exam (Govt. Issued)',
};

const LOCKED_STATUSES: ExamMarkingSheetStatus[] = [
  ExamMarkingSheetStatus.LOCKED,
  ExamMarkingSheetStatus.APPROVED,
];

export type MarksReadinessResult = {
  ready: boolean;
  marksEntryStatus: 'COMPLETE' | 'PENDING';
  pendingSubjects: string[];
  pendingSheets: { subjectName: string; status: string; teacherName: string }[];
  uncapturedStudents: {
    studentId: string;
    studentName: string;
    admissionNumber: string;
    subjectName: string;
    reason: string;
  }[];
  blockers: string[];
};

export function extractClassNumber(className: string): number | null {
  const match = className.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

export function isPrePrimaryClass(className: string) {
  const lower = className.toLowerCase();
  return PRE_PRIMARY_KEYWORDS.some((kw) => lower.includes(kw));
}

export function isBoardExamClass(className: string) {
  const num = extractClassNumber(className);
  return num !== null && BOARD_CLASS_NUMBERS.has(num);
}

export function resolveReportCardTemplate(className: string): ExamReportCardTemplate {
  if (isPrePrimaryClass(className)) return ExamReportCardTemplate.PRE_PRIMARY;
  const num = extractClassNumber(className);
  if (num !== null) {
    if (BOARD_CLASS_NUMBERS.has(num)) return ExamReportCardTemplate.BOARD;
    if (PRIMARY_CLASS_NUMBERS.has(num)) return ExamReportCardTemplate.PRIMARY;
    if (MIDDLE_CLASS_NUMBERS.has(num)) return ExamReportCardTemplate.MIDDLE;
    if (UPPER_CLASS_NUMBERS.has(num)) return ExamReportCardTemplate.UPPER;
  }
  return ExamReportCardTemplate.PRIMARY;
}

export async function validateClassMarksReadiness(
  institutionId: string,
  academicYear: string,
  className: string,
  sectionName: string,
  examinationName?: string,
): Promise<MarksReadinessResult> {
  const assignmentWhere: {
    institutionId: string;
    academicYear: string;
    className: string;
    sectionName: string;
    examinationName?: string;
  } = { institutionId, academicYear, className, sectionName };
  if (examinationName) assignmentWhere.examinationName = examinationName;

  const assignments = await prisma.examSubjectTeacherAssignment.findMany({
    where: assignmentWhere,
    include: { markingSheets: { include: { cells: { include: { student: true } } } } },
  });

  const pendingSheets: MarksReadinessResult['pendingSheets'] = [];
  const pendingSubjects: string[] = [];
  const uncapturedStudents: MarksReadinessResult['uncapturedStudents'] = [];
  const blockers: string[] = [];

  if (!assignments.length) {
    blockers.push('No subject teacher assignments found for this class');
    return {
      ready: false,
      marksEntryStatus: 'PENDING',
      pendingSubjects,
      pendingSheets,
      uncapturedStudents,
      blockers,
    };
  }

  for (const assignment of assignments) {
    const sheet = assignment.markingSheets[0];
    if (!sheet) {
      pendingSubjects.push(assignment.subjectName);
      pendingSheets.push({ subjectName: assignment.subjectName, status: 'NOT_CREATED', teacherName: assignment.teacherName });
      blockers.push(`${assignment.subjectName}: marking sheet not created`);
      continue;
    }

    if (!LOCKED_STATUSES.includes(sheet.status)) {
      pendingSubjects.push(assignment.subjectName);
      pendingSheets.push({
        subjectName: assignment.subjectName,
        status: sheet.status,
        teacherName: assignment.teacherName,
      });
      blockers.push(`${assignment.subjectName}: marksheet is ${sheet.status} (must be approved/locked)`);
    }

    for (const cell of sheet.cells) {
      if (cell.isAbsent) continue;
      if (cell.marksObtained === null || cell.marksObtained === undefined) {
        const studentName = [cell.student.firstName, cell.student.lastName].filter(Boolean).join(' ');
        uncapturedStudents.push({
          studentId: cell.studentId,
          studentName,
          admissionNumber: cell.student.admissionNumber,
          subjectName: assignment.subjectName,
          reason: 'Present but marks not captured',
        });
      }
    }
  }

  if (uncapturedStudents.length) {
    const unique = new Set(uncapturedStudents.map((s) => `${s.studentName} (${s.subjectName})`));
    blockers.push(`${unique.size} student-subject mark(s) not captured`);
  }

  const marksEntryStatus = pendingSubjects.length || uncapturedStudents.length ? 'PENDING' : 'COMPLETE';
  const ready = marksEntryStatus === 'COMPLETE';

  return { ready, marksEntryStatus, pendingSubjects, pendingSheets, uncapturedStudents, blockers };
}

export async function assertClassReadyForPublication(
  institutionId: string,
  academicYear: string,
  className: string,
  sectionName: string,
  examinationName: string,
) {
  const readiness = await validateClassMarksReadiness(
    institutionId, academicYear, className, sectionName, examinationName,
  );
  if (!readiness.ready) {
    const detail = readiness.blockers.slice(0, 5).join('; ');
    throw new Error(
      `Cannot publish results for ${className} ${sectionName}: ${detail}`,
    );
  }
  return readiness;
}

function serializeClassStatus(row: {
  className: string;
  sectionName: string;
  examinationName: string;
  marksEntryStatus: 'COMPLETE' | 'PENDING';
  pendingSubjectCount: number;
  totalSubjects: number;
  reportCardStatus: string;
  templateType: ExamReportCardTemplate;
  isBoardExam: boolean;
  totalStudents: number;
  generatedCount: number;
  publishedCount: number;
  sharedCount: number;
  pendingCount: number;
  batchId: string | null;
  batchStatus: string | null;
  canPublish: boolean;
  canGenerate: boolean;
  blockers: string[];
}) {
  return {
    ...row,
    classGroup: row.sectionName ? `${row.className} — ${row.sectionName}` : row.className,
    templateLabel: TEMPLATE_LABELS[row.templateType],
  };
}

export async function getReportCardsMeta(institutionId: string) {
  const filters = await getInstitutionFilterMeta(institutionId);
  const config = await prisma.examReportCardConfig.findFirst({
    where: { institutionId, academicYear: filters.defaultAcademicYear },
  });

  return {
    defaultAcademicYear: filters.defaultAcademicYear,
    academicYears: filters.academicYears,
    classes: filters.classes,
    sectionsByClass: filters.sectionsByClass,
    templates: Object.entries(TEMPLATE_LABELS).map(([id, label]) => ({ id, label })),
    boardClasses: ['Class 5', 'Class 8', 'Class 10', 'Class 12'],
    config: config ? serializeConfig(config) : null,
  };
}

function serializeConfig(c: {
  id: string;
  academicYear: string;
  schoolName: string;
  schoolAddress: string;
  principalName: string;
  principalSignatureData: string;
  schoolSealData: string;
  classTeacherSignatureData: string;
  headerLogoData: string;
  footerNote: string;
  boardExamNotice: string;
  updatedAt: Date;
}) {
  return {
    id: c.id,
    academicYear: c.academicYear,
    schoolName: c.schoolName,
    schoolAddress: c.schoolAddress,
    principalName: c.principalName,
    hasPrincipalSignature: Boolean(c.principalSignatureData),
    hasSchoolSeal: Boolean(c.schoolSealData),
    hasClassTeacherSignature: Boolean(c.classTeacherSignatureData),
    hasHeaderLogo: Boolean(c.headerLogoData),
    footerNote: c.footerNote,
    boardExamNotice: c.boardExamNotice,
    updatedAt: c.updatedAt.toISOString(),
  };
}

export async function getClassReportCardStatuses(institutionId: string, academicYear?: string) {
  const year = academicYear || '2025-26';
  const filters = await getInstitutionFilterMeta(institutionId);

  const classSections: { className: string; sectionName: string }[] = [];
  for (const cls of filters.classes) {
    const sections = filters.sectionsByClass[cls] || ['A'];
    for (const sec of sections) {
      classSections.push({ className: cls, sectionName: sec });
    }
  }

  const batches = await prisma.examResultBatch.findMany({
    where: { institutionId, academicYear: year },
    include: { studentResults: true },
  });
  const batchMap = new Map(batches.map((b) => [`${b.className}:${b.sectionName}`, b]));

  const statuses = [];
  for (const { className, sectionName } of classSections) {
    const templateType = resolveReportCardTemplate(className);
    const isBoardExam = templateType === ExamReportCardTemplate.BOARD;
    const batch = batchMap.get(`${className}:${sectionName}`);
    const examinationName = batch?.examinationName || 'Annual Examination';

    const readiness = await validateClassMarksReadiness(
      institutionId, year, className, sectionName, examinationName,
    );

    const assignments = await prisma.examSubjectTeacherAssignment.count({
      where: { institutionId, academicYear: year, className, sectionName },
    });

    const results = batch?.studentResults || [];
    const generatedCount = results.filter((r) =>
      r.reportCardStatus !== ExamReportCardStatus.PENDING,
    ).length;
    const publishedCount = results.filter((r) =>
      r.reportCardStatus === ExamReportCardStatus.PUBLISHED || r.reportCardStatus === ExamReportCardStatus.SHARED,
    ).length;
    const sharedCount = results.filter((r) => r.reportCardStatus === ExamReportCardStatus.SHARED).length;
    const pendingCount = results.filter((r) => r.reportCardStatus === ExamReportCardStatus.PENDING).length;

    let reportCardStatus = 'PENDING';
    if (batch?.status === ExamResultBatchStatus.PUBLISHED) {
      reportCardStatus = sharedCount > 0 ? 'SHARED' : 'PUBLISHED';
    } else if (generatedCount > 0) {
      reportCardStatus = 'GENERATED';
    } else if (readiness.marksEntryStatus === 'PENDING') {
      reportCardStatus = 'MARKS_PENDING';
    }

    const canGenerate = readiness.ready && Boolean(batch) && batch!.status !== ExamResultBatchStatus.PUBLISHED;
    const canPublish = readiness.ready
      && Boolean(batch)
      && (batch!.status === ExamResultBatchStatus.COMPILED || batch!.status === ExamResultBatchStatus.SCHEDULED)
      && generatedCount > 0;

    statuses.push(serializeClassStatus({
      className,
      sectionName,
      examinationName,
      marksEntryStatus: readiness.marksEntryStatus,
      pendingSubjectCount: readiness.pendingSubjects.length,
      totalSubjects: assignments,
      reportCardStatus,
      templateType,
      isBoardExam,
      totalStudents: batch?.totalStudents || 0,
      generatedCount,
      publishedCount,
      sharedCount,
      pendingCount,
      batchId: batch?.id ?? null,
      batchStatus: batch?.status ?? null,
      canPublish: canPublish && !isBoardExam,
      canGenerate: canGenerate && !isBoardExam,
      blockers: readiness.blockers,
    }));
  }

  const summary = {
    totalClasses: statuses.length,
    marksPending: statuses.filter((s) => s.marksEntryStatus === 'PENDING').length,
    generated: statuses.filter((s) => s.reportCardStatus === 'GENERATED').length,
    published: statuses.filter((s) => ['PUBLISHED', 'SHARED'].includes(s.reportCardStatus)).length,
    boardExam: statuses.filter((s) => s.isBoardExam).length,
    pending: statuses.filter((s) => s.reportCardStatus === 'PENDING' || s.reportCardStatus === 'MARKS_PENDING').length,
  };

  return { academicYear: year, classes: statuses, summary };
}

export async function getReportCardConfig(institutionId: string, academicYear?: string) {
  const year = academicYear || '2025-26';
  let config = await prisma.examReportCardConfig.findFirst({
    where: { institutionId, academicYear: year },
  });
  if (!config) {
    const institution = await prisma.institution.findUnique({ where: { id: institutionId } });
    config = await prisma.examReportCardConfig.create({
      data: {
        institutionId,
        academicYear: year,
        schoolName: institution?.name || '',
      },
    });
  }
  return { config: serializeConfig(config) };
}

export async function updateReportCardConfig(
  institutionId: string,
  academicYear: string,
  data: {
    schoolName?: string;
    schoolAddress?: string;
    principalName?: string;
    footerNote?: string;
    boardExamNotice?: string;
  },
) {
  const config = await prisma.examReportCardConfig.upsert({
    where: { institutionId_academicYear: { institutionId, academicYear } },
    create: { institutionId, academicYear, ...data },
    update: data,
  });
  return { config: serializeConfig(config), message: 'Report card configuration saved' };
}

export async function uploadReportCardAsset(
  institutionId: string,
  academicYear: string,
  assetType: 'principalSignature' | 'schoolSeal' | 'classTeacherSignature' | 'headerLogo',
  fileData: string,
  actor: string,
) {
  const fieldMap = {
    principalSignature: 'principalSignatureData',
    schoolSeal: 'schoolSealData',
    classTeacherSignature: 'classTeacherSignatureData',
    headerLogo: 'headerLogoData',
  } as const;
  const field = fieldMap[assetType];
  const raw = fileData.includes(',') ? fileData.split(',')[1] : fileData;
  if (!raw || raw.length < 20) throw new Error('Invalid file data');

  const config = await prisma.examReportCardConfig.upsert({
    where: { institutionId_academicYear: { institutionId, academicYear } },
    create: { institutionId, academicYear, [field]: raw },
    update: { [field]: raw },
  });

  await prisma.examResultAuditLog.create({
    data: {
      institutionId,
      entityType: 'REPORT_CARD_CONFIG',
      entityId: config.id,
      action: 'ASSET_UPLOADED',
      actor,
      details: `Uploaded ${assetType}`,
    },
  });

  return { config: serializeConfig(config), message: `${assetType} uploaded successfully` };
}

export async function getReportCardAsset(
  institutionId: string,
  academicYear: string,
  assetType: 'principalSignature' | 'schoolSeal' | 'classTeacherSignature' | 'headerLogo',
) {
  const config = await prisma.examReportCardConfig.findFirst({
    where: { institutionId, academicYear },
  });
  if (!config) return { data: null };

  const fieldMap = {
    principalSignature: config.principalSignatureData,
    schoolSeal: config.schoolSealData,
    classTeacherSignature: config.classTeacherSignatureData,
    headerLogo: config.headerLogoData,
  };
  return { data: fieldMap[assetType] || null };
}

export async function generateReportCards(
  institutionId: string,
  batchId: string,
  actor: string,
) {
  const batch = await prisma.examResultBatch.findFirst({
    where: { institutionId, id: batchId },
    include: { studentResults: true },
  });
  if (!batch) throw new Error('Result batch not found');

  const readiness = await assertClassReadyForPublication(
    institutionId, batch.academicYear, batch.className, batch.sectionName, batch.examinationName,
  );

  if (isBoardExamClass(batch.className)) {
    throw new Error('Board exam classes (5, 8, 10, 12) use government-issued marksheets. Upload via Board Exam tab.');
  }

  const templateType = resolveReportCardTemplate(batch.className);
  const now = new Date();

  await prisma.examStudentResult.updateMany({
    where: { batchId: batch.id },
    data: {
      reportCardStatus: ExamReportCardStatus.GENERATED,
      templateType,
      generatedAt: now,
    },
  });

  await prisma.examResultAuditLog.create({
    data: {
      institutionId,
      entityType: 'RESULT_BATCH',
      entityId: batch.id,
      action: 'REPORT_CARDS_GENERATED',
      actor,
      details: `Generated ${batch.studentResults.length} report cards (${TEMPLATE_LABELS[templateType]})`,
      batchId: batch.id,
    },
  });

  await prisma.examDashboardStats.updateMany({
    where: { institutionId, academicYear: batch.academicYear },
    data: { reportCardsGenerated: { increment: batch.studentResults.length } },
  });

  return {
    generated: batch.studentResults.length,
    templateType,
    templateLabel: TEMPLATE_LABELS[templateType],
    message: `${batch.studentResults.length} report cards generated (${TEMPLATE_LABELS[templateType]})`,
    readiness,
  };
}

export async function generateAllReportCards(institutionId: string, academicYear: string, actor: string) {
  const batches = await prisma.examResultBatch.findMany({
    where: {
      institutionId,
      academicYear,
      status: { in: [ExamResultBatchStatus.COMPILED, ExamResultBatchStatus.SCHEDULED] },
    },
  });

  const results = [];
  for (const batch of batches) {
    if (isBoardExamClass(batch.className)) continue;
    try {
      results.push(await generateReportCards(institutionId, batch.id, actor));
    } catch {
      // skip classes not ready
    }
  }

  return {
    generated: results.reduce((s, r) => s + r.generated, 0),
    classes: results.length,
    message: `Generated report cards for ${results.length} class(es)`,
    results,
  };
}

export async function getReportCardPreviewData(institutionId: string, resultId: string) {
  const result = await prisma.examStudentResult.findFirst({
    where: { institutionId, id: resultId },
    include: { batch: true, student: true },
  });
  if (!result) throw new Error('Student result not found');

  const config = await prisma.examReportCardConfig.findFirst({
    where: { institutionId, academicYear: result.batch.academicYear },
  });

  return {
    result: {
      id: result.id,
      studentName: result.studentName,
      admissionNumber: result.admissionNumber,
      className: result.batch.className,
      sectionName: result.batch.sectionName,
      examinationName: result.batch.examinationName,
      academicYear: result.batch.academicYear,
      totalObtained: result.totalObtained,
      totalMax: result.totalMax,
      percentage: result.percentage,
      grade: result.grade,
      gpa: result.gpa,
      rank: result.rank,
      remarks: result.remarks,
      overallPerformance: result.overallPerformance,
      subjectScores: result.subjectScores,
      templateType: result.templateType,
      reportCardStatus: result.reportCardStatus,
      reportCardToken: result.reportCardToken,
    },
    config: config ? {
      schoolName: config.schoolName,
      schoolAddress: config.schoolAddress,
      principalName: config.principalName,
      principalSignatureData: config.principalSignatureData,
      schoolSealData: config.schoolSealData,
      classTeacherSignatureData: config.classTeacherSignatureData,
      headerLogoData: config.headerLogoData,
      footerNote: config.footerNote,
      boardExamNotice: config.boardExamNotice,
    } : null,
    student: {
      dateOfBirth: result.student.dateOfBirth?.toISOString().slice(0, 10) ?? '',
      fatherName: result.student.fatherName,
      motherName: result.student.motherName,
    },
  };
}

export async function listBoardMarksheetUploads(
  institutionId: string,
  academicYear: string,
  className?: string,
  sectionName?: string,
) {
  const uploads = await prisma.examBoardMarksheetUpload.findMany({
    where: {
      institutionId,
      academicYear,
      ...(className ? { className } : {}),
      ...(sectionName ? { sectionName } : {}),
    },
    include: { student: { select: { firstName: true, lastName: true, admissionNumber: true } } },
    orderBy: [{ className: 'asc' }, { uploadedAt: 'desc' }],
  });

  return {
    uploads: uploads.map((u) => ({
      id: u.id,
      studentId: u.studentId,
      studentName: [u.student.firstName, u.student.lastName].filter(Boolean).join(' '),
      admissionNumber: u.student.admissionNumber,
      className: u.className,
      sectionName: u.sectionName,
      examinationName: u.examinationName,
      fileName: u.fileName,
      mimeType: u.mimeType,
      uploadedBy: u.uploadedBy,
      uploadedAt: u.uploadedAt.toISOString(),
    })),
  };
}

export async function uploadBoardMarksheet(
  institutionId: string,
  data: {
    studentId: string;
    academicYear: string;
    examinationName: string;
    className: string;
    sectionName: string;
    fileName: string;
    mimeType: string;
    fileData: string;
  },
  actor: string,
) {
  if (!isBoardExamClass(data.className)) {
    throw new Error('Board marksheet upload is only for Class 5, 8, 10, and 12');
  }

  const raw = data.fileData.includes(',') ? data.fileData.split(',')[1] : data.fileData;
  if (!raw || raw.length < 50) throw new Error('Invalid file data');

  const upload = await prisma.examBoardMarksheetUpload.upsert({
    where: {
      institutionId_studentId_academicYear_examinationName: {
        institutionId,
        studentId: data.studentId,
        academicYear: data.academicYear,
        examinationName: data.examinationName,
      },
    },
    create: {
      institutionId,
      studentId: data.studentId,
      academicYear: data.academicYear,
      examinationName: data.examinationName,
      className: data.className,
      sectionName: data.sectionName,
      fileName: data.fileName,
      mimeType: data.mimeType,
      fileData: raw,
      uploadedBy: actor,
    },
    update: {
      fileName: data.fileName,
      mimeType: data.mimeType,
      fileData: raw,
      uploadedBy: actor,
      uploadedAt: new Date(),
    },
  });

  await prisma.examResultAuditLog.create({
    data: {
      institutionId,
      entityType: 'BOARD_MARKSHEET',
      entityId: upload.id,
      action: 'UPLOADED',
      actor,
      details: `Board marksheet uploaded for ${data.className} student`,
    },
  });

  return { upload: { id: upload.id, fileName: upload.fileName }, message: 'Board marksheet uploaded' };
}

export async function getBoardMarksheetFile(institutionId: string, uploadId: string) {
  const upload = await prisma.examBoardMarksheetUpload.findFirst({
    where: { institutionId, id: uploadId },
  });
  if (!upload) throw new Error('Upload not found');
  return {
    fileName: upload.fileName,
    mimeType: upload.mimeType,
    fileData: upload.fileData,
  };
}

export async function markReportCardsShared(institutionId: string, batchId: string, actor: string) {
  const batch = await prisma.examResultBatch.findFirst({
    where: { institutionId, id: batchId },
    include: { studentResults: true },
  });
  if (!batch) throw new Error('Result batch not found');
  if (batch.status !== ExamResultBatchStatus.PUBLISHED) {
    throw new Error('Publish results before sharing report cards');
  }

  const now = new Date();
  await prisma.examStudentResult.updateMany({
    where: { batchId: batch.id },
    data: { reportCardStatus: ExamReportCardStatus.SHARED, reportCardSharedAt: now },
  });

  await prisma.examDashboardStats.updateMany({
    where: { institutionId, academicYear: batch.academicYear },
    data: { reportCardsShared: { increment: batch.studentResults.length } },
  });

  await prisma.examResultAuditLog.create({
    data: {
      institutionId,
      entityType: 'RESULT_BATCH',
      entityId: batch.id,
      action: 'REPORT_CARDS_SHARED',
      actor,
      details: `Shared ${batch.studentResults.length} report cards`,
      batchId: batch.id,
    },
  });

  return { shared: batch.studentResults.length, message: 'Report cards marked as shared' };
}

export async function seedReportCardsDemo(institutionId: string, academicYear = '2025-26') {
  const institution = await prisma.institution.findUnique({ where: { id: institutionId } });
  await prisma.examReportCardConfig.upsert({
    where: { institutionId_academicYear: { institutionId, academicYear } },
    create: {
      institutionId,
      academicYear,
      schoolName: institution?.name || 'St. Anthony School',
      schoolAddress: 'School Campus, Main Road',
      principalName: 'Principal',
      footerNote: 'This is a computer-generated report card.',
    },
    update: {},
  });

  const batches = await prisma.examResultBatch.findMany({
    where: { institutionId, academicYear, status: ExamResultBatchStatus.COMPILED },
    take: 3,
  });

  let generated = 0;
  for (const batch of batches) {
    if (isBoardExamClass(batch.className)) continue;
    try {
      const result = await generateReportCards(institutionId, batch.id, 'System');
      generated += result.generated;
    } catch {
      // skip
    }
  }

  return { seeded: true, generated, message: generated ? `Demo: ${generated} report cards generated` : 'Config seeded' };
}
