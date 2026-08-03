import { Prisma } from '@prisma/client';
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
  const allowedRaw = readField(
    sections,
    ['Subject Type', 'subjectType'],
    'allowedTypes',
    'Core, Mandatory, Elective, Practical, Extra-Curricular, Language, Co-Scholastic, Skill / Vocational, Optional',
  );
  return {
    codeRequired: readField(sections, ['Subject Code', 'subjectCode'], 'codeRequired', 'No') === 'Yes',
    codePrefix: readField(sections, ['Subject Code', 'subjectCode'], 'codePrefix', 'SUB-') || 'SUB-',
    allowedTypes: allowedRaw.split(',').map((s) => s.trim()).filter(Boolean),
    maxElectivesPerStudent: Number(readField(sections, ['Elective Subjects', 'electiveSubjects'], 'maxElectivesPerStudent', '2')) || 2,
    allowDuplicateNames: readField(sections, ['Subject Master', 'subjectMaster'], 'allowDuplicateNames', 'No') === 'Yes',
  };
}

function readRecordField(row: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const direct = row[key];
    if (direct != null && String(direct).trim() !== '') return String(direct).trim();
  }
  const lowerMap = new Map(Object.entries(row).map(([k, v]) => [k.toLowerCase().replace(/[\s_/()-]+/g, ''), String(v ?? '').trim()]));
  for (const key of keys) {
    const hit = lowerMap.get(key.toLowerCase().replace(/[\s_/()-]+/g, ''));
    if (hit) return hit;
  }
  return '';
}

function generateUniqueSubjectCode(subjectName: string, prefix: string, used: Set<string>) {
  const slug = subjectName.replace(/[^a-zA-Z0-9]+/g, '').slice(0, 8).toUpperCase() || 'SUB';
  const base = `${prefix || 'SUB-'}${slug}`;
  let code = base;
  let n = 2;
  while (used.has(code.toLowerCase())) {
    code = `${base}${n}`;
    n += 1;
  }
  return code;
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
  const tile = (setup?.subjectsSetup || {}) as {
    sections?: SetupSections;
    records?: Record<string, string>[];
    recordColumns?: unknown;
  };
  const records = Array.isArray(tile.records) ? tile.records : [];
  const policy = readSubjectsSetupPolicy(setup);
  let created = 0;
  let updated = 0;
  const errors: string[] = [];
  const warnings: string[] = [];
  const seenCodes = new Set<string>();
  const usedCodes = new Set<string>(
    (await prisma.academicSubject.findMany({
      where: { institutionId, subjectCode: { not: '' } },
      select: { subjectCode: true },
    })).map((s) => s.subjectCode.toLowerCase()),
  );

  // Accept every distinct type already present in setup records so Sync never blocks master-list data
  const typesFromRecords = new Set(
    records
      .map((r) => readRecordField(r, ['subjectType', 'Subject Type', 'type']).trim())
      .filter(Boolean)
      .map((t) => t.toLowerCase()),
  );
  const allowedTypeSet = new Set([
    ...policy.allowedTypes.map((t) => t.toLowerCase()),
    ...typesFromRecords,
  ]);

  const normalizedRecords: Record<string, string>[] = [];

  for (const r of records) {
    const subjectName = readRecordField(r, ['subjectName', 'Subject Name', 'name', 'subject']);
    if (!subjectName) {
      warnings.push('Skipped a row with empty subject name');
      normalizedRecords.push({ ...r });
      continue;
    }

    let subjectCode = readRecordField(r, ['subjectCode', 'Subject Code', 'code']);
    let codeAutoGenerated = false;
    if (!subjectCode) {
      subjectCode = generateUniqueSubjectCode(subjectName, policy.codePrefix, usedCodes);
      codeAutoGenerated = true;
    }

    if (policy.codeRequired && !subjectCode) {
      errors.push(`${subjectName}: subject code is required`);
      normalizedRecords.push({ ...r });
      continue;
    }

    const codeKey = subjectCode.toLowerCase();
    if (seenCodes.has(codeKey)) {
      // Collision in setup list — regenerate uniquely when auto, otherwise skip
      if (codeAutoGenerated) {
        subjectCode = generateUniqueSubjectCode(subjectName, policy.codePrefix, new Set([...usedCodes, ...seenCodes]));
      } else {
        errors.push(`${subjectName}: duplicate code "${subjectCode}" in setup list`);
        normalizedRecords.push({ ...r });
        continue;
      }
    }
    seenCodes.add(subjectCode.toLowerCase());
    usedCodes.add(subjectCode.toLowerCase());

    const codeConflict = await prisma.academicSubject.findFirst({
      where: { institutionId, subjectCode, NOT: { subjectName } },
    });
    if (codeConflict) {
      if (codeAutoGenerated) {
        subjectCode = generateUniqueSubjectCode(
          subjectName,
          policy.codePrefix,
          new Set([...usedCodes, subjectCode.toLowerCase()]),
        );
        usedCodes.add(subjectCode.toLowerCase());
      } else {
        errors.push(`${subjectName}: code "${subjectCode}" already used by ${codeConflict.subjectName}`);
        normalizedRecords.push({ ...r, subjectCode });
        continue;
      }
    }

    const subjectType = readRecordField(r, ['subjectType', 'Subject Type', 'type']) || 'Core';
    if (allowedTypeSet.size > 0 && !allowedTypeSet.has(subjectType.toLowerCase())) {
      // Keep flowing — accept type and warn instead of blocking sync
      warnings.push(`${subjectName}: type "${subjectType}" was not in configured allowed types; synced anyway`);
    }

    const isElectiveRaw = readRecordField(r, ['isElective', 'Elective (Yes/No)', 'elective']);
    const isElective = isElectiveRaw.toLowerCase() === 'yes' || subjectType.toLowerCase() === 'elective';
    const subjectGroup = readRecordField(r, ['subjectGroup', 'Subject Group', 'group']) || 'General';

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

    normalizedRecords.push({
      ...r,
      subjectName,
      subjectCode,
      subjectType,
      subjectGroup,
      isElective: isElective ? 'Yes' : (isElectiveRaw || 'No'),
    });
  }

  // Persist auto-generated codes back into Institution Setup so the Subject Code column fills in
  if (setup && normalizedRecords.length > 0) {
    await prisma.institutionSetup.update({
      where: { institutionId },
      data: {
        subjectsSetup: {
          sections: tile.sections || {},
          records: normalizedRecords,
          ...(tile.recordColumns ? { recordColumns: tile.recordColumns } : {}),
        } as Prisma.InputJsonValue,
      },
    });
  }

  return {
    created,
    updated,
    skipped: errors.length,
    errors,
    warnings,
    policy,
    totalRecords: records.length,
  };
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
    // Custom types from Subjects Setup records are allowed through — do not hard-fail
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
