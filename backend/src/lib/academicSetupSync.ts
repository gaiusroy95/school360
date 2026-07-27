import { prisma } from './prisma.js';
import { loadInstitutionFramework } from './curriculumHub.js';
import { nextAcademicRecordId } from './academicManagement.js';

type SetupSections = Record<string, Record<string, unknown>>;

function readSetupSections(tile: unknown): SetupSections {
  if (!tile || typeof tile !== 'object') return {};
  const t = tile as { sections?: SetupSections };
  return t.sections || {};
}

function readField(sections: SetupSections, sectionKeys: string | string[], key: string, fallback = '') {
  const keys = Array.isArray(sectionKeys) ? sectionKeys : [sectionKeys];
  for (const sectionKey of keys) {
    const val = sections[sectionKey]?.[key];
    if (val != null && String(val) !== '') return String(val);
  }
  return fallback;
}

export function readSubjectsSetupPolicy(setup: { subjectsSetup?: unknown } | null) {
  const sections = readSetupSections(setup?.subjectsSetup);
  const allowedRaw = readField(sections, ['Subject Type', 'subjectType'], 'allowedTypes', 'Core, Mandatory, Elective, Practical, Extra-Curricular');
  return {
    codeRequired: readField(sections, ['Subject Code', 'subjectCode'], 'codeRequired', 'Yes') === 'Yes',
    codePrefix: readField(sections, ['Subject Code', 'subjectCode'], 'codePrefix'),
    allowedTypes: allowedRaw.split(',').map((s) => s.trim()).filter(Boolean),
    maxElectivesPerStudent: Number(readField(sections, ['Elective Subjects', 'electiveSubjects'], 'maxElectivesPerStudent', '2')) || 2,
    allowDuplicateNames: readField(sections, ['Subject Master', 'subjectMaster'], 'allowDuplicateNames', 'No') === 'Yes',
  };
}

export function readClassSectionPolicy(setup: { classesSections?: unknown } | null) {
  const sections = readSetupSections(setup?.classesSections);
  return {
    requireClassTeacher: readField(sections, ['Class Teacher Assign', 'classTeacherAssign'], 'requireClassTeacher', 'Yes') === 'Yes',
    requireRoomMapping: readField(sections, ['Section Room Mapping', 'sectionRoomMapping'], 'requireRoomMapping', 'No') === 'Yes',
    defaultCapacity: Number(readField(sections, ['Section Capacity', 'sectionCapacity'], 'defaultCapacity', '40')) || 40,
  };
}

export async function getDefaultAcademicYear(institutionId: string) {
  const setup = await prisma.institutionSetup.findUnique({ where: { institutionId } });
  const session = readSetupSections(setup?.sessionTermSetup);
  return readField(session, ['Academic Session', 'academicSession'], 'sessionName', '2025-26') || '2025-26';
}

export async function refreshCurriculumFromSetup(institutionId: string, academicYear?: string) {
  const year = academicYear || (await getDefaultAcademicYear(institutionId));
  const framework = await loadInstitutionFramework(institutionId);

  const complianceNotes = [
    framework.defaultMedium ? `Medium: ${framework.defaultMedium}` : '',
    framework.supportedMediums ? `Supported mediums: ${framework.supportedMediums}` : '',
    framework.levels ? `Structure: ${framework.levels}` : '',
    framework.streams ? `Streams: ${framework.streams}` : '',
    framework.groups ? `Groups: ${framework.groups}` : '',
    framework.classFrom && framework.classTo ? `Classes ${framework.classFrom}–${framework.classTo}` : '',
  ].filter(Boolean).join(' | ');

  const data = {
    boardName: framework.boardName,
    boardCode: framework.boardCode,
    standardAlignment: framework.standardAlignment,
    termSystem: framework.termSystem,
    terms: framework.terms,
    gradingSystem: framework.gradingSystem,
    maxMarks: framework.maxMarks,
    passMarks: framework.passMarks,
    weightageEnabled: framework.weightageEnabled,
    complianceNotes,
  };

  const existing = await prisma.academicCurriculum.findFirst({
    where: { institutionId, academicYear: year },
  });

  if (existing) {
    await prisma.academicCurriculum.update({ where: { id: existing.id }, data });
    return { created: 0, updated: 1, academicYear: year, framework };
  }

  await prisma.academicCurriculum.create({
    data: {
      institutionId,
      recordId: `CUR-${Date.now().toString().slice(-6)}`,
      academicYear: year,
      ...data,
    },
  });
  return { created: 1, updated: 0, academicYear: year, framework };
}

export async function syncSubjectsFromInstitutionSetup(institutionId: string) {
  const setup = await prisma.institutionSetup.findUnique({ where: { institutionId } });
  const tile = (setup?.subjectsSetup || {}) as { records?: Record<string, string>[] };
  const records = tile.records || [];
  const policy = readSubjectsSetupPolicy(setup);
  let created = 0;
  let updated = 0;
  const errors: string[] = [];
  const seenCodes = new Set<string>();

  for (const r of records) {
    const subjectName = r.subjectName?.trim();
    if (!subjectName) continue;

    let subjectCode = (r.subjectCode || '').trim();
    if (!subjectCode && policy.codePrefix) {
      subjectCode = `${policy.codePrefix}${subjectName.replace(/\s+/g, '').slice(0, 6).toUpperCase()}`;
    }

    if (policy.codeRequired && !subjectCode) {
      errors.push(`${subjectName}: subject code is required`);
      continue;
    }

    if (subjectCode) {
      const codeKey = subjectCode.toLowerCase();
      if (seenCodes.has(codeKey)) {
        errors.push(`${subjectName}: duplicate code "${subjectCode}" in setup list`);
        continue;
      }
      seenCodes.add(codeKey);

      const codeConflict = await prisma.academicSubject.findFirst({
        where: { institutionId, subjectCode, NOT: { subjectName } },
      });
      if (codeConflict) {
        errors.push(`${subjectName}: code "${subjectCode}" already used by ${codeConflict.subjectName}`);
        continue;
      }
    }

    const subjectType = r.subjectType?.trim() || 'Core';
    if (
      policy.allowedTypes.length > 0
      && !policy.allowedTypes.some((t) => t.toLowerCase() === subjectType.toLowerCase())
    ) {
      errors.push(`${subjectName}: type "${subjectType}" not in allowed types (${policy.allowedTypes.join(', ')})`);
      continue;
    }

    const isElective = (r.isElective || '').toLowerCase() === 'yes' || subjectType.toLowerCase() === 'elective';
    const subjectGroup = r.subjectGroup?.trim() || 'General';

    const existingByCode = subjectCode
      ? await prisma.academicSubject.findFirst({ where: { institutionId, subjectCode } })
      : null;
    const existingByName = !existingByCode && !policy.allowDuplicateNames
      ? await prisma.academicSubject.findFirst({ where: { institutionId, subjectName } })
      : null;
    const existing = existingByCode || existingByName;

    if (existing) {
      await prisma.academicSubject.update({
        where: { id: existing.id },
        data: { subjectName, subjectCode, subjectType, subjectGroup, isElective, isActive: true },
      });
      updated += 1;
    } else {
      await prisma.academicSubject.create({
        data: {
          institutionId,
          recordId: await nextAcademicRecordId(institutionId, 'subject'),
          subjectName,
          subjectCode,
          subjectType,
          subjectGroup,
          isElective,
        },
      });
      created += 1;
    }
  }

  return { created, updated, skipped: errors.length, errors, policy };
}

export async function syncClassSectionsFromInstitutionSetup(institutionId: string, academicYear: string) {
  const setup = await prisma.institutionSetup.findUnique({ where: { institutionId } });
  const tile = (setup?.classesSections || {}) as { records?: Record<string, string>[] };
  const records = tile.records || [];
  const policy = readClassSectionPolicy(setup);
  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const r of records) {
    const className = r.className?.trim();
    const sectionName = r.sectionName?.trim();
    if (!className || !sectionName) continue;

    const classTeacher = r.classTeacher?.trim() || '';
    const room = r.room?.trim() || '';
    const capacity = Number(r.capacity) || policy.defaultCapacity;

    if (policy.requireClassTeacher && !classTeacher) {
      errors.push(`${className}-${sectionName}: class teacher is required`);
      continue;
    }
    if (policy.requireRoomMapping && !room) {
      errors.push(`${className}-${sectionName}: room mapping is required`);
      continue;
    }

    const exists = await prisma.academicClassSection.findFirst({
      where: { institutionId, academicYear, className, sectionName },
    });

    const payload = {
      capacity,
      room,
      classTeacher,
      classTeacherPhone: r.classTeacherPhone || '',
      classTeacherEmail: r.classTeacherEmail || '',
      isActive: true,
    };

    if (exists) {
      await prisma.academicClassSection.update({ where: { id: exists.id }, data: payload });
      updated += 1;
    } else {
      await prisma.academicClassSection.create({
        data: {
          institutionId,
          recordId: await nextAcademicRecordId(institutionId, 'classSection'),
          academicYear,
          className,
          sectionName,
          ...payload,
        },
      });
      created += 1;
    }
  }

  return { created, updated, skipped: errors.length, errors, policy };
}

export async function validateSubjectPayload(
  institutionId: string,
  data: { subjectName: string; subjectCode?: string; subjectType?: string; isElective?: boolean },
) {
  const setup = await prisma.institutionSetup.findUnique({ where: { institutionId } });
  const policy = readSubjectsSetupPolicy(setup);
  const errors: string[] = [];

  if (!data.subjectName?.trim()) errors.push('Subject name is required');
  if (policy.codeRequired && !data.subjectCode?.trim()) errors.push('Subject code is required by institution policy');
  if (data.subjectCode) {
    const dup = await prisma.academicSubject.findFirst({
      where: { institutionId, subjectCode: data.subjectCode.trim() },
    });
    if (dup) {
      errors.push(`Subject code "${data.subjectCode}" is already assigned to ${dup.subjectName}`);
    }
  }
  const subjectType = data.subjectType || 'Core';
  if (
    policy.allowedTypes.length > 0
    && !policy.allowedTypes.some((t) => t.toLowerCase() === subjectType.toLowerCase())
  ) {
    errors.push(`Subject type must be one of: ${policy.allowedTypes.join(', ')}`);
  }

  return { valid: errors.length === 0, errors, policy };
}

export async function validateClassSectionPayload(
  institutionId: string,
  data: { classTeacher?: string; room?: string },
) {
  const setup = await prisma.institutionSetup.findUnique({ where: { institutionId } });
  const policy = readClassSectionPolicy(setup);
  const errors: string[] = [];

  if (policy.requireClassTeacher && !data.classTeacher?.trim()) {
    errors.push('Class teacher is required by institution policy');
  }
  if (policy.requireRoomMapping && !data.room?.trim()) {
    errors.push('Room mapping is required by institution policy');
  }

  return { valid: errors.length === 0, errors, policy };
}

const MAX_TEACHER_ALLOCATIONS_PER_YEAR = 12;

export async function validateTeacherWorkload(
  institutionId: string,
  academicYear: string,
  teacherName: string,
  excludeAllocationId?: string,
) {
  const name = teacherName.trim();
  if (!name) return { valid: true, currentCount: 0, maxAllowed: MAX_TEACHER_ALLOCATIONS_PER_YEAR };

  const allocations = await prisma.academicSubjectAllocation.findMany({
    where: {
      institutionId,
      academicYear,
      teacherName: name,
      ...(excludeAllocationId ? { NOT: { id: excludeAllocationId } } : {}),
    },
  });

  const currentCount = allocations.length;
  const valid = currentCount < MAX_TEACHER_ALLOCATIONS_PER_YEAR;
  return {
    valid,
    currentCount,
    maxAllowed: MAX_TEACHER_ALLOCATIONS_PER_YEAR,
    message: valid
      ? undefined
      : `${name} already has ${currentCount} subject allocations (max ${MAX_TEACHER_ALLOCATIONS_PER_YEAR})`,
  };
}

export async function onInstitutionSetupTileSaved(institutionId: string, tileKey: string) {
  const year = await getDefaultAcademicYear(institutionId);

  if (tileKey === 'academicSetup' || tileKey === 'sessionTermSetup' || tileKey === 'gradeMarksSetup') {
    return { curriculum: await refreshCurriculumFromSetup(institutionId, year) };
  }
  if (tileKey === 'subjectsSetup') {
    return { subjects: await syncSubjectsFromInstitutionSetup(institutionId) };
  }
  if (tileKey === 'classesSections') {
    return { classSections: await syncClassSectionsFromInstitutionSetup(institutionId, year) };
  }
  return null;
}

export async function getAcademicMetaFromSetup(institutionId: string) {
  const framework = await loadInstitutionFramework(institutionId);
  const terms = framework.terms
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  return {
    terms: terms.length > 0 ? terms : ['Term 1', 'Term 2'],
    framework,
    defaultAcademicYear: await getDefaultAcademicYear(institutionId),
  };
}
